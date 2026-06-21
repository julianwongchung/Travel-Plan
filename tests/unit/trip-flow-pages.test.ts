import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overview = readFileSync("src/app/(protected)/trips/[tripId]/overview/page.tsx", "utf8");
const overviewClient = readFileSync("src/components/overview/overview-client.tsx", "utf8");
const tripPlanPage = readFileSync("src/app/(protected)/trips/[tripId]/trip-plan/page.tsx", "utf8");
const tripPlanClient = readFileSync("src/components/trip/trip-plan-client.tsx", "utf8");
const places = readFileSync("src/app/(protected)/trips/[tripId]/places/page.tsx", "utf8");
const placesClient = readFileSync("src/components/places/places-client.tsx", "utf8");
const trips = readFileSync("src/app/(protected)/trips/page.tsx", "utf8");
const tripsDashboard = readFileSync("src/components/trips/trips-dashboard.tsx", "utf8");
const tripCardActions = readFileSync("src/components/trips/trip-card-actions.tsx", "utf8");
const createTripModal = readFileSync("src/components/trips/create-trip-modal.tsx", "utf8");
const plan = readFileSync("src/components/trip/add-itinerary-plan.tsx", "utf8");
const overviewDayTabs = readFileSync("src/components/overview/overview-day-tabs.tsx", "utf8");
const tripPlanDayTabs = readFileSync("src/components/trip/trip-plan-day-tabs.tsx", "utf8");
const agents = readFileSync("AGENTS.md", "utf8");

describe("trip flow page contracts", () => {
  it("documents Trip Plan as an approved V1 route", () => {
    expect(agents).toContain("`/trips/[tripId]/trip-plan`");
    expect(agents).toContain("Overview is a read-only dashboard");
    expect(agents).toContain("Trip Plan is the editable itinerary planning page");
  });

  it("keeps Overview read-only and free of itinerary mutation controls", () => {
    expect(overview).toContain("OverviewClient");
    expect(overviewClient).toContain("TripLogisticsSummary");
    expect(overviewClient).toContain("OverviewDayTabs");
    expect(overviewClient).toContain("TripSummaryCards");
    expect(overviewClient).toContain("Travelers");
    expect(overviewClient).toContain("Expenses");
    expect(overviewClient).not.toContain("Invite Member");
    expect(overviewClient).not.toContain("archiveTrip");
    expect(overviewClient).not.toContain("completeTrip");
    expect(overviewClient).not.toContain("Complete Trip");
    expect(overviewClient).not.toContain("AddItineraryPlan");
    expect(overviewClient).not.toContain("ReorderableScheduleList");
    expect(overviewClient).not.toContain("addScheduleItem");
    expect(overviewDayTabs).not.toContain("removeScheduleItem");
    expect(overviewDayTabs).not.toContain("reorderScheduleItems");
    expect(overviewDayTabs).not.toContain("updateScheduleItemPlan");
    expect(overviewDayTabs).not.toContain("AddItineraryPlan");
  });

  it("keeps Trip Plan responsible for editable itinerary planning", () => {
    expect(tripPlanPage).toContain("TripPlanClient");
    expect(tripPlanPage).toContain("canEditTrip(role, trip)");
    expect(tripPlanPage).toContain("editable={canEditTrip(role, trip)}");
    expect(tripPlanClient).toContain("useTripSchedule");
    expect(tripPlanClient).toContain("TripPlanDayTabs");
    expect(tripPlanDayTabs).toContain("AddItineraryPlan");
    expect(tripPlanDayTabs).toContain("ReorderableScheduleList");
    expect(tripPlanDayTabs).toContain("editable={editable}");
  });

  it("keeps Places as the saved places and logistics page", () => {
    expect(places).toContain("PlacesClient");
    expect(placesClient).toContain("PlacesAddSheet");
    expect(placesClient).toContain("useTripPlaces");
    expect(places).toContain("getTripLogistics");
  });

  it("places owner actions on trip cards", () => {
    expect(trips).toContain("TripsDashboard");
    expect(tripsDashboard).toContain("TripCardActions");
    expect(tripCardActions).toContain("completeTrip");
    expect(tripCardActions).toContain("Complete Trip");
    expect(tripsDashboard).toContain("softDeleteTrip");
    expect(tripsDashboard).toContain("Delete ${trip.name}");
    expect(tripsDashboard).toContain("right-3 top-3");
  });

  it("uses visual showcase cards for private trips", () => {
    expect(tripsDashboard).toContain("VisualTripCard");
    expect(tripsDashboard).toContain("tripHeroImage");
    expect(tripsDashboard).toContain("More actions for ${trip.name}");
    expect(tripsDashboard).toContain("Private");
    expect(tripsDashboard).toContain("showcase");
  });

  it("matches the compact trips dashboard reference layout", () => {
    expect(tripsDashboard).toContain("Search trips...");
    expect(tripsDashboard).toContain("All Trips");
    expect(tripsDashboard).toContain("Private");
    expect(tripsDashboard).toContain("Shared");
    expect(tripsDashboard).toContain("My Private Trips");
    expect(tripsDashboard).toContain("SlidersHorizontal");
  });

  it("keeps archived trips visible after archive actions", () => {
    expect(tripsDashboard).toContain('title="Archived"');
    expect(tripsDashboard).not.toContain("showArchived");
    expect(tripsDashboard).toContain("showTrash");
  });

  it("opens trip creation from a modal instead of rendering the full form on Trips", () => {
    expect(tripsDashboard).toContain("CreateTripModal");
    expect(trips).not.toContain('name="default_currency"');
    expect(trips).not.toContain("Travelers");
    expect(createTripModal).toContain("Create Private Trip");
    expect(createTripModal).toContain("Country");
    expect(createTripModal).toContain("City / destination name (optional)");
    expect(createTripModal).toContain("Traveler name");
    expect(createTripModal).toContain("Add traveler");
    expect(createTripModal).not.toContain("Number of travelers if available");
    expect(createTripModal).not.toContain("traveler_count");
    expect(createTripModal).not.toContain("Currency</");
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
