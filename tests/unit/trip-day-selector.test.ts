import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overview = readFileSync("src/components/overview/overview-day-tabs.tsx", "utf8");
const tripPlan = readFileSync("src/components/trip/trip-plan-day-tabs.tsx", "utf8");
const selector = readFileSync("src/components/trip/trip-day-selector.tsx", "utf8");

describe("shared trip day selector", () => {
  it("keeps Overview and Trip Plan on the same selector implementation", () => {
    expect(overview).toContain("TripDaySelector");
    expect(tripPlan).toContain("TripDaySelector");
  });

  it("fits five plan day tabs across mobile before horizontal scrolling", () => {
    expect(selector).toContain("auto-cols-[calc(20%_-_0.3rem)]");
    expect(selector).toContain("w-full min-w-0");
    expect(selector).not.toContain("min-w-[82px]");
  });
});
