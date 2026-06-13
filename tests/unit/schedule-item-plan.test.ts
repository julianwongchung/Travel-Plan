import { describe, expect, it } from "vitest";
import {
  buildScheduleItemPlan,
  scheduleItemCategory,
} from "@/lib/utils/schedule-item-plan";

describe("schedule item plans", () => {
  it("builds a flight item with a stable flight marker", () => {
    expect(buildScheduleItemPlan({
      planType: "flight",
      flightNumber: "SQ 123",
      flightTime: "08:30",
      passengerName: "Julian Wong",
      notes: "Window seat",
    })).toEqual({
      title: "Flight SQ 123",
      timeBlock: "08:30",
      description: "Passenger: Julian Wong - Window seat",
      transport: "Flight",
      notes: null,
    });
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
