import { describe, expect, it } from "vitest";
import { buildTripDateRange, validateNewTripDayDate, validateTripCreationDates } from "@/lib/utils/trip-days";

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
});
