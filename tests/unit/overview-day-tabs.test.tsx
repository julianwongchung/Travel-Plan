// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { OverviewDayTabs } from "@/components/overview/overview-day-tabs";

const days = [
  {
    id: "day-1",
    date: "2026-06-13",
    day_number: 1,
    route: "Arrival",
  },
  {
    id: "day-2",
    date: "2026-06-14",
    day_number: 2,
    route: "City walk",
  },
];

const scheduleItems = [
  {
    id: "item-1",
    trip_day_id: "day-1",
    time_block: "10:00",
    title: "Morning flight",
    category: "Flight",
    description: "Passenger: Julian Wong - Departure: Singapore - Arrival: Da Nang - Window seat",
    transport: null,
    food: null,
    notes: "https://www.google.com/maps/search/?api=1&query=Morning%20flight",
  },
  {
    id: "item-2",
    trip_day_id: "day-1",
    time_block: "15:00",
    title: "Riverside stay",
    category: "Hotel",
    description: "Location: Hoi An - Check-in: 2026-06-13T15:00 - Check-out: 2026-06-15T11:00 - Check in and rest",
    transport: null,
    food: null,
    notes: null,
  },
  {
    id: "item-3",
    trip_day_id: "day-1",
    time_block: "17:00",
    title: "Airport hotel shuttle",
    category: null,
    description: null,
    transport: "Train",
    food: null,
    notes: null,
  },
  {
    id: "item-4",
    trip_day_id: "day-1",
    time_block: "19:00",
    title: "Local tasting",
    category: null,
    description: null,
    transport: null,
    food: "Dinner",
    notes: null,
  },
  {
    id: "item-5",
    trip_day_id: "day-1",
    time_block: "20:30",
    title: "Night market walk",
    category: "Activity",
    description: null,
    transport: null,
    food: null,
    notes: null,
  },
  {
    id: "item-6",
    trip_day_id: "day-1",
    time_block: null,
    title: "Free time",
    category: null,
    description: null,
    transport: null,
    food: null,
    notes: null,
  },
  {
    id: "item-7",
    trip_day_id: "day-2",
    time_block: "09:00",
    title: "Museum visit",
    category: null,
    description: null,
    transport: null,
    food: null,
    notes: null,
  },
];

describe("OverviewDayTabs", () => {
  beforeEach(() => {
    cleanup();
  });

  it("switches itinerary content without hash navigation or page scrolling", () => {
    render(
      <OverviewDayTabs
        days={days}
        scheduleItems={scheduleItems}
      />,
    );

    expect(screen.getByText("Morning flight")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open in Google Maps" })).toBeNull();
    expect(screen.queryByText("https://www.google.com/maps/search/?api=1&query=Morning%20flight")).toBeNull();
    expect(screen.queryByText("Museum visit")).toBeNull();
    expect(document.querySelector('a[href^="#overview-day-"]')).toBeNull();

    const dateNavigation = screen.getByRole("navigation", { name: "Trip dates" });
    const itineraryHeading = screen.getByRole("heading", { name: "Day 1: Arrival" });
    expect(dateNavigation.className).toContain("sticky top-16");
    expect(dateNavigation.compareDocumentPosition(itineraryHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("tab", { name: "6/13 D1" }).className).toContain("min-h-[56px]");
    expect(screen.queryByText("Add Itinerary Item")).toBeNull();
    expect(screen.queryByRole("link", { name: /^Edit/ })).toBeNull();

    const scrollBefore = window.scrollY;
    fireEvent.click(screen.getByRole("tab", { name: "6/14 D2" }));

    expect(window.scrollY).toBe(scrollBefore);
    expect(screen.queryByText("Morning flight")).toBeNull();
    expect(screen.getByText("Museum visit")).toBeTruthy();
  });

  it("renders compact one-line rows without inline details or missing-time labels", () => {
    const { container } = render(
      <OverviewDayTabs
        days={days}
        scheduleItems={scheduleItems}
      />,
    );

    const flightRow = screen.getByRole("button", { name: "View Morning flight details" });
    const noTimeRow = screen.getByRole("button", { name: "View Free time details" });
    expect(flightRow.className).toContain("min-h-12");
    expect(flightRow.textContent).toContain("Morning flight");
    expect(flightRow.textContent).toContain("10:00");
    expect(noTimeRow.textContent).toBe("Free time");
    expect(screen.queryByText("Time TBD")).toBeNull();
    expect(screen.queryByText("Window seat")).toBeNull();
    expect(screen.queryByText("Check in and rest")).toBeNull();
    expect(screen.queryByText("Flight", { exact: true })).toBeNull();
    expect(container.querySelector(".itinerary-category-card")).toBeNull();
    expect(screen.queryByRole("link", { name: "Edit Morning flight" })).toBeNull();
  });

  it("opens full flight details only after the row is clicked", () => {
    render(<OverviewDayTabs days={days} scheduleItems={scheduleItems} />);

    fireEvent.click(screen.getByRole("button", { name: "View Morning flight details" }));

    const dialog = screen.getByRole("dialog", { name: "Morning flight details" });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText("Day 1 / Saturday, Jun 13")).toBeTruthy();
    expect(within(dialog).getByText("10:00")).toBeTruthy();
    expect(within(dialog).getByText("Flight", { exact: true })).toBeTruthy();
    expect(within(dialog).getByText("Julian Wong")).toBeTruthy();
    expect(within(dialog).getByText("Singapore")).toBeTruthy();
    expect(within(dialog).getByText("Da Nang")).toBeTruthy();
    expect(within(dialog).getByText("Window seat")).toBeTruthy();

    const mapLink = screen.getByRole("link", { name: "Open in Google Maps" });
    expect(mapLink.getAttribute("href")).toBe("https://www.google.com/maps/search/?api=1&query=Morning%20flight");
    expect(mapLink.getAttribute("target")).toBe("_blank");
    expect(mapLink.getAttribute("rel")).toContain("noopener");
  });

  it("shows hotel location and stay details in the popup", () => {
    render(<OverviewDayTabs days={days} scheduleItems={scheduleItems} />);

    fireEvent.click(screen.getByRole("button", { name: "View Riverside stay details" }));

    expect(screen.getByRole("dialog", { name: "Riverside stay details" })).toBeTruthy();
    expect(screen.getByText("Hoi An")).toBeTruthy();
    expect(screen.getByText("2026-06-13T15:00")).toBeTruthy();
    expect(screen.getByText("2026-06-15T11:00")).toBeTruthy();
    expect(screen.getByText("Check in and rest")).toBeTruthy();
  });
});
