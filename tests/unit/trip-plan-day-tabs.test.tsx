// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const routerReplace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: routerReplace }),
}));

import { TripPlanDayTabs } from "@/components/trip/trip-plan-day-tabs";
import type { ScheduleItem, TripDay } from "@/lib/db/types";

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
    expect(screen.getByRole("tab", { name: "6/13 D1" }).className).toContain("min-h-[56px]");

    const scrollBefore = window.scrollY;
    fireEvent.click(screen.getByRole("tab", { name: "6/14 D2" }));

    expect(window.scrollY).toBe(scrollBefore);
    expect(screen.queryByText("Airport transfer")).toBeNull();
    expect(screen.getByText("Museum visit")).toBeTruthy();
  });

  it("adds a plan to the currently selected day", () => {
    const { container } = render(
      <TripPlanDayTabs
        tripId="trip-1"
        days={days}
        scheduleItems={scheduleItems}
        editable
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "6/14 D2" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Place" }));

    expect(container.querySelector('input[name="trip_day_id"]')?.getAttribute("value")).toBe("day-2");
    expect(container.querySelector('input[name="trip_day_date"]')?.getAttribute("value")).toBe("2026-06-14");
    expect(container.querySelector('input[name="trip_day_number"]')?.getAttribute("value")).toBe("2");
    expect(routerReplace).toHaveBeenCalledWith(
      `${window.location.pathname}?day=2026-06-14`,
      { scroll: false },
    );
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

    expect(screen.getByRole("tab", { name: "6/14 D2" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Museum visit")).toBeTruthy();
  });
});
