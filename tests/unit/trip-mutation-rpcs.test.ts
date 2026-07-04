import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/actions/trips.ts", "utf8");
const queries = readFileSync("src/lib/db/queries.ts", "utf8");
const migration = readFileSync("supabase/migrations/013_trip_mutation_rpcs_and_validation.sql", "utf8");

describe("trip mutation RPC boundary", () => {
  it("creates trips with travelers through one transactional RPC", () => {
    const createTripRecord = actions.slice(
      actions.indexOf("async function createTripRecord"),
      actions.indexOf("export async function createTrip"),
    );

    expect(createTripRecord).toContain("await authedAdminClient()");
    expect(actions).toContain('supabase.rpc("create_trip_with_travelers"');
    expect(actions).toContain("p_traveler_names: travelerNames");
    expect(actions).not.toContain('.from("travelers").insert');
    expect(migration).toContain("create or replace function public.create_trip_with_travelers");
    expect(migration).toContain("insert into public.trips");
    expect(migration).toContain("insert into public.travelers");
  });

  it("moves traveler, trip day, and schedule item writes behind RPCs", () => {
    expect(actions).toContain('supabase.rpc("add_traveler"');
    expect(actions).toContain('supabase.rpc("ensure_trip_day"');
    expect(actions).toContain('supabase.rpc("create_schedule_item"');
    expect(actions).not.toContain('.from("trip_days")');
    expect(actions).not.toContain('.from("schedule_items")');
    expect(migration).toContain("private.can_edit_trip(p_trip_id)");
  });

  it("uses one trip-card RPC instead of per-trip Supabase queries", () => {
    expect(queries).toContain('supabase.rpc("get_trip_cards")');
    expect(queries).not.toContain("for (const trip of rows)");
    expect(migration).toContain("create or replace function public.get_trip_cards()");
  });

  it("keeps expense split writing private and unavailable to direct clients", () => {
    expect(migration).toContain("create or replace function private.write_expense_splits");
    expect(migration).toContain("perform private.write_expense_splits");
    expect(migration).toContain("drop function if exists public.write_expense_splits(uuid, uuid, jsonb)");
    expect(migration).not.toContain("create or replace function public.write_expense_splits");
  });

  it("removes legacy/dev mutation RPCs from the authenticated API surface", () => {
    expect(migration).toContain("revoke all on function public.create_trip(text, date, date, text) from authenticated");
    expect(migration).toContain("revoke all on function public.create_seed_trip() from authenticated");
  });

  it("prevents archived or trashed trips from passing the edit helper", () => {
    expect(migration).toContain("create or replace function private.can_edit_trip");
    expect(migration).toContain("trips.deleted_at is null");
    expect(migration).toContain("trips.trip_status in ('planning', 'active')");
  });

  it("guards complete trip against invalid lifecycle states", () => {
    expect(migration).toContain("create or replace function public.complete_trip");
    expect(migration).toContain("trip_status in ('planning', 'active')");
    expect(migration).toContain("Trip cannot be completed from its current state");
  });

  it("adds the positive expense constraint without scanning legacy zero rows", () => {
    expect(migration).toContain("add constraint trip_expenses_total_amount_check check (total_amount > 0) not valid");
  });
});
