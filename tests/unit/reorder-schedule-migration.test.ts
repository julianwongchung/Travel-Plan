import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/009_reorder_schedule_items.sql";
const crossDayMigrationPath = "supabase/migrations/021_reorder_cross_day_schedule_items.sql";

describe("schedule item reorder migration", () => {
  it("validates edit permission and updates the complete ordered ID list", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toContain("private.can_edit_trip");
    expect(migration).toContain("cardinality(p_schedule_item_ids)");
    expect(migration).toContain("with ordinality");
    expect(migration).toContain("sort_order = ordered_items.position");
  });

  it("allows visible overnight flight items to move into the selected day when reordered", () => {
    expect(existsSync(crossDayMigrationPath)).toBe(true);

    const migration = readFileSync(crossDayMigrationPath, "utf8");
    expect(migration).toContain("create or replace function public.reorder_schedule_items");
    expect(migration).toContain("trip_day_id = p_trip_day_id");
    expect(migration).toContain("sort_order = ordered_items.position");
    expect(migration).toContain("and trip_day_id = p_trip_day_id");
    expect(migration).toContain("and trip_id = p_trip_id");
  });
});
