import { describe, expect, it } from "vitest";
import {
  buildScheduleItemPlan,
  flightArrivalDayOffset,
  flightRouteSummary,
  flightStopoverSummary,
  parseFlightPlanDescription,
  scheduleItemCategory,
} from "@/lib/utils/schedule-item-plan";

describe("schedule item plans", () => {
  it("builds a flight item with a stable flight marker", () => {
    const item = buildScheduleItemPlan({
      planType: "flight",
      segments: [{
        origin: "Kuching",
        destination: "Kuala Lumpur",
        departureDate: "2026-11-20",
        departureTime: "18:00",
        arrivalDate: "2026-11-20",
        arrivalTime: "20:00",
      }],
      passengers: ["Julian", "Clarrie"],
      notes: "Window seat",
    });

    expect(item.title).toBe("Kuching \u2192 Kuala Lumpur");
    expect(item.timeBlock).toBe("18:00");
    expect(item.transport).toBe("Flight");
    expect(item.notes).toBeNull();
    expect(parseFlightPlanDescription(item.description)).toEqual({
      segments: [{
        origin: "Kuching",
        destination: "Kuala Lumpur",
        departureDate: "2026-11-20",
        departureTime: "18:00",
        arrivalDate: "2026-11-20",
        arrivalTime: "20:00",
      }],
      passengers: ["Julian", "Clarrie"],
      notes: "Window seat",
    });
  });

  it("builds connecting flights as one grouped flight plan", () => {
    const segments = [
      {
        origin: "Kuching",
        destination: "Kuala Lumpur",
        departureDate: "2026-11-20",
        departureTime: "18:00",
        arrivalDate: "2026-11-20",
        arrivalTime: "20:00",
      },
      {
        origin: "Kuala Lumpur",
        destination: "Osaka",
        departureDate: "2026-11-20",
        departureTime: "22:40",
        arrivalDate: "2026-11-21",
        arrivalTime: "05:50",
      },
    ];
    const item = buildScheduleItemPlan({
      planType: "flight",
      segments,
      passengers: ["Julian"],
      notes: "Overnight flight",
    });

    expect(item).toEqual({
      title: "Kuching \u2192 Kuala Lumpur \u2192 Osaka",
      timeBlock: "18:00",
      description: item.description,
      transport: "Flight",
      notes: null,
    });
    expect(flightRouteSummary(segments)).toBe("Kuching \u2192 Kuala Lumpur \u2192 Osaka");
    expect(flightStopoverSummary(segments)).toBe("1 stop in Kuala Lumpur");
    expect(flightArrivalDayOffset(segments[1])).toBe("+1 day");
    expect(parseFlightPlanDescription(item.description)?.notes).toBe("Overnight flight");
  });

  it("builds lodging details without requiring a schema category column", () => {
    expect(buildScheduleItemPlan({
      planType: "hotel",
      hotelName: "Harbour Stay",
      checkIn: "2026-06-13T15:00",
      checkOut: "2026-06-15T11:00",
      notes: "Late arrival",
    })).toEqual({
      title: "Harbour Stay",
      timeBlock: "2026-06-13T15:00",
      description: "Check-in: 2026-06-13T15:00 - Check-out: 2026-06-15T11:00 - Late arrival",
      transport: "Lodging",
      notes: null,
    });
  });

  it("builds a place with manual entry and a generated map link", () => {
    const item = buildScheduleItemPlan({
      planType: "place",
      placeName: "Gardens by the Bay",
      placeTime: "18:00",
      notes: "See the light show",
    });

    expect(item.title).toBe("Gardens by the Bay");
    expect(item.timeBlock).toBe("18:00");
    expect(item.description).toBe("See the light show");
    expect(item.transport).toBe("Activity");
    expect(item.notes).toContain("google.com/maps/search");
  });

  it("detects the structured markers before legacy text fallbacks", () => {
    expect(scheduleItemCategory({ title: "SQ 123", transport: "Flight" })).toBe("flight");
    expect(scheduleItemCategory({ title: "Harbour Stay", transport: "Lodging" })).toBe("lodging");
    expect(scheduleItemCategory({ title: "Night market", transport: "Activity" })).toBe("activity");
    expect(scheduleItemCategory({ title: "Airport transfer", transport: "Taxi" })).toBe("transport");
  });
});
