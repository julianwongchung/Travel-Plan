import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/actions/trips.ts", "utf8");

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
});
