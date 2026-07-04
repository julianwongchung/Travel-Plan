import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canAccessAdmin, canAccessExpenses, canAccessOverview, canAccessPlaces, canAccessTripPlan, canAddExpense, canEdit, canManageTrip } from "@/lib/utils/permissions";

const types = readFileSync("src/lib/db/types.ts", "utf8");
const profiles = readFileSync("src/lib/db/profiles.ts", "utf8");
const adminPage = readFileSync("src/app/(protected)/admin/page.tsx", "utf8");
const overviewPage = readFileSync("src/app/(protected)/trips/[tripId]/overview/page.tsx", "utf8");
const expensesPage = readFileSync("src/app/(protected)/trips/[tripId]/expenses/page.tsx", "utf8");
const tripPlanPage = readFileSync("src/app/(protected)/trips/[tripId]/trip-plan/page.tsx", "utf8");
const placesPage = readFileSync("src/app/(protected)/trips/[tripId]/places/page.tsx", "utf8");
const tripsPage = readFileSync("src/app/(protected)/trips/page.tsx", "utf8");
const tripsActions = readFileSync("src/lib/actions/trips.ts", "utf8");
const placesActions = readFileSync("src/lib/actions/places.ts", "utf8");
const expensesActions = readFileSync("src/lib/actions/expenses.ts", "utf8");
const logisticsActions = readFileSync("src/lib/actions/trip-logistics.ts", "utf8");
const invitationsActions = readFileSync("src/lib/actions/invitations.ts", "utf8");
const accountMigration = readFileSync("supabase/migrations/022_admin_viewer_permissions.sql", "utf8");

describe("Admin and Viewer account RBAC", () => {
  it("models only Admin and Viewer app roles", () => {
    expect(types).toContain('export type AppRole = "admin" | "viewer"');
    expect(profiles).toContain('return value === "admin" ? "admin" : "viewer"');
    expect(adminPage).toContain("<option value=\"viewer\">Viewer</option>");
    expect(adminPage).toContain("<option value=\"admin\">Admin</option>");
    expect(adminPage).toContain("Account type");
  });

  it("allows Viewer to read trip pages and add expenses but not manage anything else", () => {
    expect(canAccessOverview("admin")).toBe(true);
    expect(canAccessExpenses("admin")).toBe(true);
    expect(canAccessTripPlan("viewer")).toBe(true);
    expect(canAccessPlaces("viewer")).toBe(true);
    expect(canAccessAdmin("viewer")).toBe(false);
    expect(canAddExpense("viewer")).toBe(true);
    expect(canEdit("viewer")).toBe(false);
    expect(canManageTrip("viewer")).toBe(false);
    expect(canEdit("admin")).toBe(true);
    expect(canManageTrip("admin")).toBe(true);
  });

  it("keeps restricted pages behind server-side guards", () => {
    expect(tripsPage).toContain("getCurrentProfile");
    expect(overviewPage).toContain("getTripContext(tripId)");
    expect(overviewPage).not.toContain("redirect(");
    expect(expensesPage).toContain("getTripContext(tripId)");
    expect(expensesPage).not.toContain("redirect(");
    expect(tripPlanPage).toContain("canAccessTripPlan(appRole)");
    expect(tripPlanPage).toContain('redirect("/trips")');
    expect(placesPage).toContain("canAccessPlaces(appRole)");
    expect(placesPage).toContain('redirect("/trips")');
    expect(adminPage).toContain("canAccessAdmin(profile.app_role)");
    expect(adminPage).toContain("AccessDenied");
  });

  it("keeps non-expense mutations admin-gated before RPC calls", () => {
    for (const actionFile of [tripsActions, placesActions, logisticsActions, invitationsActions]) {
      expect(actionFile).toContain("authedAdminClient");
      expect(actionFile).not.toContain("await authedClient()");
    }
    expect(expensesActions).toContain("await authedActiveClient()");
    expect(expensesActions).toContain("export async function createExpense");
    expect(expensesActions).toContain("export async function updateExpense");
    expect(expensesActions).toContain("export async function softDeleteExpense");
  });

  it("migrates database access to Admin and Viewer only", () => {
    expect(accountMigration).toContain("set app_role = 'viewer'");
    expect(accountMigration).toContain("profiles_app_role_check check (app_role in ('admin', 'viewer'))");
    expect(accountMigration).toContain("create or replace function private.can_view_trip");
    expect(accountMigration).toContain("create or replace function private.can_add_expense");
    expect(accountMigration).toContain("create or replace function private.can_edit_trip");
    expect(accountMigration).toContain("private.is_app_admin()");
    expect(accountMigration).toContain("revoke insert, update, delete on table");
  });
});
