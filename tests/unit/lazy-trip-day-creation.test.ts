import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/actions/trips.ts", "utf8");
const form = readFileSync("src/components/trip/add-itinerary-place-form.tsx", "utf8");

describe("lazy trip day creation", () => {
  it("upserts a generated date before adding its first itinerary item", () => {
    expect(form).toContain('name="trip_day_date"');
    expect(form).toContain('name="trip_day_number"');
    expect(actions).toContain('.upsert(');
    expect(actions).toContain('onConflict: "trip_id,date"');
    expect(actions).toContain('.select("id")');
  });
});
