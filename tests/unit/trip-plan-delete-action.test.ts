import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/actions/trips.ts", "utf8");
const updateScheduleItemMigration = readFileSync("supabase/migrations/012_update_schedule_item_rpc.sql", "utf8");

describe("trip plan delete action", () => {
  it("deletes schedule items through the permission-checking RPC", () => {
    const removeAction = actions.slice(
      actions.indexOf("export async function removeScheduleItem"),
    );

    expect(removeAction).toContain(
      'supabase.rpc("delete_schedule_item", { p_schedule_item_id: scheduleItemId })',
    );
    expect(removeAction).not.toContain(
      'supabase.from("schedule_items").delete()',
    );
  });

  it("updates schedule items through the permission-checking RPC", () => {
    const updateAction = actions.slice(
      actions.indexOf("export async function updateFlightScheduleItem"),
      actions.indexOf("export async function reorderScheduleItems"),
    );

    expect(updateAction).toContain(
      'supabase.rpc("update_schedule_item"',
    );
    expect(updateAction).not.toContain(
      'supabase.from("schedule_items").update()',
    );
  });

  it("defines the update schedule item RPC with the server action signature", () => {
    expect(updateScheduleItemMigration).toContain("create or replace function public.update_schedule_item(");
    expect(updateScheduleItemMigration).toContain("p_schedule_item_id uuid");
    expect(updateScheduleItemMigration).toContain("p_time_block text");
    expect(updateScheduleItemMigration).toContain("p_title text");
    expect(updateScheduleItemMigration).toContain("p_description text");
    expect(updateScheduleItemMigration).toContain("p_transport text");
    expect(updateScheduleItemMigration).toContain("p_food text");
    expect(updateScheduleItemMigration).toContain("p_notes text");
    expect(updateScheduleItemMigration).toContain("private.can_edit_trip(parent_trip_id)");
    expect(updateScheduleItemMigration).toContain("grant execute on function public.update_schedule_item(uuid, text, text, text, text, text, text) to authenticated");
  });
});
