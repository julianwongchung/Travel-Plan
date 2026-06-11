import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/009_reorder_schedule_items.sql";

describe("schedule item reorder migration", () => {
  it("validates edit permission and updates the complete ordered ID list", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toContain("private.can_edit_trip");
    expect(migration).toContain("cardinality(p_schedule_item_ids)");
    expect(migration).toContain("with ordinality");
    expect(migration).toContain("sort_order = ordered_items.position");
  });
});
