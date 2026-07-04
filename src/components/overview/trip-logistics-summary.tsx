"use client";

import { useState } from "react";
import { Bed, CalendarDays, ChevronRight, MapPin, Plane, UserRound } from "lucide-react";
import type { Traveler, TripFlight, TripHotel } from "@/lib/db/types";
import { formatDisplayDate, formatDisplayDateAndTime } from "@/lib/utils/date-format";
import { passengerColors, type PassengerColor } from "@/lib/utils/traveler-colors";
import {
  normalizeFlights,
  normalizeHotels,
  type FlightDisplayItem,
  type HotelDisplayItem,
} from "@/lib/utils/trip-logistics";
import { IOSModal } from "@/components/ui/ios-modal";

function formatDate(date: string | null) {
  return formatDisplayDate(date);
}

function formatTime(time: string) {
  const [hour = "", minute = ""] = time.split(":");
  return hour && minute ? `${hour.padStart(2, "0")}:${minute}` : time;
}

function compactDateTime(date: string, time: string) {
  return formatDisplayDateAndTime(date, time, "");
}

function dateOrdinal(date: string | null | undefined) {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;

  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86_400_000;
}

function timeMinutes(time: string | null | undefined) {
  const [hour = "", minute = ""] = (time ?? "").split(":");
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);
  return Number.isFinite(parsedHour) && Number.isFinite(parsedMinute)
    ? parsedHour * 60 + parsedMinute
    : 0;
}

function dateTimeSortValue(date: string | null | undefined, time?: string | null) {
  const ordinal = dateOrdinal(date);
  return ordinal === null ? Number.POSITIVE_INFINITY : ordinal * 1_440 + timeMinutes(time);
}

function flightSortValue(flight: FlightDisplayItem) {
  const firstSegment = flight.segments?.[0] ?? null;
  return dateTimeSortValue(
    firstSegment?.departureDate ?? flight.flightDate,
    firstSegment?.departureTime ?? flight.flightTime,
  );
}

function passengerNames(value: string) {
  return value.split(/[,/&]+|\band\b/i).map((name) => name.trim()).filter(Boolean);
}

function PassengerChips({ passengers }: { passengers: PassengerColor[] }) {
  if (!passengers.length) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
        <UserRound size={13} />
        Passenger not set
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {passengers.map((passenger) => (
        <span
          key={passenger.name}
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold"
          style={{
            backgroundColor: passenger.color.soft,
            borderColor: passenger.color.border,
            color: passenger.color.text,
          }}
        >
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full"
            style={{ backgroundColor: passenger.color.accent }}
          />
          {passenger.name}
        </span>
      ))}
    </div>
  );
}

function flightTripDirection(
  flight: FlightDisplayItem,
  tripStartDate: string | null | undefined,
  tripEndDate: string | null | undefined,
) {
  const firstFlightDate = flight.segments?.[0]?.departureDate ?? flight.flightDate;
  const flightDate = dateOrdinal(firstFlightDate);
  const startDate = dateOrdinal(tripStartDate);
  const endDate = dateOrdinal(tripEndDate);

  if (flightDate === null || startDate === null || endDate === null) {
    return "Flight";
  }

  const midpoint = startDate + (endDate - startDate) / 2;
  return flightDate <= midpoint ? "Departure" : "Return";
}

function HotelDetails({ hotels }: { hotels: HotelDisplayItem[] }) {
  return (
    <div className="grid gap-3">
      {hotels.map((hotel) => (
        <article
          key={hotel.id}
          className="rounded-[20px] border border-[var(--border)] bg-[var(--card-strong)] p-4"
        >
          <h3 className="break-words font-bold">{hotel.name}</h3>
          <p className="mt-2 flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            {hotel.location || "Location not set"}
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
            <CalendarDays size={16} className="mt-0.5 shrink-0" />
            Check-in: {formatDate(hotel.checkInDate)}
          </p>
          {hotel.notes ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{hotel.notes}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function FlightDetails({
  flights,
  tripStartDate,
  tripEndDate,
  travelers,
}: {
  flights: FlightDisplayItem[];
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  travelers: Pick<Traveler, "id" | "name" | "created_at">[];
}) {
  if (!flights.length) {
    return (
      <div className="rounded-[20px] border border-dashed border-[var(--border)] p-6 text-center text-sm font-medium text-[var(--muted-foreground)]">
        No flight added yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {flights.map((flight) => {
        const firstSegment = flight.segments?.[0] ?? null;
        const lastSegment = flight.segments?.at(-1) ?? null;
        const departureLabel = firstSegment
          ? `${firstSegment.origin} / ${compactDateTime(firstSegment.departureDate, firstSegment.departureTime)}`
          : `${flight.departure || "Departure not set"} / ${formatDate(flight.flightDate)} ${formatTime(flight.flightTime)}`;
        const arrivalLabel = lastSegment
          ? `${lastSegment.destination} / ${compactDateTime(lastSegment.arrivalDate, lastSegment.arrivalTime)}`
          : (flight.arrival || "Arrival not set");
        const direction = flightTripDirection(flight, tripStartDate, tripEndDate);
        const flightPassengers = passengerColors(passengerNames(flight.passengerName), travelers);

        return (
          <article
            key={flight.id}
            className="rounded-[20px] border border-[var(--border)] bg-[var(--card-strong)] p-4"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <h3 className="min-w-0 break-words font-bold">{flight.flightNumber}</h3>
              <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-700 dark:bg-blue-400/15 dark:text-blue-200">
                {direction}
              </span>
            </div>
            <div className="mt-3">
              <PassengerChips passengers={flightPassengers} />
            </div>

            <div className="mt-3 overflow-hidden rounded-[16px] border border-blue-100 bg-blue-50/70 dark:border-blue-400/15 dark:bg-blue-400/10">
              <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-3 border-b border-blue-100/80 px-3 py-2.5 text-sm dark:border-blue-400/15">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">Depart</span>
                <span className="min-w-0 break-words font-semibold text-[var(--foreground)]">{departureLabel}</span>
              </div>
              <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-3 px-3 py-2.5 text-sm">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">Arrive</span>
                <span className="min-w-0 break-words font-semibold text-[var(--foreground)]">{arrivalLabel}</span>
              </div>
            </div>

            {flight.segments && flight.segments.length > 1 ? (
              <p className="mt-2 text-xs font-semibold text-[var(--muted-foreground)]">
                {flight.segments.length - 1} connection{flight.segments.length - 1 === 1 ? "" : "s"}
              </p>
            ) : null}

            {flight.notes ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{flight.notes}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function TripLogisticsSummary({
  hotels,
  legacyHotels,
  planHotels = [],
  flights,
  planFlights = [],
  tripStartDate,
  tripEndDate,
  travelers = [],
}: {
  tripId: string;
  hotels: TripHotel[];
  legacyHotels: HotelDisplayItem[];
  planHotels?: HotelDisplayItem[];
  flights: TripFlight[];
  planFlights?: FlightDisplayItem[];
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  travelers?: Pick<Traveler, "id" | "name" | "created_at">[];
  today?: string;
  now?: string;
}) {
  const [sheet, setSheet] = useState<"hotels" | "flights" | null>(null);
  const allHotels = [...normalizeHotels(hotels), ...legacyHotels, ...planHotels]
    .sort((first, second) => (
      dateTimeSortValue(first.checkInDate) - dateTimeSortValue(second.checkInDate)
    ));
  const allFlights = [...normalizeFlights(flights), ...planFlights]
    .sort((first, second) => flightSortValue(first) - flightSortValue(second));

  return (
    <>
      <div
        data-logistics-summary
        className="mx-auto grid w-full max-w-sm min-w-0 grid-cols-2 gap-3"
      >
        <div
          data-logistics-tile
          className="aspect-square overflow-hidden rounded-[14px] border border-slate-100 bg-white p-0 shadow-sm dark:border-white/10 dark:bg-[var(--card-strong)]"
        >
          <button
            type="button"
            aria-label="View all hotels"
            onClick={() => setSheet("hotels")}
            className="ios-pressable relative flex h-full w-full min-w-0 flex-col items-center justify-center p-3 text-center sm:p-4"
          >
            <span
              data-logistics-icon
              className="grid size-10 place-items-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300"
            >
              <Bed size={18} />
            </span>
            <span className="mt-3 min-w-0">
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-300">
                HOTELS
              </span>
              <span className="mt-1.5 block text-xl font-extrabold leading-tight tracking-[-0.03em] text-slate-950 dark:text-white sm:text-2xl">
                {allHotels.length} {allHotels.length === 1 ? "hotel" : "hotels"}
              </span>
            </span>
            <ChevronRight className="absolute bottom-3.5 right-3.5 text-slate-500 dark:text-slate-300" size={15} />
          </button>
        </div>

        <div
          data-logistics-tile
          className="aspect-square overflow-hidden rounded-[14px] border border-slate-100 bg-white p-0 shadow-sm dark:border-white/10 dark:bg-[var(--card-strong)]"
        >
          <button
            type="button"
            aria-label="View all flights"
            onClick={() => setSheet("flights")}
            className="ios-pressable relative flex h-full w-full min-w-0 flex-col items-center justify-center p-3 text-center sm:p-4"
          >
            <span
              data-logistics-icon
              className="grid size-10 place-items-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300"
            >
              <Plane size={18} />
            </span>
            <span className="mt-3 min-w-0">
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">
                FLIGHTS
              </span>
              <span className="mt-1.5 block text-xl font-extrabold leading-tight tracking-[-0.03em] text-slate-950 dark:text-white sm:text-2xl">
                {allFlights.length} {allFlights.length === 1 ? "flight" : "flights"}
              </span>
            </span>
            <ChevronRight className="absolute bottom-3.5 right-3.5 text-slate-500 dark:text-slate-300" size={15} />
          </button>
        </div>
      </div>

      <IOSModal open={sheet === "hotels"} title="All hotels" onClose={() => setSheet(null)}>
        {allHotels.length ? (
          <HotelDetails hotels={allHotels} />
        ) : (
          <div className="rounded-[20px] border border-dashed border-[var(--border)] p-6 text-center text-sm font-medium text-[var(--muted-foreground)]">
            No hotel added yet.
          </div>
        )}
      </IOSModal>
      <IOSModal open={sheet === "flights"} title="All flights" onClose={() => setSheet(null)}>
        <FlightDetails
          flights={allFlights}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          travelers={travelers}
        />
      </IOSModal>
    </>
  );
}
