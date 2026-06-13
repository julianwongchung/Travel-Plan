// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { addScheduleItem, refresh } = vi.hoisted(() => ({
  addScheduleItem: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/actions/trips", () => ({
  addScheduleItem,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { AddItineraryPlan } from "@/components/trip/add-itinerary-plan";

const props = {
  tripId: "trip-1",
  dayId: "day-1",
  dayDate: "2026-06-13",
  dayNumber: 1,
};

describe("AddItineraryPlan", () => {
  afterEach(() => {
    cleanup();
    addScheduleItem.mockReset();
    addScheduleItem.mockResolvedValue(undefined);
    refresh.mockReset();
  });

  it("replaces the always-visible place input with an Add Plan launcher", () => {
    render(<AddItineraryPlan {...props} />);

    expect(screen.getByRole("button", { name: "+ Add Plan" })).toBeTruthy();
    expect(screen.queryByPlaceholderText("Type a place name")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens Flight, Hotel, and Place choices", () => {
    render(<AddItineraryPlan {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add Plan" }));

    expect(screen.getByRole("dialog", { name: "Add Plan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Flight" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Hotel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Place" })).toBeTruthy();
  });

  it("shows the Flight and Hotel forms", () => {
    render(<AddItineraryPlan {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Flight" }));

    expect(screen.getByRole("textbox", { name: "Flight number" })).toBeTruthy();
    expect(screen.getByLabelText("Flight time")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Passenger name" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Choose another type" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Hotel" }));

    expect(screen.getByRole("textbox", { name: "Hotel name" })).toBeTruthy();
    expect(screen.getByLabelText("Check-in")).toBeTruthy();
    expect(screen.getByLabelText("Check-out")).toBeTruthy();
  });

  it("keeps Add Place usable as a manual form without Google autocomplete", () => {
    const { container } = render(<AddItineraryPlan {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Place" }));
    expect(screen.getByRole("textbox", { name: "Place name" })).toBeTruthy();
    expect(screen.getByLabelText("Time")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeTruthy();
    expect(container.querySelector("gmp-place-autocomplete")).toBeNull();
    expect(document.querySelector('script[src*="maps.googleapis.com"]')).toBeNull();
  });

  it("saves the itinerary place and closes the sheet", async () => {
    render(<AddItineraryPlan {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Place" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Place name" }), {
      target: { value: "Marble Mountains" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Place" }));

    await waitFor(() => expect(addScheduleItem).toHaveBeenCalledTimes(1));
    const submitted = addScheduleItem.mock.calls[0][1] as FormData;
    expect(submitted.get("plan_type")).toBe("place");
    expect(submitted.get("trip_day_id")).toBe("day-1");
    expect(refresh).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
