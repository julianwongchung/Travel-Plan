import { describe, expect, it } from "vitest";
import {
  normalizePlanLogistics,
  normalizeLegacyHotels,
  isMissingLogisticsTableError,
  selectFeaturedFlight,
  selectFeaturedHotel,
  validateHotelStay,
} from "@/lib/utils/trip-logistics";
import { serializeFlightPlan } from "@/lib/utils/schedule-item-plan";
import type { Place, TripFlight, TripHotel } from "@/lib/db/types";

const hotel = (overrides: Partial<TripHotel> = {}): TripHotel => ({
  id: "hotel-1",
  trip_id: "trip-1",
  name: "Harbour Hotel",
  location: "Da Nang",
  check_in_date: "2026-06-13",
  check_out_date: "2026-06-15",
  notes: null,
  created_by: "user-1",
  deleted_at: null,
  deleted_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: null,
  ...overrides,
});

const flight = (overrides: Partial<TripFlight> = {}): TripFlight => ({
  id: "flight-1",
  trip_id: "trip-1",
  flight_number: "SQ172",
  flight_date: "2026-06-13",
  flight_time: "08:45:00",
  passenger_name: "Julian Wong",
  departure: "Singapore",
  arrival: "Da Nang",
  notes: null,
  created_by: "user-1",
  deleted_at: null,
  deleted_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: null,
  ...overrides,
});

describe("trip logistics", () => {
  it("normalizes existing hotel places without inventing stay dates", () => {
    const places: Place[] = [{
      id: "place-1",
      trip_id: "trip-1",
      name: "Legacy Hotel",
      type: "hotel",
      area: "Hoi An",
      google_map_link: null,
      notes: "Near the old town",
      priority: "must-go",
      rating: 4.5,
      planned_date: null,
      planned_time: null,
      deleted_at: null,
      deleted_by: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: null,
    }];

    expect(normalizeLegacyHotels(places)).toEqual([{
      id: "legacy-place-1",
      name: "Legacy Hotel",
      location: "Hoi An",
      checkInDate: null,
      checkOutDate: null,
      notes: "Near the old town",
      source: "legacy",
    }]);
  });

  it("derives hotel and flight summaries from existing trip plan items", () => {
    const result = normalizePlanLogistics(
      [{
        id: "day-1",
        date: "2026-06-13",
        route: "Da Nang",
      }],
      [
        {
          id: "hotel-item",
          trip_day_id: "day-1",
          time_block: "2026-06-13T15:00",
          title: "Vaia Hoi An Boutique Hotel",
          description: "Check-in: 2026-06-13T15:00 - Check-out: 2026-06-15T11:00 - Late arrival",
          transport: "Lodging",
          food: null,
          notes: null,
        },
        {
          id: "flight-item",
          trip_day_id: "day-1",
          time_block: "08:45",
          title: "Flight SQ172",
          description: "Passenger: Julian Wong - Window seat",
          transport: "Flight",
          food: null,
          notes: null,
        },
      ],
    );

    expect(result.hotels).toEqual([{
      id: "plan-hotel-item",
      name: "Vaia Hoi An Boutique Hotel",
      location: "Da Nang",
      checkInDate: "2026-06-13",
      checkOutDate: "2026-06-15",
      notes: "Late arrival",
      source: "plan",
    }]);
    expect(result.flights).toEqual([{
      id: "plan-flight-item",
      flightNumber: "SQ172",
      flightDate: "2026-06-13",
      flightTime: "08:45",
      passengerName: "Julian Wong",
      departure: null,
      arrival: null,
      notes: "Window seat",
      source: "plan",
    }]);
  });

  it("normalizes serialized plan flights without exposing raw flight JSON", () => {
    const result = normalizePlanLogistics(
      [{
        id: "day-1",
        date: "2026-11-20",
        route: "Departure",
      }],
      [{
        id: "serialized-flight",
        trip_day_id: "day-1",
        time_block: "18:00",
        title: "KCH \u2192 KLIA T1",
        description: serializeFlightPlan([
          {
            origin: "KCH",
            destination: "KLIA T1",
            departureDate: "2026-11-20",
            departureTime: "18:00",
            arrivalDate: "2026-11-20",
            arrivalTime: "22:00",
          },
        ], ["CLARRIE"], null),
        transport: "Flight",
        food: null,
        notes: null,
      }],
    );

    expect(result.flights).toMatchObject([{
      id: "plan-serialized-flight",
      flightNumber: "KCH \u2192 KLIA T1",
      flightDate: "2026-11-20",
      flightTime: "18:00",
      passengerName: "CLARRIE",
      departure: "KCH",
      arrival: "KLIA T1",
      notes: null,
      connectionSummary: "Direct flight",
      source: "plan",
    }]);
    expect(result.flights[0].segments).toHaveLength(1);
    expect(JSON.stringify(result.flights[0])).not.toContain("__travel_os_flight_plan_v1__");
  });

  it("selects a current hotel before a future hotel", () => {
    const hotels = [
      hotel({ id: "future", name: "Future Hotel", check_in_date: "2026-06-18", check_out_date: "2026-06-20" }),
      hotel({ id: "current", name: "Current Hotel", check_in_date: "2026-06-12", check_out_date: "2026-06-14" }),
    ];

    expect(selectFeaturedHotel(hotels, [], "2026-06-13")?.name).toBe("Current Hotel");
  });

  it("falls back to the next hotel and then a legacy hotel", () => {
    const next = hotel({ name: "Next Hotel", check_in_date: "2026-06-20", check_out_date: "2026-06-22" });
    const legacy = normalizeLegacyHotels([{
      id: "place-2",
      trip_id: "trip-1",
      name: "Legacy Hotel",
      type: "hotel",
      area: null,
      google_map_link: null,
      notes: null,
      priority: null,
      rating: null,
      planned_date: null,
      planned_time: null,
      deleted_at: null,
      deleted_by: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: null,
    }]);

    expect(selectFeaturedHotel([next], legacy, "2026-06-13")?.name).toBe("Next Hotel");
    expect(selectFeaturedHotel([], legacy, "2026-06-13")?.name).toBe("Legacy Hotel");
  });

  it("selects the next flight or the most recent past flight", () => {
    const past = flight({ id: "past", flight_date: "2026-06-10", flight_time: "09:00:00" });
    const next = flight({ id: "next", flight_date: "2026-06-13", flight_time: "15:00:00" });
    const later = flight({ id: "later", flight_date: "2026-06-14", flight_time: "08:00:00" });

    expect(selectFeaturedFlight([later, past, next], new Date("2026-06-13T12:00:00"))?.id).toBe("next");
    expect(selectFeaturedFlight([past], new Date("2026-06-13T12:00:00"))?.id).toBe("past");
  });

  it("rejects a check-out date before check-in", () => {
    expect(validateHotelStay("2026-06-15", "2026-06-13")).toEqual({
      ok: false,
      message: "Check-out date must be on or after check-in date.",
    });
    expect(validateHotelStay("2026-06-13", "2026-06-15")).toEqual({ ok: true });
  });

  it("recognizes an unapplied logistics migration without hiding other errors", () => {
    expect(isMissingLogisticsTableError("Could not find the table 'public.trip_hotels' in the schema cache")).toBe(true);
    expect(isMissingLogisticsTableError('relation "public.trip_flights" does not exist')).toBe(true);
    expect(isMissingLogisticsTableError("permission denied for table trip_hotels")).toBe(false);
  });
});
