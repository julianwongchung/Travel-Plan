// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TripLogisticsSummary } from "@/components/overview/trip-logistics-summary";
import type { TripFlight, TripHotel } from "@/lib/db/types";
import type { FlightDisplayItem } from "@/lib/utils/trip-logistics";

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

const travelers = [
  {
    id: "traveler-1",
    name: "CLARRIE",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "traveler-2",
    name: "JULIAN",
    created_at: "2026-01-02T00:00:00Z",
  },
];

describe("TripLogisticsSummary", () => {
  afterEach(cleanup);

  it("shows simple square hotel and flight count tiles without inline details", () => {
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

    expect(screen.getByText("1 hotel")).toBeTruthy();
    expect(screen.getByText("1 flight")).toBeTruthy();
    expect(screen.getByText("HOTELS")).toBeTruthy();
    expect(screen.getByText("FLIGHTS")).toBeTruthy();
    expect(screen.queryByText("Vaia Hoi An Boutique Hotel")).toBeNull();
    expect(screen.queryByText("Julian Wong")).toBeNull();
    expect(screen.queryByText("13/06/2026 - 15/06/2026")).toBeNull();

    const summaryGrid = container.querySelector('[data-logistics-summary]');
    const summaryTiles = container.querySelectorAll('[data-logistics-tile]');
    expect(summaryGrid?.className).toContain("grid-cols-2");
    expect(summaryTiles).toHaveLength(2);
    expect(summaryTiles[0].className).toContain("aspect-square");
    expect(summaryTiles[1].className).toContain("aspect-square");
    expect(summaryTiles[0].className).toContain("bg-white");
    expect(summaryTiles[0].className).toContain("rounded-[14px]");
    expect(summaryTiles[1].className).toContain("bg-white");
    expect(screen.getByRole("button", { name: "View all hotels" }).className).toContain("items-center");
    expect(screen.getByRole("button", { name: "View all hotels" }).className).toContain("justify-center");
    expect(screen.getByRole("button", { name: "View all flights" }).className).toContain("items-center");
    expect(screen.getByRole("button", { name: "View all flights" }).className).toContain("justify-center");

    const iconBubbles = container.querySelectorAll("[data-logistics-icon]");
    expect(iconBubbles).toHaveLength(2);
    expect(iconBubbles[0].className).toContain("rounded-full");
    expect(iconBubbles[0].className).toContain("size-10");
    expect(iconBubbles[0].className).toContain("bg-violet-100");
    expect(iconBubbles[1].className).toContain("size-10");
    expect(iconBubbles[1].className).toContain("bg-blue-100");
  });

  it("opens a centered read-only details modal", () => {
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

    fireEvent.click(screen.getByRole("button", { name: "View all hotels" }));
    const dialog = screen.getByRole("dialog", { name: "All hotels" });
    const modal = document.querySelector("[data-ios-modal]");
    const overlay = document.querySelector("[data-ios-modal-overlay]");
    expect(dialog).toBeTruthy();
    expect(overlay?.className).toContain("place-items-center");
    expect(overlay?.className).toContain("backdrop-blur-md");
    expect(modal?.className).toContain("max-h-[min(82dvh,42rem)]");
    expect(modal?.className).toContain("sm:max-w-lg");
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
    expect(screen.getByText("Breakfast included")).toBeTruthy();
    expect(screen.getByText("Check-in: 13/06/2026")).toBeTruthy();
    expect(container.querySelector("[data-ios-modal]")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "View all flights" }));
    expect(screen.getByRole("dialog", { name: "All flights" })).toBeTruthy();
    expect(screen.getByText("SQ172")).toBeTruthy();
    expect(screen.getByText("Julian Wong")).toBeTruthy();
    expect(screen.getByText("Terminal 2")).toBeTruthy();
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

    expect(screen.getByText("0 hotels")).toBeTruthy();
    expect(screen.getByText("0 flights")).toBeTruthy();
    expect(screen.queryByText("No hotel added yet")).toBeNull();
    expect(screen.queryByText("No flight added yet")).toBeNull();
    expect(screen.queryByRole("link", { name: "Add in Places" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "View all hotels" }));
    expect(screen.getByRole("dialog", { name: "All hotels" })).toBeTruthy();
    expect(screen.getByText("No hotel added yet.")).toBeTruthy();
  });

  it("renders plan flight segments cleanly without raw serialized details", () => {
    const planFlight: FlightDisplayItem = {
      id: "plan-flight-1",
      flightNumber: "KCH \u2192 KLIA T1",
      flightDate: "2026-11-20",
      flightTime: "18:00",
      passengerName: "CLARRIE",
      departure: "KCH",
      arrival: "KLIA T1",
      notes: null,
      connectionSummary: "Direct flight",
      segments: [{
        origin: "KCH",
        destination: "KLIA T1",
        departureDate: "2026-11-20",
        departureTime: "18:00",
        arrivalDate: "2026-11-20",
        arrivalTime: "22:00",
      }],
      source: "plan",
    };

    render(
      <TripLogisticsSummary
        tripId="trip-1"
        hotels={[]}
        legacyHotels={[]}
        flights={[]}
        planFlights={[planFlight]}
        today="2026-06-13"
        now="2026-06-13T00:00:00"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View all flights" }));

    expect(screen.getByRole("dialog", { name: "All flights" })).toBeTruthy();
    expect(screen.getByText("KCH \u2192 KLIA T1")).toBeTruthy();
    expect(screen.getByText("CLARRIE")).toBeTruthy();
    expect(screen.queryByText("Direct flight")).toBeNull();
    expect(screen.queryByText("KCH to KLIA T1")).toBeNull();
    expect(screen.getByText("Depart")).toBeTruthy();
    expect(screen.getByText("KCH / 20/11/2026 18:00")).toBeTruthy();
    expect(screen.getByText("Arrive")).toBeTruthy();
    expect(screen.getByText("KLIA T1 / 20/11/2026 22:00")).toBeTruthy();
    expect(screen.queryByText(/__travel_os_flight_plan_v1__/)).toBeNull();
    expect(screen.queryByText(/Departure not set to Arrival not set/)).toBeNull();
  });

  it("labels early trip flights as departure and late trip flights as return", () => {
    const departureFlight: FlightDisplayItem = {
      id: "plan-flight-departure",
      flightNumber: "KCH \u2192 KIX T1",
      flightDate: "2026-11-20",
      flightTime: "18:00",
      passengerName: "CLARRIE, JULIAN",
      departure: "KCH",
      arrival: "KIX T1",
      notes: null,
      segments: [{
        origin: "KCH",
        destination: "KIX T1",
        departureDate: "2026-11-20",
        departureTime: "18:00",
        arrivalDate: "2026-11-21",
        arrivalTime: "05:50",
      }],
      source: "plan",
    };
    const returnFlight: FlightDisplayItem = {
      id: "plan-flight-return",
      flightNumber: "KIX T1 \u2192 KLIA T1",
      flightDate: "2026-11-29",
      flightTime: "09:55",
      passengerName: "CLARRIE, JULIAN",
      departure: "KIX T1",
      arrival: "KLIA T1",
      notes: null,
      segments: [{
        origin: "KIX T1",
        destination: "KLIA T1",
        departureDate: "2026-11-29",
        departureTime: "09:55",
        arrivalDate: "2026-11-29",
        arrivalTime: "15:55",
      }],
      source: "plan",
    };

    render(
      <TripLogisticsSummary
        tripId="trip-1"
        hotels={[]}
        legacyHotels={[]}
        flights={[]}
        planFlights={[returnFlight, departureFlight]}
        tripStartDate="2026-11-20"
        tripEndDate="2026-11-29"
        travelers={travelers}
        today="2026-11-20"
        now="2026-11-20T00:00:00"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View all flights" }));

    const departureTitle = screen.getByText("KCH \u2192 KIX T1");
    const returnTitle = screen.getByText("KIX T1 \u2192 KLIA T1");
    expect(departureTitle.compareDocumentPosition(returnTitle)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(departureTitle).toBeTruthy();
    expect(screen.getByText("KIX T1 \u2192 KLIA T1")).toBeTruthy();
    expect(screen.getByText("Departure")).toBeTruthy();
    expect(screen.getByText("Return")).toBeTruthy();
  });

  it("shows different colors for different flight passengers", () => {
    const sharedFlight: FlightDisplayItem = {
      id: "plan-flight-shared",
      flightNumber: "KLIA T1 \u2192 KIX T1",
      flightDate: "2026-11-20",
      flightTime: "22:40",
      passengerName: "CLARRIE, JULIAN",
      departure: "KLIA T1",
      arrival: "KIX T1",
      notes: null,
      segments: [{
        origin: "KLIA T1",
        destination: "KIX T1",
        departureDate: "2026-11-20",
        departureTime: "22:40",
        arrivalDate: "2026-11-21",
        arrivalTime: "05:50",
      }],
      source: "plan",
    };

    render(
      <TripLogisticsSummary
        tripId="trip-1"
        hotels={[]}
        legacyHotels={[]}
        flights={[]}
        planFlights={[sharedFlight]}
        travelers={travelers}
        tripStartDate="2026-11-20"
        tripEndDate="2026-11-29"
        today="2026-11-20"
        now="2026-11-20T00:00:00"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View all flights" }));

    const clarrieChip = screen.getByText("CLARRIE").closest("span");
    const julianChip = screen.getByText("JULIAN").closest("span");
    expect(clarrieChip).toBeTruthy();
    expect(julianChip).toBeTruthy();
    expect(clarrieChip?.style.backgroundColor).not.toBe(julianChip?.style.backgroundColor);
    expect(clarrieChip?.style.borderColor).not.toBe(julianChip?.style.borderColor);
  });
});
