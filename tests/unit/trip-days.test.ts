import { describe, expect, it } from "vitest";
import {
  buildTripDateRange,
  getNextStopNumber,
  normalizeTripDaysForRange,
  validateNewTripDayDate,
  validateTripCreationDates,
} from "@/lib/utils/trip-days";

describe("trip day helpers", () => {
  it("rejects adding a trip day on an existing date", () => {
    const result = validateNewTripDayDate("2026-07-12", ["2026-07-10", "2026-07-12"]);

    expect(result).toEqual({
      ok: false,
      message: "This date is already in your trip plan.",
    });
  });

  it("allows adding a trip day on a new date", () => {
    expect(validateNewTripDayDate("2026-07-13", ["2026-07-10", "2026-07-12"])).toEqual({ ok: true });
  });

  it("builds every trip date from start through end", () => {
    expect(buildTripDateRange("2026-06-13", "2026-06-17")).toEqual([
      "2026-06-13",
      "2026-06-14",
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
    ]);
  });

  it("normalizes an inclusive November 21 to November 29 trip as D1 through D9", () => {
    const persistedDays = [
      { id: "day-9", date: "2026-11-29", day_number: 2 },
      { id: "outside", date: "2026-11-30", day_number: 10 },
      { id: "day-1", date: "2026-11-21", day_number: 7 },
    ];

    const days = normalizeTripDaysForRange(
      persistedDays,
      "2026-11-21",
      "2026-11-29",
      (date, dayNumber) => ({
        id: `generated-trip-day:${date}`,
        date,
        day_number: dayNumber,
      }),
    );

    expect(days).toHaveLength(9);
    expect(days.map((day) => day.date)).toEqual(buildTripDateRange("2026-11-21", "2026-11-29"));
    expect(days.map((day) => day.day_number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(days[0]?.id).toBe("day-1");
    expect(days[4]?.id).toBe("generated-trip-day:2026-11-25");
    expect(days[8]?.id).toBe("day-9");
    expect(days.some((day) => day.id === "outside")).toBe(false);
  });

  it("requires start and end dates when creating a trip", () => {
    expect(validateTripCreationDates(null, "2026-06-17")).toEqual({
      ok: false,
      message: "Trip start and end dates are required.",
    });
    expect(validateTripCreationDates("2026-06-18", "2026-06-17")).toEqual({
      ok: false,
      message: "Trip end date must be on or after start date.",
    });
    expect(validateTripCreationDates("2026-06-13", "2026-06-17")).toEqual({ ok: true });
  });

  it("numbers the next itinerary stop after existing day items", () => {
    expect(getNextStopNumber("day-1", [
      { trip_day_id: "day-1" },
      { trip_day_id: "day-2" },
      { trip_day_id: "day-1" },
    ])).toBe(3);
  });
});
