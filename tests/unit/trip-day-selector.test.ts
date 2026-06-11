import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overview = readFileSync("src/components/overview/overview-day-tabs.tsx", "utf8");
const tripPlan = readFileSync("src/components/trip/trip-plan-day-tabs.tsx", "utf8");

describe("shared trip day selector", () => {
  it("keeps Overview and Trip Plan on the same selector implementation", () => {
    expect(overview).toContain("TripDaySelector");
    expect(tripPlan).toContain("TripDaySelector");
  });
});
