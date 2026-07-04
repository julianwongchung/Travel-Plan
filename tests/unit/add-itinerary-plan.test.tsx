// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { addScheduleItem, invalidateQueries, refresh } = vi.hoisted(() => ({
  addScheduleItem: vi.fn(),
  invalidateQueries: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/actions/trips", () => ({
  addScheduleItem,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
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
    invalidateQueries.mockReset();
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

    expect(screen.getByText("Segment 1")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Origin / From" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Destination / To" })).toBeTruthy();
    expect(screen.getByLabelText("Departure date & time")).toBeTruthy();
    expect(screen.getByLabelText("Arrival date & time")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Passenger" })).toBeTruthy();
    expect(screen.queryByText("Flight number")).toBeNull();
    expect(screen.queryByText("Airline")).toBeNull();
    expect(screen.queryByText("Terminal")).toBeNull();
    expect(screen.getByRole("button", { name: "+ Add connecting flight" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Choose another type" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Hotel" }));

    expect(screen.getByRole("textbox", { name: "Hotel name" })).toBeTruthy();
    expect(screen.getByLabelText("Check-in")).toBeTruthy();
    expect(screen.getByLabelText("Check-out")).toBeTruthy();
  });

  it("adds and removes connecting flight segments", () => {
    render(<AddItineraryPlan {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Flight" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add connecting flight" }));

    expect(screen.getByText("Segment 1")).toBeTruthy();
    expect(screen.getByText("Segment 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove segment 2" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove segment 2" }));

    expect(screen.queryByText("Segment 2")).toBeNull();
  });

  it("saves a connecting flight under the selected day", async () => {
    render(<AddItineraryPlan {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Flight" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Origin / From" }), {
      target: { value: "Kuching" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Destination / To" }), {
      target: { value: "Kuala Lumpur" },
    });
    fireEvent.change(screen.getByLabelText("Departure date & time"), { target: { value: "20/11/2026 18:00" } });
    fireEvent.change(screen.getByLabelText("Arrival date & time"), { target: { value: "20/11/2026 20:00" } });
    expect(screen.getByDisplayValue("20/11/2026 18:00")).toBeTruthy();
    expect(screen.getByDisplayValue("20/11/2026 20:00")).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Passenger" }), {
      target: { value: "Julian" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Add connecting flight" }));

    const origins = screen.getAllByRole("textbox", { name: "Origin / From" });
    const destinations = screen.getAllByRole("textbox", { name: "Destination / To" });
    const departureDateTimes = screen.getAllByLabelText("Departure date & time");
    const arrivalDateTimes = screen.getAllByLabelText("Arrival date & time");

    fireEvent.change(origins[1], { target: { value: "Kuala Lumpur" } });
    fireEvent.change(destinations[1], { target: { value: "Osaka" } });
    fireEvent.change(departureDateTimes[1], { target: { value: "20/11/2026 22:40" } });
    fireEvent.change(arrivalDateTimes[1], { target: { value: "21/11/2026 05:50" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Flight" }));

    await waitFor(() => expect(addScheduleItem).toHaveBeenCalledTimes(1));
    const submitted = addScheduleItem.mock.calls[0][1] as FormData;
    expect(submitted.get("plan_type")).toBe("flight");
    expect(submitted.get("trip_day_id")).toBe("day-1");
    expect(submitted.get("flight_segment_count")).toBe("2");
    expect(submitted.get("flight_segments.0.origin")).toBe("Kuching");
    expect(submitted.get("flight_segments.0.departure_at")).toBe("2026-11-20T18:00");
    expect(submitted.get("flight_segments.0.departure_date")).toBe("2026-11-20");
    expect(submitted.get("flight_segments.0.departure_time")).toBe("18:00");
    expect(submitted.get("flight_segments.1.destination")).toBe("Osaka");
    expect(submitted.get("flight_segments.1.arrival_at")).toBe("2026-11-21T05:50");
    expect(submitted.get("flight_passenger_name")).toBe("Julian");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "schedule"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "overview"] });
  });

  it("lets the calendar picker fill flight date-time fields", () => {
    render(<AddItineraryPlan {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Flight" }));

    fireEvent.change(screen.getByLabelText("Departure date & time calendar"), {
      target: { value: "2026-11-20T18:00" },
    });
    fireEvent.change(screen.getByLabelText("Arrival date & time calendar"), {
      target: { value: "2026-11-21T05:50" },
    });

    expect(screen.getByDisplayValue("20/11/2026 18:00")).toBeTruthy();
    expect(screen.getByDisplayValue("21/11/2026 05:50")).toBeTruthy();
  });

  it("uses saved travelers as multi-select flight passengers", async () => {
    render(
      <AddItineraryPlan
        {...props}
        travelers={[
          { id: "traveler-1", name: "Julian" },
          { id: "traveler-2", name: "Clarrie" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Add Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Flight" }));

    const julian = screen.getByRole("checkbox", { name: "Julian" }) as HTMLInputElement;
    const clarrie = screen.getByRole("checkbox", { name: "Clarrie" }) as HTMLInputElement;
    expect(julian.checked).toBe(false);
    expect(clarrie.checked).toBe(false);
    fireEvent.click(julian);
    fireEvent.click(clarrie);
    expect(julian.checked).toBe(true);
    expect(clarrie.checked).toBe(true);
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
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "schedule"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "overview"] });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
