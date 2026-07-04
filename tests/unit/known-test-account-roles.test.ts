import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/022_admin_viewer_permissions.sql", "utf8");

describe("known test account roles", () => {
  it("pins the configured smoke-test accounts to their required app roles", () => {
    expect(migration).toContain("normalized_email = 'test@gmail.com'");
    expect(migration).toContain("app_role = 'admin'");
    expect(migration).toContain("else 'viewer'");
    expect(migration).toContain("is_active = true");
  });

  it("keeps future profile creation consistent for the same known accounts", () => {
    expect(migration).toContain("create or replace function public.handle_new_user()");
    expect(migration).toContain("when normalized_email = 'test@gmail.com' then 'admin'");
    expect(migration).toContain("else 'viewer'");
  });
});
