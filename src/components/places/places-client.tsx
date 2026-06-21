"use client";

import type { FormEvent } from "react";
import { Bed, CalendarDays, ExternalLink, MapPin, Plane, RotateCcw, Star, Trash2, UserRound } from "lucide-react";
import { restorePlace, softDeletePlace } from "@/lib/actions/places";
import { softDeleteTripFlight, softDeleteTripHotel } from "@/lib/actions/trip-logistics";
import { useTripPlaces, type TripPlacesData } from "@/lib/db/client-queries";
import { formatDisplayDate } from "@/lib/utils/date-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { QueryStatusBanner } from "@/components/ui/query-status-banner";
import { PlacesAddSheet } from "@/components/places/places-add-sheet";
import { StatusBadge } from "@/components/ui/status-badge";

function shortDate(date: string) {
  return formatDisplayDate(date);
}

function confirmDeletePlaceItem(event: FormEvent<HTMLFormElement>) {
  if (!window.confirm("Delete this saved item? You can restore saved places later if needed.")) {
    event.preventDefault();
  }
}

export function PlacesClient({
  tripId,
  editable,
  initialData,
}: {
  tripId: string;
  editable: boolean;
  initialData: TripPlacesData;
}) {
  const placesQuery = useTripPlaces(tripId, initialData);
  const { data } = placesQuery;
  const activePlaces = data.places.filter((place) => !place.deleted_at);
  const savedCount = activePlaces.length + data.hotels.length + data.flights.length;

  return (
    <div className="page-enter grid min-w-0 gap-6 sm:gap-7">
      <IOSPageHeader
        eyebrow="Trip directory"
        title="Places"
        description="Hotels, flights, and saved locations are created and managed here."
        actions={<div className="flex items-center gap-2"><StatusBadge status={`${savedCount} saved`} />{editable ? <PlacesAddSheet tripId={tripId} /> : null}</div>}
      />

      <QueryStatusBanner
        isError={placesQuery.isError}
        isFetching={placesQuery.isFetching}
        onRetry={() => {
          void placesQuery.refetch();
        }}
      />

      {!editable ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--muted)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
          Read-only access. Mutation controls are hidden for viewers.
        </div>
      ) : null}

      {data.hotels.length ? (
        <section className="grid gap-3">
          <h2 className="px-1 text-lg font-bold">Hotels</h2>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {data.hotels.map((hotel) => (
              <Card key={hotel.id}>
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-[16px] bg-violet-500/10 text-violet-600"><Bed size={20} /></span><StatusBadge status="hotel" /></div>
                  <h3 className="mt-5 break-words text-xl font-bold">{hotel.name}</h3>
                  <p className="mt-2 flex items-start gap-2 text-sm text-[var(--muted-foreground)]"><MapPin size={16} className="mt-0.5 shrink-0" />{hotel.location}</p>
                  <p className="mt-2 flex items-start gap-2 text-sm text-[var(--muted-foreground)]"><CalendarDays size={16} className="mt-0.5 shrink-0" />{shortDate(hotel.check_in_date)} - {shortDate(hotel.check_out_date)}</p>
                  {hotel.notes ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{hotel.notes}</p> : null}
                  {editable ? <form className="mt-auto pt-5" action={softDeleteTripHotel.bind(null, tripId, hotel.id)} onSubmit={confirmDeletePlaceItem}><Button type="submit" variant="ghost" className="text-[var(--danger)]"><Trash2 size={16} />Delete</Button></form> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {data.flights.length ? (
        <section className="grid gap-3">
          <h2 className="px-1 text-lg font-bold">Flights</h2>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {data.flights.map((flight) => (
              <Card key={flight.id}>
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-[16px] bg-blue-500/10 text-blue-600"><Plane size={20} /></span><StatusBadge status="flight" /></div>
                  <h3 className="mt-5 text-xl font-bold">{flight.flight_number}</h3>
                  <p className="mt-2 text-sm font-semibold text-[var(--primary)]">{shortDate(flight.flight_date)} - {flight.flight_time.slice(0, 5)}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm"><UserRound size={16} />{flight.passenger_name}</p>
                  <p className="mt-2 break-words text-sm text-[var(--muted-foreground)]">{flight.departure} -&gt; {flight.arrival}</p>
                  {flight.notes ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{flight.notes}</p> : null}
                  {editable ? <form className="mt-auto pt-5" action={softDeleteTripFlight.bind(null, tripId, flight.id)} onSubmit={confirmDeletePlaceItem}><Button type="submit" variant="ghost" className="text-[var(--danger)]"><Trash2 size={16} />Delete</Button></form> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        <h2 className="px-1 text-lg font-bold">Saved places</h2>
        {data.places.length ? (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {data.places.map((place) => (
              <Card key={place.id} className={place.deleted_at ? "opacity-60" : undefined}>
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-[16px] bg-[var(--primary-soft)] text-[var(--primary)]"><MapPin size={20} /></span><StatusBadge status={place.type} /></div>
                  <h3 className="mt-5 break-words text-xl font-bold">{place.name}</h3>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{place.area || "Location not set"}</p>
                  {place.planned_date ? <p className="mt-2 text-sm font-semibold">{shortDate(place.planned_date)}{place.planned_time ? ` - ${place.planned_time.slice(0, 5)}` : ""}</p> : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {place.priority ? <StatusBadge status={place.priority} /> : null}
                    {place.rating ? <StatusBadge status={`${place.rating.toFixed(1)} / 5`} tone="warning" /> : null}
                    {place.deleted_at ? <StatusBadge status="deleted" /> : null}
                  </div>
                  {place.notes ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">{place.notes}</p> : null}
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    {place.google_map_link ? <a className="ios-pressable inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-strong)] px-4 text-sm font-semibold" href={place.google_map_link} target="_blank" rel="noreferrer"><ExternalLink size={16} />Open map</a> : null}
                    {place.rating ? <span className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-[var(--warning)]"><Star size={16} />{place.rating.toFixed(1)}</span> : null}
                    {editable && !place.deleted_at ? <form action={softDeletePlace.bind(null, tripId, place.id)} onSubmit={confirmDeletePlaceItem}><Button variant="ghost" type="submit" className="text-[var(--danger)]"><Trash2 size={16} />Delete</Button></form> : null}
                    {editable && place.deleted_at ? <form action={restorePlace.bind(null, tripId, place.id)}><Button variant="secondary" type="submit"><RotateCcw size={16} />Restore</Button></form> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-transparent shadow-none"><CardContent className="grid min-h-40 place-items-center text-center"><div><MapPin className="mx-auto text-[var(--primary)]" size={26} /><h3 className="mt-3 font-bold">No places saved yet</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">Use + Add to save the first location.</p></div></CardContent></Card>
        )}
      </section>
    </div>
  );
}
