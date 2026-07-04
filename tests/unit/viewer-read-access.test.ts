import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const protectedLayout = readFileSync("src/app/(protected)/layout.tsx", "utf8");
const tripLayout = readFileSync("src/app/(protected)/trips/[tripId]/layout.tsx", "utf8");
const tripsPage = readFileSync("src/app/(protected)/trips/page.tsx", "utf8");
const queries = readFileSync("src/lib/db/queries.ts", "utf8");
const tripShell = readFileSync("src/components/layout/trip-shell.tsx", "utf8");
const accountMigration = readFileSync("supabase/migrations/022_admin_viewer_permissions.sql", "utf8");

describe("viewer read access", () => {
  it("requires login before loading trips and trip workspaces", () => {
    expect(protectedLayout).not.toContain('redirect("/login")');
    expect(tripsPage).toContain("getCurrentProfile");
    expect(tripsPage).not.toContain("getOptionalCurrentProfile");
    expect(tripsPage).not.toContain("Open a shared trip link");
    expect(queries).toContain("getUserId()");
    expect(queries).toContain('redirect("/login")');
  });

  it("renders trip workspace pages with an account-type context", () => {
    expect(queries).toContain("appRole: profile.app_role");
    expect(queries).not.toContain("isGuest");
    expect(queries).not.toContain("memberRole");
    expect(tripLayout).toContain("appRole={context.appRole}");
    expect(tripShell).toContain('appRole === "admin" ? "Admin" : "Viewer"');
  });

  it("keeps authenticated Viewer trip reads separate from writes", () => {
    expect(accountMigration).toContain("revoke select on table");
    expect(accountMigration).toContain("from anon");
    expect(accountMigration).toContain("private.can_view_trip");
    expect(accountMigration).toContain("create policy trips_select_account_read");
    expect(accountMigration).toContain("create policy trip_days_select_account_read");
    expect(accountMigration).toContain("create policy schedule_items_select_account_read");
    expect(accountMigration).toContain("create policy trip_expenses_select_account_read");
    expect(accountMigration).toContain("create policy expense_splits_select_account_read");
    expect(accountMigration).toContain("create policy trip_hotels_select_account_read");
    expect(accountMigration).toContain("create policy trip_flights_select_account_read");
    expect(accountMigration).toContain("revoke insert, update, delete on table");
  });
});
