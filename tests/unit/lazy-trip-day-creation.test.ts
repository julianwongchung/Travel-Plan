import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/actions/trips.ts", "utf8");
const form = readFileSync("src/components/trip/add-itinerary-plan.tsx", "utf8");

describe("lazy trip day creation", () => {
  it("uses permission-checking RPCs before adding an item to a generated day", () => {
    expect(form).toContain('name="trip_day_date"');
    expect(form).toContain('name="trip_day_number"');
    expect(actions).toContain('supabase.rpc("ensure_trip_day"');
    expect(actions).toContain('supabase.rpc("create_schedule_item"');
    expect(actions).not.toContain('.from("trip_days")');
    expect(actions).not.toContain('.from("schedule_items")');
  });
});
