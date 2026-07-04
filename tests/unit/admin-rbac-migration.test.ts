import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/014_admin_rbac.sql", "utf8");
const backfillMigration = readFileSync("supabase/migrations/015_backfill_existing_auth_profiles.sql", "utf8");
const grantMigration = readFileSync("supabase/migrations/016_grant_rbac_helper_execution.sql", "utf8");
const scheduleDeletePermissionMigration = readFileSync("supabase/migrations/020_admin_schedule_item_delete_permission.sql", "utf8");
const finalRoleMigration = readFileSync("supabase/migrations/022_admin_viewer_permissions.sql", "utf8");
const adminActions = readFileSync("src/lib/actions/admin.ts", "utf8");
const adminPage = readFileSync("src/app/(protected)/admin/page.tsx", "utf8");
const supabaseEnv = readFileSync("src/lib/supabase/env.ts", "utf8");
const helpers = readFileSync("src/lib/actions/helpers.ts", "utf8");
const tripsActions = readFileSync("src/lib/actions/trips.ts", "utf8");
const placesActions = readFileSync("src/lib/actions/places.ts", "utf8");
const expensesActions = readFileSync("src/lib/actions/expenses.ts", "utf8");

function migrationSection(start: string, end: string) {
  const startIndex = finalRoleMigration.indexOf(start);
  const endIndex = finalRoleMigration.indexOf(end, startIndex + start.length);
  return finalRoleMigration.slice(startIndex, endIndex);
}

describe("admin RBAC migration and server action boundary", () => {
  it("finishes on Admin and Viewer account roles only", () => {
    expect(migration).toContain("add column if not exists app_role");
    expect(migration).toContain("add column if not exists is_active");
    expect(migration).toContain("profiles_app_role_check check (app_role in ('admin', 'viewer'))");
    expect(migration).toContain("set app_role = 'admin'");
    expect(migration).toContain("where exists");
    expect(migration).toContain("where trips.owner_id = profiles.id");
    expect(finalRoleMigration).toContain("set app_role = 'viewer'");
    expect(finalRoleMigration).toContain("profiles_app_role_check check (app_role in ('admin', 'viewer'))");
    expect(finalRoleMigration).toContain("drop function if exists private.is_app_");
  });

  it("backfills profile rows for existing auth users", () => {
    expect(backfillMigration).toContain("from auth.users");
    expect(backfillMigration).toContain("where not exists");
    expect(backfillMigration).toContain("create policy profiles_select_self");
    expect(backfillMigration).toContain("using (id = auth.uid())");
    expect(backfillMigration).toContain("set app_role = 'admin'");
  });

  it("makes database edit helpers depend on global admin access", () => {
    expect(finalRoleMigration).toContain("create or replace function private.is_app_admin()");
    expect(finalRoleMigration).toContain("create or replace function private.is_active_app_user()");
    expect(finalRoleMigration).toContain("app_role = 'admin'");
    expect(finalRoleMigration).toContain("is_active = true");
    expect(finalRoleMigration).toContain("create or replace function private.can_edit_trip");
    expect(finalRoleMigration).toContain("create or replace function private.can_add_expense");
    expect(finalRoleMigration).toContain("private.is_app_admin()");
    expect(migrationSection(
      "create or replace function private.can_edit_trip",
      "create or replace function private.can_add_expense",
    )).not.toContain("trip_status in ('planning', 'active')");
  });

  it("grants authenticated users execute access to private RLS helper functions", () => {
    expect(grantMigration).toContain("grant usage on schema private to authenticated");
    expect(grantMigration).toContain("grant execute on function private.is_app_admin() to authenticated");
    expect(grantMigration).toContain("grant execute on function private.is_active_app_user() to authenticated");
    expect(grantMigration).toContain("grant execute on function private.is_trip_member(uuid) to authenticated");
    expect(grantMigration).toContain("grant execute on function private.can_edit_trip(uuid) to authenticated");
  });

  it("keeps itinerary delete RPC aligned with global admin edit permissions", () => {
    expect(scheduleDeletePermissionMigration).toContain("create or replace function public.delete_schedule_item");
    expect(finalRoleMigration).toContain("create or replace function private.can_edit_trip");
    expect(finalRoleMigration).toContain("private.is_app_admin()");
    expect(migrationSection(
      "create or replace function private.can_edit_trip",
      "create or replace function private.can_add_expense",
    )).not.toContain("trip_status in ('planning', 'active')");
    expect(scheduleDeletePermissionMigration).toContain("not private.can_edit_trip(parent_trip_id)");
    expect(scheduleDeletePermissionMigration).toContain("grant execute on function public.delete_schedule_item(uuid) to authenticated");
  });

  it("protects profile role updates and admin user listing", () => {
    expect(finalRoleMigration).toContain("drop policy if exists profiles_update_self");
    expect(finalRoleMigration).toContain("create policy profiles_update_account_admin");
    expect(migration).toContain("create or replace function public.list_app_users()");
    expect(migration).toContain("Only admins can view users");
    expect(migration).toContain("grant execute on function public.list_app_users() to authenticated");
  });

  it("uses server-only Supabase admin APIs for user creation", () => {
    expect(adminActions).toContain("createAdminClient");
    expect(adminActions).toContain("admin.createUser");
    expect(adminActions).toContain("email_confirm: true");
    expect(adminActions).toContain("app_role: appRole");
    expect(adminActions).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
  });

  it("lets admins delete users that do not own trip records through a guarded server action", () => {
    expect(adminActions).toContain("export async function deleteAppUser");
    expect(adminActions).toContain("You cannot delete your own account.");
    expect(adminActions).toContain(".from(\"trips\")");
    expect(adminActions).toContain(".eq(\"owner_id\", userId)");
    expect(adminActions).toContain("Transfer this user's trips before deleting the user account.");
    expect(adminActions).toContain("admin.deleteUser");
    expect(adminPage).toContain("deleteAppUser");
    expect(adminPage).toContain("Delete user");
    expect(adminPage).toContain("disabled={!adminEnvConfigured || user.id === profile.id}");
  });

  it("keeps admin forms from submitting when service role env is missing", () => {
    expect(supabaseEnv).toContain("export function hasSupabaseAdminEnv");
    expect(adminPage).toContain("hasSupabaseAdminEnv");
    expect(adminPage).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(adminPage).toContain("disabled={!adminEnvConfigured}");
    expect(adminPage).toContain("action={adminEnvConfigured ? createAppUser : undefined}");
  });

  it("requires admin before mutation server actions execute RPCs", () => {
    expect(helpers).toContain("export async function authedAdminClient");
    expect(helpers).toContain("Access denied. Admin permission is required.");
    expect(tripsActions).toContain("await authedAdminClient()");
    expect(placesActions).toContain("await authedAdminClient()");
    expect(expensesActions).toContain("await authedAdminClient()");
    expect(expensesActions).toContain("await authedActiveClient()");
    expect(tripsActions).not.toContain("await authedClient()");
    expect(placesActions).not.toContain("await authedClient()");
    expect(expensesActions).not.toContain("await authedClient()");
  });
});
