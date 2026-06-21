"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Bed, ChevronLeft, MapPin, Plane } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createPlace } from "@/lib/actions/places";
import { createTripFlight, createTripHotel } from "@/lib/actions/trip-logistics";
import { tripKeys } from "@/lib/db/query-keys";
import { flightInputSchema, hotelInputSchema, placeInputSchema } from "@/lib/utils/trip-logistics";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { IOSBottomSheet } from "@/components/ui/ios-bottom-sheet";

type AddType = "hotel" | "flight" | "place";

function ErrorMessage({ message }: { message?: string }) {
  return message ? <p className="text-sm font-semibold text-[var(--danger)]">{message}</p> : null;
}

function HotelForm({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof hotelInputSchema>>({
    resolver: zodResolver(hotelInputSchema),
    defaultValues: { name: "", location: "", checkInDate: "", checkOutDate: "", notes: "" },
  });

  return (
    <form className="grid gap-4" onSubmit={handleSubmit((values) => {
      setServerError(null);
      startTransition(async () => {
        try {
          const formData = new FormData();
          formData.set("name", values.name);
          formData.set("location", values.location);
          formData.set("check_in_date", values.checkInDate);
          formData.set("check_out_date", values.checkOutDate);
          formData.set("notes", values.notes);
          await createTripHotel(tripId, formData);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: tripKeys.places(tripId) }),
            queryClient.invalidateQueries({ queryKey: tripKeys.hotels(tripId) }),
            queryClient.invalidateQueries({ queryKey: tripKeys.overview(tripId) }),
          ]);
          onDone();
        } catch (error) {
          setServerError(error instanceof Error ? error.message : "Could not add hotel.");
        }
      });
    })}>
      <Field label="Hotel name"><Input {...register("name")} /></Field>
      <ErrorMessage message={errors.name?.message} />
      <Field label="Location/address"><Input {...register("location")} /></Field>
      <ErrorMessage message={errors.location?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Check-in date"><Input type="date" lang="en-GB" {...register("checkInDate")} /></Field>
        <Field label="Check-out date"><Input type="date" lang="en-GB" {...register("checkOutDate")} /></Field>
      </div>
      <ErrorMessage message={errors.checkInDate?.message ?? errors.checkOutDate?.message} />
      <Field label="Notes"><Textarea {...register("notes")} /></Field>
      <ErrorMessage message={serverError ?? undefined} />
      <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Add Hotel"}</Button>
    </form>
  );
}

function FlightForm({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof flightInputSchema>>({
    resolver: zodResolver(flightInputSchema),
    defaultValues: {
      flightNumber: "", flightDate: "", flightTime: "", passengerName: "",
      departure: "", arrival: "", notes: "",
    },
  });

  return (
    <form className="grid gap-4" onSubmit={handleSubmit((values) => {
      setServerError(null);
      startTransition(async () => {
        try {
          const formData = new FormData();
          formData.set("flight_number", values.flightNumber);
          formData.set("flight_date", values.flightDate);
          formData.set("flight_time", values.flightTime);
          formData.set("passenger_name", values.passengerName);
          formData.set("departure", values.departure);
          formData.set("arrival", values.arrival);
          formData.set("notes", values.notes);
          await createTripFlight(tripId, formData);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: tripKeys.places(tripId) }),
            queryClient.invalidateQueries({ queryKey: tripKeys.flights(tripId) }),
            queryClient.invalidateQueries({ queryKey: tripKeys.overview(tripId) }),
          ]);
          onDone();
        } catch (error) {
          setServerError(error instanceof Error ? error.message : "Could not add flight.");
        }
      });
    })}>
      <Field label="Flight number"><Input {...register("flightNumber")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Flight date"><Input type="date" lang="en-GB" {...register("flightDate")} /></Field>
        <Field label="Flight time"><Input type="time" {...register("flightTime")} /></Field>
      </div>
      <Field label="Passenger/person name"><Input {...register("passengerName")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Departure"><Input {...register("departure")} /></Field>
        <Field label="Arrival"><Input {...register("arrival")} /></Field>
      </div>
      <Field label="Notes"><Textarea {...register("notes")} /></Field>
      <ErrorMessage message={Object.values(errors)[0]?.message ?? serverError ?? undefined} />
      <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Add Flight"}</Button>
    </form>
  );
}

function PlaceForm({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof placeInputSchema>>({
    resolver: zodResolver(placeInputSchema),
    defaultValues: { name: "", location: "", plannedDate: "", plannedTime: "", notes: "" },
  });

  return (
    <form className="grid gap-4" onSubmit={handleSubmit((values) => {
      setServerError(null);
      startTransition(async () => {
        try {
          const formData = new FormData();
          formData.set("name", values.name);
          formData.set("area", values.location);
          formData.set("type", "attraction");
          formData.set("priority", "nice-to-have");
          formData.set("planned_date", values.plannedDate);
          formData.set("planned_time", values.plannedTime);
          formData.set("notes", values.notes);
          await createPlace(tripId, formData);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: tripKeys.places(tripId) }),
            queryClient.invalidateQueries({ queryKey: tripKeys.overview(tripId) }),
          ]);
          onDone();
        } catch (error) {
          setServerError(error instanceof Error ? error.message : "Could not add place.");
        }
      });
    })}>
      <Field label="Place name"><Input {...register("name")} /></Field>
      <Field label="Location/address"><Input {...register("location")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Optional date"><Input type="date" lang="en-GB" {...register("plannedDate")} /></Field>
        <Field label="Optional time"><Input type="time" {...register("plannedTime")} /></Field>
      </div>
      <Field label="Notes"><Textarea {...register("notes")} /></Field>
      <ErrorMessage message={Object.values(errors)[0]?.message ?? serverError ?? undefined} />
      <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Add Place"}</Button>
    </form>
  );
}

export function PlacesAddSheet({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [addType, setAddType] = useState<AddType | null>(null);

  function close() {
    setOpen(false);
    setAddType(null);
  }

  const title = addType ? `Add ${addType[0].toUpperCase()}${addType.slice(1)}` : "Add to trip";

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>+ Add</Button>
      <IOSBottomSheet open={open} title={title} onClose={close}>
        {addType ? (
          <div className="grid gap-4">
            <button type="button" className="ios-pressable inline-flex min-h-11 w-fit items-center gap-1 rounded-full px-2 text-sm font-semibold text-[var(--muted-foreground)]" onClick={() => setAddType(null)}>
              <ChevronLeft size={17} /> Choose another type
            </button>
            {addType === "hotel" ? <HotelForm tripId={tripId} onDone={close} /> : null}
            {addType === "flight" ? <FlightForm tripId={tripId} onDone={close} /> : null}
            {addType === "place" ? <PlaceForm tripId={tripId} onDone={close} /> : null}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { type: "hotel" as const, label: "Add Hotel", icon: Bed },
              { type: "flight" as const, label: "Add Flight", icon: Plane },
              { type: "place" as const, label: "Add Place", icon: MapPin },
            ].map(({ type, label, icon: Icon }) => (
              <button key={type} type="button" aria-label={label} onClick={() => setAddType(type)} className="ios-pressable grid min-h-28 place-items-center content-center gap-2 rounded-[22px] border border-[var(--border)] bg-[var(--muted)] p-3">
                <Icon size={22} className="text-[var(--primary)]" />
                <span className="text-sm font-bold">{label}</span>
              </button>
            ))}
          </div>
        )}
      </IOSBottomSheet>
    </>
  );
}
