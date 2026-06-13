import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overview = readFileSync("src/app/(protected)/trips/[tripId]/overview/page.tsx", "utf8");
const places = readFileSync("src/app/(protected)/trips/[tripId]/places/page.tsx", "utf8");
const trips = readFileSync("src/app/(protected)/trips/page.tsx", "utf8");
const plan = readFileSync("src/components/trip/add-itinerary-plan.tsx", "utf8");

describe("trip flow page contracts", () => {
  it("keeps Overview read-only and free of itinerary creation", () => {
    expect(overview).toContain("TripLogisticsSummary");
    expect(overview).toContain("OverviewDayTabs");
    expect(overview).not.toContain("Invite Member");
    expect(overview).not.toContain("archiveTrip");
    expect(overview).not.toContain("Add itinerary item");
  });

  it("centralizes all three add choices on Places", () => {
    expect(places).toContain("PlacesAddSheet");
    expect(places).toContain("getTripLogistics");
  });

  it("places owner actions on trip cards", () => {
    expect(trips).toContain("TripCardActions");
  });

  it("offers Flight, Hotel, and Place choices from Plan", () => {
    expect(plan).toContain('"flight"');
    expect(plan).toContain('"hotel"');
    expect(plan).toContain('"place"');
    expect(plan).toContain("Add Flight");
    expect(plan).toContain("Add Hotel");
    expect(plan).toContain("Add Place");
  });
});
