import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/008_sync_trip_date_range.sql";

describe("trip date range synchronization migration", () => {
  it("creates missing inclusive days idempotently and never deletes preserved itinerary days", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toContain("generate_series");
    expect(migration).toContain("on conflict (trip_id, date) do update");
    expect(migration).toContain("private.sync_trip_days");
    expect(migration).toContain("select private.sync_trip_days");
    expect(migration).not.toMatch(/delete\s+from\s+public\.trip_days/i);
  });
});
