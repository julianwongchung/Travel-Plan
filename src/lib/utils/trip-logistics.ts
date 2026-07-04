import { z } from "zod";
import type { Place, TripFlight, TripHotel } from "@/lib/db/types";
import {
  flightRouteSummary,
  flightStopoverSummary,
  parseFlightPlanDescription,
  scheduleItemCategory,
  type FlightPlanSegment,
} from "@/lib/utils/schedule-item-plan";

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required.`);

export const hotelInputSchema = z.object({
  name: requiredText("Hotel name"),
  location: requiredText("Location"),
  checkInDate: requiredText("Check-in date"),
  checkOutDate: requiredText("Check-out date"),
  notes: z.string().trim(),
}).refine(
  (hotel) => hotel.checkOutDate >= hotel.checkInDate,
  {
    message: "Check-out date must be on or after check-in date.",
    path: ["checkOutDate"],
  },
);

export const flightInputSchema = z.object({
  flightNumber: requiredText("Flight number"),
  flightDate: requiredText("Flight date"),
  flightTime: requiredText("Flight time"),
  passengerName: requiredText("Passenger name"),
  departure: requiredText("Departure"),
  arrival: requiredText("Arrival"),
  notes: z.string().trim(),
});

export const placeInputSchema = z.object({
  name: requiredText("Place name"),
  location: requiredText("Location"),
  plannedDate: z.string().trim(),
  plannedTime: z.string().trim(),
  notes: z.string().trim(),
});

export function isMissingLogisticsTableError(message: string | undefined) {
  return Boolean(
    message?.includes("Could not find the table") ||
    message?.includes("does not exist"),
  );
}

export type HotelDisplayItem = {
  id: string;
  name: string;
  location: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  notes: string | null;
  source: "structured" | "legacy" | "plan";
};

export type FlightDisplayItem = {
  id: string;
  flightNumber: string;
  flightDate: string;
  flightTime: string;
  passengerName: string;
  departure: string | null;
  arrival: string | null;
  notes: string | null;
  segments?: FlightPlanSegment[];
  connectionSummary?: string;
  source: "structured" | "plan";
};

export function normalizeLegacyHotels(places: Place[]): HotelDisplayItem[] {
  return places
    .filter((place) => place.type === "hotel" && !place.deleted_at)
    .map((place) => ({
      id: `legacy-${place.id}`,
      name: place.name,
      location: place.area,
      checkInDate: null,
      checkOutDate: null,
      notes: place.notes,
      source: "legacy" as const,
    }));
}

export function normalizeHotels(hotels: TripHotel[]): HotelDisplayItem[] {
  return hotels
    .filter((hotel) => !hotel.deleted_at)
    .map((hotel) => ({
      id: hotel.id,
      name: hotel.name,
      location: hotel.location,
      checkInDate: hotel.check_in_date,
      checkOutDate: hotel.check_out_date,
      notes: hotel.notes,
      source: "structured" as const,
    }));
}

export function normalizeFlights(flights: TripFlight[]): FlightDisplayItem[] {
  return flights
    .filter((flight) => !flight.deleted_at)
    .map((flight) => ({
      id: flight.id,
      flightNumber: flight.flight_number,
      flightDate: flight.flight_date,
      flightTime: flight.flight_time,
      passengerName: flight.passenger_name,
      departure: flight.departure,
      arrival: flight.arrival,
      notes: flight.notes,
      source: "structured" as const,
    }));
}

function detailParts(description: string | null | undefined) {
  return description
    ?.split(" - ")
    .map((part) => part.trim())
    .filter(Boolean) ?? [];
}

function labeledDetail(parts: string[], label: string) {
  const prefix = `${label}:`;
  return parts.find((part) => part.toLowerCase().startsWith(prefix.toLowerCase()))
    ?.slice(prefix.length)
    .trim() || null;
}

function remainingDetails(parts: string[], labels: string[]) {
  const prefixes = labels.map((label) => `${label}:`.toLowerCase());
  const notes = parts.filter(
    (part) => !prefixes.some((prefix) => part.toLowerCase().startsWith(prefix)),
  );
  return notes.join(" - ") || null;
}

function dateOnly(value: string | null | undefined) {
  const match = value?.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

type PlanDay = {
  id: string;
  date: string;
  route: string | null;
};

type PlanScheduleItem = {
  id: string;
  trip_day_id: string;
  time_block: string | null;
  title: string;
  category?: string | null;
  description: string | null;
  transport: string | null;
  food: string | null;
  notes: string | null;
};

export function normalizePlanLogistics(days: PlanDay[], scheduleItems: PlanScheduleItem[]) {
  const daysById = new Map(days.map((day) => [day.id, day]));
  const hotels: HotelDisplayItem[] = [];
  const flights: FlightDisplayItem[] = [];

  scheduleItems.forEach((item) => {
    const day = daysById.get(item.trip_day_id);
    if (!day) return;

    const category = scheduleItemCategory(item);
    const parts = detailParts(item.description);

    if (category === "lodging") {
      const checkIn = labeledDetail(parts, "Check-in");
      const checkOut = labeledDetail(parts, "Check-out");
      hotels.push({
        id: `plan-${item.id}`,
        name: item.title,
        location: day.route,
        checkInDate: dateOnly(checkIn) ?? dateOnly(item.time_block) ?? day.date,
        checkOutDate: dateOnly(checkOut),
        notes: remainingDetails(parts, ["Check-in", "Check-out"]),
        source: "plan",
      });
    }

    if (category === "flight") {
      const flightPlan = parseFlightPlanDescription(item.description);
      if (flightPlan) {
        const firstSegment = flightPlan.segments[0];
        const lastSegment = flightPlan.segments.at(-1);
        flights.push({
          id: `plan-${item.id}`,
          flightNumber: flightRouteSummary(flightPlan.segments) || item.title,
          flightDate: firstSegment?.departureDate ?? day.date,
          flightTime: firstSegment?.departureTime ?? item.time_block ?? "00:00",
          passengerName: flightPlan.passengers.join(", ") || "Passenger not set",
          departure: firstSegment?.origin ?? null,
          arrival: lastSegment?.destination ?? null,
          notes: flightPlan.notes,
          segments: flightPlan.segments,
          connectionSummary: flightStopoverSummary(flightPlan.segments),
          source: "plan",
        });
        return;
      }

      flights.push({
        id: `plan-${item.id}`,
        flightNumber: item.title.replace(/^Flight\s+/i, "").trim() || item.title,
        flightDate: day.date,
        flightTime: item.time_block ?? "00:00",
        passengerName: labeledDetail(parts, "Passenger") ?? "Passenger not set",
        departure: null,
        arrival: null,
        notes: remainingDetails(parts, ["Passenger"]),
        source: "plan",
      });
    }
  });

  return { hotels, flights };
}

export function selectFeaturedHotel(
  hotels: TripHotel[],
  legacyHotels: HotelDisplayItem[],
  today: string,
): HotelDisplayItem | null {
  const structured = normalizeHotels(hotels).sort((a, b) =>
    (a.checkInDate ?? "").localeCompare(b.checkInDate ?? ""),
  );
  const current = structured.find(
    (hotel) =>
      hotel.checkInDate !== null &&
      hotel.checkOutDate !== null &&
      hotel.checkInDate <= today &&
      hotel.checkOutDate >= today,
  );
  if (current) return current;

  const next = structured.find((hotel) => hotel.checkInDate !== null && hotel.checkInDate > today);
  return next ?? structured.at(-1) ?? legacyHotels[0] ?? null;
}

function flightTimestamp(flight: TripFlight) {
  return new Date(`${flight.flight_date}T${flight.flight_time}`).getTime();
}

function displayFlightTimestamp(flight: FlightDisplayItem) {
  return new Date(`${flight.flightDate}T${flight.flightTime}`).getTime();
}

export function selectFeaturedFlight(flights: TripFlight[], now: Date): TripFlight | null {
  const active = flights.filter((flight) => !flight.deleted_at);
  const upcoming = active
    .filter((flight) => flightTimestamp(flight) >= now.getTime())
    .sort((a, b) => flightTimestamp(a) - flightTimestamp(b));
  if (upcoming[0]) return upcoming[0];

  return active.sort((a, b) => flightTimestamp(b) - flightTimestamp(a))[0] ?? null;
}

export function selectFeaturedHotelItem(
  hotels: HotelDisplayItem[],
  today: string,
): HotelDisplayItem | null {
  const dated = [...hotels].sort((a, b) =>
    (a.checkInDate ?? "").localeCompare(b.checkInDate ?? ""),
  );
  return dated.find(
    (hotel) =>
      hotel.checkInDate !== null &&
      hotel.checkOutDate !== null &&
      hotel.checkInDate <= today &&
      hotel.checkOutDate >= today,
  ) ?? dated.find(
    (hotel) => hotel.checkInDate !== null && hotel.checkInDate > today,
  ) ?? dated.at(-1) ?? null;
}

export function selectFeaturedFlightItem(
  flights: FlightDisplayItem[],
  now: Date,
): FlightDisplayItem | null {
  const upcoming = flights
    .filter((flight) => displayFlightTimestamp(flight) >= now.getTime())
    .sort((a, b) => displayFlightTimestamp(a) - displayFlightTimestamp(b));
  if (upcoming[0]) return upcoming[0];

  return [...flights]
    .sort((a, b) => displayFlightTimestamp(b) - displayFlightTimestamp(a))[0] ?? null;
}

export function validateHotelStay(checkInDate: string, checkOutDate: string) {
  if (checkOutDate < checkInDate) {
    return {
      ok: false as const,
      message: "Check-out date must be on or after check-in date.",
    };
  }
  return { ok: true as const };
}
