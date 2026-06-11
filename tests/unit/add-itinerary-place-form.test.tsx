// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/trips", () => ({
  addScheduleItem: vi.fn(),
}));

import { AddItineraryPlaceForm } from "@/components/trip/add-itinerary-place-form";

describe("AddItineraryPlaceForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses a plain place input without loading Google Places Autocomplete", () => {
    const { container } = render(
      <AddItineraryPlaceForm
        tripId="trip-1"
        dayId="day-1"
        dayDate="2026-06-13"
        dayNumber={1}
        nextStopNumber={2}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Stop 2" })).toBeTruthy();
    expect(container.querySelector("gmp-place-autocomplete")).toBeNull();
    expect(document.querySelector('script[src*="maps.googleapis.com"]')).toBeNull();
    expect(screen.queryByText(/Google Places Autocomplete/i)).toBeNull();
  });
});
