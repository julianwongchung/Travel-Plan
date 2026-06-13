"use client";

import { useState } from "react";
import { Bed, CalendarDays, ChevronRight, MapPin, Plane, UserRound } from "lucide-react";
import type { TripFlight, TripHotel } from "@/lib/db/types";
import {
  normalizeFlights,
  normalizeHotels,
  selectFeaturedFlightItem,
  selectFeaturedHotelItem,
  type FlightDisplayItem,
  type HotelDisplayItem,
} from "@/lib/utils/trip-logistics";
import { GlassCard } from "@/components/ui/glass-card";
import { IOSBottomSheet } from "@/components/ui/ios-bottom-sheet";

function formatDate(date: string | null) {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hour, minute));
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
            {formatDate(hotel.checkInDate)} - {formatDate(hotel.checkOutDate)}
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
  today,
  now,
}: {
  tripId: string;
  hotels: TripHotel[];
  legacyHotels: HotelDisplayItem[];
  planHotels?: HotelDisplayItem[];
  flights: TripFlight[];
  planFlights?: FlightDisplayItem[];
  today: string;
  now: string;
}) {
  const [sheet, setSheet] = useState<"hotels" | "flights" | null>(null);
  const allHotels = [...normalizeHotels(hotels), ...legacyHotels, ...planHotels];
  const allFlights = [...normalizeFlights(flights), ...planFlights];
  const featuredHotel = selectFeaturedHotelItem(allHotels, today);
  const featuredFlight = selectFeaturedFlightItem(allFlights, new Date(now));

  return (
    <>
      <div
        data-logistics-summary
        className="mx-auto grid w-full max-w-xl min-w-0 grid-cols-2 gap-3 sm:gap-4"
      >
        <GlassCard
          data-logistics-tile
          className="aspect-square overflow-hidden border-violet-300/35 bg-violet-500/[0.06] p-0 dark:border-violet-400/20"
        >
          <button
            type="button"
            aria-label="View all hotels"
            onClick={() => setSheet("hotels")}
            className="ios-pressable relative flex h-full w-full min-w-0 flex-col p-3 text-left sm:p-4"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-300 sm:text-sm">
                <Bed size={16} /> Hotels
              </span>
              <span className="mt-2 block text-xl font-extrabold sm:mt-3 sm:text-2xl">
                {allHotels.length} {allHotels.length === 1 ? "hotel" : "hotels"}
              </span>
              {featuredHotel ? (
                <>
                  <span className="mt-1.5 line-clamp-2 break-words text-xs font-bold leading-4 sm:mt-2 sm:text-sm sm:leading-5">
                    {featuredHotel.name}
                  </span>
                  <span className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--muted-foreground)] sm:text-xs">
                    {formatDate(featuredHotel.checkInDate)} - {formatDate(featuredHotel.checkOutDate)}
                  </span>
                </>
              ) : (
                <span className="mt-1.5 block text-xs leading-4 text-[var(--muted-foreground)] sm:mt-2 sm:text-sm">
                  No hotel added yet
                </span>
              )}
            </span>
            <ChevronRight className="absolute bottom-3 right-3 text-violet-500 sm:bottom-4 sm:right-4" size={17} />
          </button>
        </GlassCard>

        <GlassCard
          data-logistics-tile
          className="aspect-square overflow-hidden border-blue-300/35 bg-blue-500/[0.06] p-0 dark:border-blue-400/20"
        >
          <button
            type="button"
            aria-label="View all flights"
            onClick={() => setSheet("flights")}
            className="ios-pressable relative flex h-full w-full min-w-0 flex-col p-3 text-left sm:p-4"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-300 sm:text-sm">
                <Plane size={16} /> Flights
              </span>
              <span className="mt-2 block text-xl font-extrabold sm:mt-3 sm:text-2xl">
                {allFlights.length} {allFlights.length === 1 ? "flight" : "flights"}
              </span>
              {featuredFlight ? (
                <>
                  <span className="mt-1.5 line-clamp-2 break-words text-xs font-bold leading-4 sm:mt-2 sm:text-sm sm:leading-5">
                    {formatTime(featuredFlight.flightTime)} - {featuredFlight.flightNumber}
                  </span>
                  <span className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--muted-foreground)] sm:text-xs">
                    {featuredFlight.passengerName}
                  </span>
                </>
              ) : (
                <span className="mt-1.5 block text-xs leading-4 text-[var(--muted-foreground)] sm:mt-2 sm:text-sm">
                  No flight added yet
                </span>
              )}
            </span>
            <ChevronRight className="absolute bottom-3 right-3 text-blue-500 sm:bottom-4 sm:right-4" size={17} />
          </button>
        </GlassCard>
      </div>

      <IOSBottomSheet open={sheet === "hotels"} title="All hotels" onClose={() => setSheet(null)}>
        {allHotels.length ? (
          <HotelDetails hotels={allHotels} />
        ) : (
          <div className="rounded-[20px] border border-dashed border-[var(--border)] p-6 text-center text-sm font-medium text-[var(--muted-foreground)]">
            No hotel added yet.
          </div>
        )}
      </IOSBottomSheet>
      <IOSBottomSheet open={sheet === "flights"} title="All flights" onClose={() => setSheet(null)}>
        <FlightDetails flights={allFlights} />
      </IOSBottomSheet>
    </>
  );
}
