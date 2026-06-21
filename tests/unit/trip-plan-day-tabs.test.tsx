// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const routerReplace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: routerReplace }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { TripPlanDayTabs } from "@/components/trip/trip-plan-day-tabs";
import type { ScheduleItem, TripDay } from "@/lib/db/types";
import { serializeFlightPlan } from "@/lib/utils/schedule-item-plan";

const days: TripDay[] = [
  {
    id: "day-1",
    trip_id: "trip-1",
    date: "2026-06-13",
    day_number: 1,
    route: "Arrival",
    hotel_name: null,
    hotel_link: null,
    remark: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: null,
  },
  {
    id: "day-2",
    trip_id: "trip-1",
    date: "2026-06-14",
    day_number: 2,
    route: "City walk",
    hotel_name: null,
    hotel_link: null,
    remark: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: null,
  },
];

const scheduleItems: ScheduleItem[] = [
  {
    id: "item-1",
    trip_id: "trip-1",
    trip_day_id: "day-1",
    time_block: "10:00",
    title: "Airport transfer",
    description: null,
    transport: "Taxi",
    food: null,
    notes: null,
    sort_order: 1,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: null,
  },
  {
    id: "item-2",
    trip_id: "trip-1",
    trip_day_id: "day-2",
    time_block: "09:00",
    title: "Museum visit",
    description: null,
    transport: null,
    food: null,
    notes: null,
    sort_order: 1,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: null,
  },
];

describe("TripPlanDayTabs", () => {
  afterEach(() => {
    cleanup();
    routerReplace.mockClear();
  });
  it("switches itinerary content without hash navigation or page scrolling", () => {
    render(
      <TripPlanDayTabs
        tripId="trip-1"
        days={days}
        scheduleItems={scheduleItems}
        editable={false}
      />,
    );

    expect(screen.getByText("Airport transfer")).toBeTruthy();
    expect(screen.queryByText("Museum visit")).toBeNull();
    expect(document.querySelector('a[href^="#day-"]')).toBeNull();
    expect(screen.getByRole("navigation", { name: "Trip dates" }).className).toContain("sticky top-16");
    expect(screen.getByRole("tab", { name: "13 JUN D1" }).className).toContain("min-h-[56px]");

    const scrollBefore = window.scrollY;
    fireEvent.click(screen.getByRole("tab", { name: "14 JUN D2" }));

    expect(window.scrollY).toBe(scrollBefore);
    expect(screen.queryByText("Airport transfer")).toBeNull();
    expect(screen.getByText("Museum visit")).toBeTruthy();
  });

  it("adds a plan to the currently selected day", () => {
    render(
      <TripPlanDayTabs
        tripId="trip-1"
        days={days}
        scheduleItems={scheduleItems}
        editable
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "14 JUN D2" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Place" }));

    const dialog = screen.getByRole("dialog", { name: "Add Place" });
    expect(dialog.querySelector('input[name="trip_day_id"]')?.getAttribute("value")).toBe("day-2");
    expect(dialog.querySelector('input[name="trip_day_date"]')?.getAttribute("value")).toBe("2026-06-14");
    expect(dialog.querySelector('input[name="trip_day_number"]')?.getAttribute("value")).toBe("2");
    expect(routerReplace).toHaveBeenCalledWith(
      `${window.location.pathname}?day=2026-06-14`,
      { scroll: false },
    );
  });

  it("hides itinerary mutation controls for read-only viewers", () => {
    render(
      <TripPlanDayTabs
        tripId="trip-1"
        days={days}
        scheduleItems={scheduleItems}
        editable={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "+ Add Plan" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reorder Airport transfer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove Airport transfer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Move Airport transfer up" })).toBeNull();
  });

  it("keeps itinerary editing controls on Trip Plan for editors and owners", () => {
    render(
      <TripPlanDayTabs
        tripId="trip-1"
        days={days}
        scheduleItems={[
          {
            id: "hotel-item",
            trip_id: "trip-1",
            trip_day_id: "day-1",
            time_block: "15:00",
            title: "Hotel stay",
            description: "Check-in: 2026-06-13T15:00",
            transport: "Hotel",
            food: null,
            notes: null,
            sort_order: 1,
            created_at: "2026-06-01T00:00:00Z",
            updated_at: null,
          },
        ]}
        editable
      />,
    );

    expect(screen.getByRole("button", { name: "+ Add Plan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reorder Hotel stay" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit Hotel stay" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Hotel stay" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Move Hotel stay up" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Move Hotel stay down" })).toBeTruthy();
  });

  it("restores a selected day after server revalidation", () => {
    render(
      <TripPlanDayTabs
        tripId="trip-1"
        days={days}
        scheduleItems={scheduleItems}
        editable
        initialSelectedDayId="day-2"
      />,
    );

    expect(screen.getByRole("tab", { name: "14 JUN D2" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Museum visit")).toBeTruthy();
  });

  it("shows overnight flight details on the arrival day without moving the owned item", () => {
    render(
      <TripPlanDayTabs
        tripId="trip-1"
        days={days}
        scheduleItems={[
          {
            id: "overnight-flight",
            trip_id: "trip-1",
            trip_day_id: "day-1",
            time_block: "22:40",
            title: "Kuala Lumpur \u2192 Osaka",
            description: serializeFlightPlan([
              {
                origin: "Kuala Lumpur",
                destination: "Osaka",
                departureDate: "2026-06-13",
                departureTime: "22:40",
                arrivalDate: "2026-06-14",
                arrivalTime: "05:50",
              },
            ], ["Julian"], "Overnight flight"),
            transport: "Flight",
            food: null,
            notes: null,
            sort_order: 1,
            created_at: "2026-06-01T00:00:00Z",
            updated_at: null,
          },
        ]}
        editable
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "14 JUN D2" }));

    expect(screen.getByText("Flight details for this day")).toBeTruthy();
    expect(screen.getByText("Kuala Lumpur \u2192 Osaka")).toBeTruthy();
    expect(screen.getByText("1. Kuala Lumpur to Osaka / 13/06/2026 22:40 to 14/06/2026 05:50 (+1 day)")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit Kuala Lumpur \u2192 Osaka" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove Kuala Lumpur \u2192 Osaka" })).toBeNull();
  });
});
