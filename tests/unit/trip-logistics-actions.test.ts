import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  flightInputSchema,
  hotelInputSchema,
  placeInputSchema,
} from "@/lib/utils/trip-logistics";

describe("trip logistics form validation", () => {
  it("rejects invalid hotel stays", () => {
    const result = hotelInputSchema.safeParse({
      name: "Hotel",
      location: "Hoi An",
      checkInDate: "2026-06-15",
      checkOutDate: "2026-06-13",
      notes: "",
    });

    expect(result.success).toBe(false);
  });

  it("requires complete flight routing and passenger details", () => {
    const result = flightInputSchema.safeParse({
      flightNumber: "SQ172",
      flightDate: "2026-06-13",
      flightTime: "08:45",
      passengerName: "",
      departure: "Singapore",
      arrival: "Da Nang",
      notes: "",
    });

    expect(result.success).toBe(false);
  });

  it("allows a place without planned date or time", () => {
    expect(placeInputSchema.parse({
      name: "Marble Mountains",
      location: "Da Nang",
      plannedDate: "",
      plannedTime: "",
      notes: "",
    })).toMatchObject({
      name: "Marble Mountains",
      plannedDate: "",
      plannedTime: "",
    });
  });
});

describe("trip logistics action contracts", () => {
  it("uses protected RPCs for hotel and flight mutations", () => {
    const actions = readFileSync("src/lib/actions/trip-logistics.ts", "utf8");

    expect(actions).toContain('supabase.rpc("create_trip_hotel"');
    expect(actions).toContain('supabase.rpc("create_trip_flight"');
    expect(actions).toContain('supabase.rpc("soft_delete_trip_hotel"');
    expect(actions).toContain('supabase.rpc("soft_delete_trip_flight"');
  });

  it("passes optional planned date and time through place creation", () => {
    const actions = readFileSync("src/lib/actions/places.ts", "utf8");

    expect(actions).toContain("p_planned_date");
    expect(actions).toContain("p_planned_time");
  });
});
