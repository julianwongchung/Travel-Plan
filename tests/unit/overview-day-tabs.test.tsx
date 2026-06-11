// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    description: null,
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
    description: "Check in and rest",
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
        tripId="trip-1"
        days={days}
        scheduleItems={scheduleItems}
        logistics={<aside><h2>Logistics Overview</h2></aside>}
      />,
    );

    expect(screen.getByText("Morning flight")).toBeTruthy();
    const mapLink = screen.getByRole("link", { name: "Morning flight" });
    expect(mapLink.getAttribute("href")).toBe("https://www.google.com/maps/search/?api=1&query=Morning%20flight");
    expect(mapLink.getAttribute("target")).toBe("_blank");
    expect(mapLink.getAttribute("rel")).toContain("noopener");
    expect(screen.queryByText("https://www.google.com/maps/search/?api=1&query=Morning%20flight")).toBeNull();
    expect(screen.queryByText("Museum visit")).toBeNull();
    expect(document.querySelector('a[href^="#overview-day-"]')).toBeNull();

    const dateNavigation = screen.getByRole("navigation", { name: "Trip dates" });
    const logisticsHeading = screen.getByRole("heading", { name: "Logistics Overview" });
    const itineraryHeading = screen.getByRole("heading", { name: "Day 1: Arrival" });
    expect(dateNavigation.className).toContain("sticky top-16");
    expect(dateNavigation.compareDocumentPosition(logisticsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(itineraryHeading.compareDocumentPosition(logisticsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("tab", { name: "6/13 D1" }).className).toContain("min-h-[56px]");

    const scrollBefore = window.scrollY;
    fireEvent.click(screen.getByRole("tab", { name: "6/14 D2" }));

    expect(window.scrollY).toBe(scrollBefore);
    expect(screen.queryByText("Morning flight")).toBeNull();
    expect(screen.getByText("Museum visit")).toBeTruthy();
  });

  it("uses category-aware card palettes and right-aligned edit actions", () => {
    const { container } = render(
      <OverviewDayTabs
        tripId="trip-1"
        days={days}
        scheduleItems={scheduleItems}
      />,
    );

    expect(container.querySelector('[data-itinerary-category="flight"]')?.className).toContain("border-blue");
    expect(container.querySelector('[data-itinerary-category="lodging"]')?.className).toContain("border-violet");
    expect(container.querySelector('[data-itinerary-category="transport"]')?.className).toContain("border-cyan");
    expect(container.querySelector('[data-itinerary-category="food"]')?.className).toContain("border-orange");
    expect(container.querySelector('[data-itinerary-category="activity"]')?.className).toContain("border-emerald");
    expect(container.querySelector('[data-itinerary-category="other"]')?.className).toContain("border-slate");

    expect(screen.getByText("Flight")).toBeTruthy();
    expect(screen.getByText("Lodging")).toBeTruthy();
    expect(screen.getByText("Transport")).toBeTruthy();
    expect(screen.getByText("Food")).toBeTruthy();
    expect(screen.getAllByText("Activity")).toHaveLength(1);
    expect(screen.getByText("Other")).toBeTruthy();

    const transportCard = container.querySelector('[data-itinerary-category="transport"]');
    expect(transportCard?.textContent).toContain("Airport hotel shuttle");

    const editLink = screen.getByRole("link", { name: "Edit Morning flight" });
    expect(editLink.className).toContain("absolute");
    expect(editLink.className).toContain("right-3");
    expect(editLink.className).toContain("top-3");
  });
});
