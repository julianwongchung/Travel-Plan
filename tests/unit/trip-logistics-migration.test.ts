import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/010_trip_hotels_and_flights.sql", "utf8");

describe("trip logistics migration", () => {
  it("adds structured hotel and flight tables plus optional place timing", () => {
    expect(migration).toContain("create table if not exists public.trip_hotels");
    expect(migration).toContain("create table if not exists public.trip_flights");
    expect(migration).toContain("add column if not exists planned_date date");
    expect(migration).toContain("add column if not exists planned_time time");
  });

  it("enforces trip visibility and admin mutation permissions", () => {
    expect(migration).toContain("private.is_trip_member(trip_id)");
    expect(migration).toContain("private.can_edit_trip(trip_id)");
    expect(migration).toContain("enable row level security");
  });

  it("exposes protected creation and soft-delete RPCs", () => {
    expect(migration).toContain("create or replace function public.create_trip_hotel");
    expect(migration).toContain("create or replace function public.create_trip_flight");
    expect(migration).toContain("create or replace function public.soft_delete_trip_hotel");
    expect(migration).toContain("create or replace function public.soft_delete_trip_flight");
    expect(migration).toContain("grant execute");
  });
});
