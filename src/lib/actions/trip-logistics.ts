"use server";

import { revalidatePath } from "next/cache";
import { throwSafeActionError } from "@/lib/actions/action-errors";
import { authedAdminClient, value } from "@/lib/actions/helpers";
import { flightInputSchema, hotelInputSchema } from "@/lib/utils/trip-logistics";

export async function createTripHotel(tripId: string, formData: FormData) {
  const input = hotelInputSchema.parse({
    name: value(formData, "name"),
    location: value(formData, "location"),
    checkInDate: value(formData, "check_in_date"),
    checkOutDate: value(formData, "check_out_date"),
    notes: value(formData, "notes"),
  });
  const supabase = await authedAdminClient();
  const { error } = await supabase.rpc("create_trip_hotel", {
    p_trip_id: tripId,
    p_name: input.name,
    p_location: input.location,
    p_check_in_date: input.checkInDate,
    p_check_out_date: input.checkOutDate,
    p_notes: input.notes || null,
  });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}/places`);
  revalidatePath(`/trips/${tripId}/overview`);
}

export async function createTripFlight(tripId: string, formData: FormData) {
  const input = flightInputSchema.parse({
    flightNumber: value(formData, "flight_number"),
    flightDate: value(formData, "flight_date"),
    flightTime: value(formData, "flight_time"),
    passengerName: value(formData, "passenger_name"),
    departure: value(formData, "departure"),
    arrival: value(formData, "arrival"),
    notes: value(formData, "notes"),
  });
  const supabase = await authedAdminClient();
  const { error } = await supabase.rpc("create_trip_flight", {
    p_trip_id: tripId,
    p_flight_number: input.flightNumber,
    p_flight_date: input.flightDate,
    p_flight_time: input.flightTime,
    p_passenger_name: input.passengerName,
    p_departure: input.departure,
    p_arrival: input.arrival,
    p_notes: input.notes || null,
  });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}/places`);
  revalidatePath(`/trips/${tripId}/overview`);
}

export async function softDeleteTripHotel(tripId: string, hotelId: string) {
  const supabase = await authedAdminClient();
  const { error } = await supabase.rpc("soft_delete_trip_hotel", { p_hotel_id: hotelId });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}/places`);
  revalidatePath(`/trips/${tripId}/overview`);
}

export async function softDeleteTripFlight(tripId: string, flightId: string) {
  const supabase = await authedAdminClient();
  const { error } = await supabase.rpc("soft_delete_trip_flight", { p_flight_id: flightId });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}/places`);
  revalidatePath(`/trips/${tripId}/overview`);
}
