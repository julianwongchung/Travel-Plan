// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TripLogisticsSummary } from "@/components/overview/trip-logistics-summary";
import type { TripFlight, TripHotel } from "@/lib/db/types";

const hotel: TripHotel = {
  id: "hotel-1",
  trip_id: "trip-1",
  name: "Vaia Hoi An Boutique Hotel",
  location: "Hoi An",
  check_in_date: "2026-06-13",
  check_out_date: "2026-06-15",
  notes: "Breakfast included",
  created_by: "user-1",
  deleted_at: null,
  deleted_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: null,
};

const flight: TripFlight = {
  id: "flight-1",
  trip_id: "trip-1",
  flight_number: "SQ172",
  flight_date: "2026-06-13",
  flight_time: "08:45:00",
  passenger_name: "Julian Wong",
  departure: "Singapore",
  arrival: "Da Nang",
  notes: "Terminal 2",
  created_by: "user-1",
  deleted_at: null,
  deleted_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: null,
};

describe("TripLogisticsSummary", () => {
  afterEach(cleanup);

  it("shows featured hotel and flight details", () => {
    const { container } = render(
      <TripLogisticsSummary
        tripId="trip-1"
        hotels={[hotel]}
        legacyHotels={[]}
        flights={[flight]}
        today="2026-06-13"
        now="2026-06-13T00:00:00"
      />,
    );

    expect(screen.getByText("Vaia Hoi An Boutique Hotel")).toBeTruthy();
    expect(screen.getByText("Julian Wong")).toBeTruthy();
    expect(screen.getByText("1 hotel")).toBeTruthy();
    expect(screen.getByText("1 flight")).toBeTruthy();

    const summaryGrid = container.querySelector('[data-logistics-summary]');
    const summaryTiles = container.querySelectorAll('[data-logistics-tile]');
    expect(summaryGrid?.className).toContain("grid-cols-2");
    expect(summaryTiles).toHaveLength(2);
    expect(summaryTiles[0].className).toContain("aspect-square");
    expect(summaryTiles[1].className).toContain("aspect-square");
  });

  it("opens a read-only details sheet", () => {
    render(
      <TripLogisticsSummary
        tripId="trip-1"
        hotels={[hotel]}
        legacyHotels={[]}
        flights={[flight]}
        today="2026-06-13"
        now="2026-06-13T00:00:00"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View all hotels" }));
    expect(screen.getByRole("dialog", { name: "All hotels" })).toBeTruthy();
    expect(screen.getByText("Breakfast included")).toBeTruthy();
  });

  it("keeps empty summaries visible and opens their detail sheets", () => {
    render(
      <TripLogisticsSummary
        tripId="trip-1"
        hotels={[]}
        legacyHotels={[]}
        flights={[]}
        today="2026-06-13"
        now="2026-06-13T00:00:00"
      />,
    );

    expect(screen.getByText("No hotel added yet")).toBeTruthy();
    expect(screen.getByText("No flight added yet")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Add in Places" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "View all hotels" }));
    expect(screen.getByRole("dialog", { name: "All hotels" })).toBeTruthy();
    expect(screen.getByText("No hotel added yet.")).toBeTruthy();
  });
});
