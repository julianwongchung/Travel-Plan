"use client";

import { useState } from "react";
import { Bed, CalendarDays, ChevronRight, MapPin, Plane, UserRound } from "lucide-react";
import type { TripFlight, TripHotel } from "@/lib/db/types";
import { formatDisplayDate } from "@/lib/utils/date-format";
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

function FlightDetails({ flights }: { flights: FlightDisplayItem[] }) {
  if (!flights.length) {
    return (
      <div className="rounded-[20px] border border-dashed border-[var(--border)] p-6 text-center text-sm font-medium text-[var(--muted-foreground)]">
        No flight added yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {flights.map((flight) => (
        <article
          key={flight.id}
          className="rounded-[20px] border border-[var(--border)] bg-[var(--card-strong)] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">{flight.flightNumber}</h3>
            <span className="text-sm font-semibold text-[var(--primary)]">
              {formatDate(flight.flightDate)} - {formatTime(flight.flightTime)}
            </span>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm">
            <UserRound size={16} />
            {flight.passengerName}
          </p>
          <p className="mt-2 break-words text-sm text-[var(--muted-foreground)]">
            {flight.departure || "Departure not set"} to {flight.arrival || "Arrival not set"}
          </p>
          {flight.notes ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{flight.notes}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function TripLogisticsSummary({
  hotels,
  legacyHotels,
  planHotels = [],
  flights,
  planFlights = [],
}: {
  tripId: string;
  hotels: TripHotel[];
  legacyHotels: HotelDisplayItem[];
  planHotels?: HotelDisplayItem[];
  flights: TripFlight[];
  planFlights?: FlightDisplayItem[];
  today?: string;
  now?: string;
}) {
  const [sheet, setSheet] = useState<"hotels" | "flights" | null>(null);
  const allHotels = [...normalizeHotels(hotels), ...legacyHotels, ...planHotels];
  const allFlights = [...normalizeFlights(flights), ...planFlights];

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
            className="ios-pressable relative flex h-full w-full min-w-0 flex-col items-start p-3 text-left sm:p-4"
          >
            <span
              data-logistics-icon
              className="grid size-8 place-items-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300"
            >
              <Bed size={16} />
            </span>
            <span className="mt-2 min-w-0">
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-violet-600 dark:text-violet-300">
                HOTELS
              </span>
              <span className="mt-1 block text-lg font-extrabold leading-tight tracking-[-0.03em] text-slate-950 dark:text-white sm:text-xl">
                {allHotels.length} {allHotels.length === 1 ? "hotel" : "hotels"}
              </span>
            </span>
            <ChevronRight className="absolute bottom-3 right-3 text-slate-500 dark:text-slate-300" size={15} />
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
            className="ios-pressable relative flex h-full w-full min-w-0 flex-col items-start p-3 text-left sm:p-4"
          >
            <span
              data-logistics-icon
              className="grid size-8 place-items-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300"
            >
              <Plane size={16} />
            </span>
            <span className="mt-2 min-w-0">
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">
                FLIGHTS
              </span>
              <span className="mt-1 block text-lg font-extrabold leading-tight tracking-[-0.03em] text-slate-950 dark:text-white sm:text-xl">
                {allFlights.length} {allFlights.length === 1 ? "flight" : "flights"}
              </span>
            </span>
            <ChevronRight className="absolute bottom-3 right-3 text-slate-500 dark:text-slate-300" size={15} />
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
        <FlightDetails flights={allFlights} />
      </IOSModal>
    </>
  );
}
