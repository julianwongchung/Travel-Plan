"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { actionValidationError, throwSafeActionError } from "@/lib/actions/action-errors";
import { authedClient, nullable, value } from "@/lib/actions/helpers";
import type { Currency } from "@/lib/db/types";
import { getCurrencyForCountry } from "@/lib/utils/country-currency";
import { validateTripCreationDates } from "@/lib/utils/trip-days";
import { generateGoogleMapsLink } from "@/lib/utils/google-maps";
import { buildScheduleItemPlan, type FlightPlanSegment } from "@/lib/utils/schedule-item-plan";
import { parseTravelerNames } from "@/lib/utils/travelers";

const currencySchema = z.enum(["MYR", "SGD", "USD", "VND", "THB", "IDR", "PHP", "JPY", "KRW", "TWD", "HKD"]);
const schedulePlanInputSchema = z.discriminatedUnion("planType", [
  z.object({
    planType: z.literal("flight"),
    segments: z.array(z.object({
      origin: z.string().trim().min(1, "Origin is required."),
      destination: z.string().trim().min(1, "Destination is required."),
      departureDate: z.string().trim().min(1, "Departure date is required."),
      departureTime: z.string().trim().min(1, "Departure time is required."),
      arrivalDate: z.string().trim().min(1, "Arrival date is required."),
      arrivalTime: z.string().trim().min(1, "Arrival time is required."),
    })).min(1).max(6),
    passengers: z.array(z.string().trim().min(1, "Passenger is required.")).min(1, "Select at least one passenger."),
    notes: z.string().trim().nullable(),
  }),
  z.object({
    planType: z.literal("hotel"),
    hotelName: z.string().trim().min(1, "Hotel name is required."),
    checkIn: z.string().trim().nullable(),
    checkOut: z.string().trim().nullable(),
    notes: z.string().trim().nullable(),
  }),
  z.object({
    planType: z.literal("place"),
    placeName: z.string().trim().min(1, "Place name is required."),
    placeTime: z.string().trim().nullable(),
    notes: z.string().trim().nullable(),
  }),
]);

function splitDateTimeLocal(value: string) {
  const [date = "", timeWithSeconds = ""] = value.split("T");
  const [hour = "", minute = ""] = timeWithSeconds.split(":");
  const time = hour && minute ? `${hour}:${minute}` : timeWithSeconds;
  return { date, time };
}

function flightSegmentsFromFormData(formData: FormData): FlightPlanSegment[] {
  const count = Number(value(formData, "flight_segment_count", "1"));
  const segmentCount = Number.isFinite(count) ? Math.min(Math.max(count, 1), 6) : 1;
  return Array.from({ length: segmentCount }, (_, index) => ({
    origin: value(formData, `flight_segments.${index}.origin`),
    destination: value(formData, `flight_segments.${index}.destination`),
    departureDate: splitDateTimeLocal(value(formData, `flight_segments.${index}.departure_at`)).date
      || value(formData, `flight_segments.${index}.departure_date`),
    departureTime: splitDateTimeLocal(value(formData, `flight_segments.${index}.departure_at`)).time
      || value(formData, `flight_segments.${index}.departure_time`),
    arrivalDate: splitDateTimeLocal(value(formData, `flight_segments.${index}.arrival_at`)).date
      || value(formData, `flight_segments.${index}.arrival_date`),
    arrivalTime: splitDateTimeLocal(value(formData, `flight_segments.${index}.arrival_at`)).time
      || value(formData, `flight_segments.${index}.arrival_time`),
  }));
}

function flightPassengersFromFormData(formData: FormData) {
  const selectedPassengers = formData
    .getAll("flight_passenger_names")
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
  const manualPassenger = value(formData, "flight_passenger_name");
  return selectedPassengers.length ? selectedPassengers : [manualPassenger].filter(Boolean);
}

function schedulePlanInputFromFormData(formData: FormData) {
  const planType = value(formData, "plan_type");
  const commonNotes = nullable(formData, "plan_notes");

  if (planType === "flight") {
    return schedulePlanInputSchema.parse({
      planType,
      segments: flightSegmentsFromFormData(formData),
      passengers: flightPassengersFromFormData(formData),
      notes: nullable(formData, "flight_notes"),
    });
  }

  if (planType === "hotel") {
    return schedulePlanInputSchema.parse({
      planType,
      hotelName: value(formData, "hotel_name"),
      checkIn: nullable(formData, "check_in"),
      checkOut: nullable(formData, "check_out"),
      notes: commonNotes,
    });
  }

  if (planType === "place") {
    return schedulePlanInputSchema.parse({
      planType,
      placeName: value(formData, "place_name"),
      placeTime: nullable(formData, "place_time"),
      notes: commonNotes,
    });
  }

  throw new Error("Unsupported plan type.");
}

async function createTripRecord(formData: FormData) {
  const supabase = await authedClient();
  const selectedCountry = nullable(formData, "country");
  const defaultCurrency = selectedCountry
    ? getCurrencyForCountry(selectedCountry)
    : currencySchema.parse(value(formData, "default_currency", "MYR"));
  const travelerNames = parseTravelerNames(value(formData, "travelers"));
  const startDate = nullable(formData, "start_date");
  const endDate = nullable(formData, "end_date");
  const dateValidation = validateTripCreationDates(startDate, endDate);
  if (!dateValidation.ok) throw actionValidationError(dateValidation.message);
  const { data, error } = await supabase.rpc("create_trip_with_travelers", {
    p_name: value(formData, "name", "New Trip"),
    p_start_date: startDate,
    p_end_date: endDate,
    p_default_currency: defaultCurrency as Currency,
    p_traveler_names: travelerNames,
  });

  if (error) throwSafeActionError(error);
  revalidatePath("/trips");
  return data as string;
}

export async function createTrip(formData: FormData) {
  const tripId = await createTripRecord(formData);
  redirect(`/trips/${tripId}/overview`);
}

export async function createTripFromModal(formData: FormData) {
  return createTripRecord(formData);
}

export async function updateTrip(tripId: string, formData: FormData) {
  const supabase = await authedClient();
  const defaultCurrency = currencySchema.parse(value(formData, "default_currency", "MYR"));
  const startDate = nullable(formData, "start_date");
  const endDate = nullable(formData, "end_date");
  const dateValidation = validateTripCreationDates(startDate, endDate);
  if (!dateValidation.ok) throw actionValidationError(dateValidation.message);
  const { error } = await supabase.rpc("update_trip", {
    p_trip_id: tripId,
    p_name: value(formData, "name"),
    p_start_date: startDate,
    p_end_date: endDate,
    p_default_currency: defaultCurrency as Currency,
  });

  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

export async function completeTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("complete_trip", { p_trip_id: tripId });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

export async function archiveTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("archive_trip", { p_trip_id: tripId });
  if (error) throwSafeActionError(error);
  revalidatePath("/trips");
  redirect("/trips");
}

export async function restoreArchivedTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("restore_archived_trip", { p_trip_id: tripId });
  if (error) throwSafeActionError(error);
  revalidatePath("/trips");
}

export async function softDeleteTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("soft_delete_trip", { p_trip_id: tripId });
  if (error) throwSafeActionError(error);
  revalidatePath("/trips");
  redirect("/trips");
}

export async function restoreDeletedTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("restore_deleted_trip", { p_trip_id: tripId });
  if (error) throwSafeActionError(error);
  revalidatePath("/trips");
}

export async function leaveTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("leave_trip", { p_trip_id: tripId });
  if (error) throwSafeActionError(error);
  revalidatePath("/trips");
  redirect("/trips");
}

export async function addTraveler(tripId: string, formData: FormData) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("add_traveler", {
    p_trip_id: tripId,
    p_name: value(formData, "name"),
  });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}`);
}

export async function addScheduleItem(tripId: string, formData: FormData) {
  const supabase = await authedClient();
  let tripDayId = nullable(formData, "trip_day_id");
  if (!tripDayId) {
    const tripDayDate = value(formData, "trip_day_date");
    const tripDayNumber = Number(value(formData, "trip_day_number"));
    const { data: ensuredTripDayId, error: tripDayError } = await supabase.rpc("ensure_trip_day", {
      p_trip_id: tripId,
      p_date: tripDayDate,
      p_day_number: Number.isFinite(tripDayNumber) ? tripDayNumber : null,
    });
    if (tripDayError) throwSafeActionError(tripDayError);
    tripDayId = ensuredTripDayId as string;
  }

  const planType = nullable(formData, "plan_type");
  let title: string;
  let timeBlock: string | null;
  let description: string | null;
  let transport: string | null;
  let notes: string | null;

  if (planType) {
    const plan = buildScheduleItemPlan(schedulePlanInputFromFormData(formData));
    title = plan.title;
    timeBlock = plan.timeBlock;
    description = plan.description;
    transport = plan.transport;
    notes = plan.notes;
  } else {
    title = value(formData, "title") || value(formData, "place_name");
    timeBlock = nullable(formData, "time_block");
    description = nullable(formData, "description");
    transport = nullable(formData, "transport");
    notes = nullable(formData, "google_map_link") ?? generateGoogleMapsLink(title);
  }

  const tripDayNumber = Number(value(formData, "trip_day_number"));
  const { error } = await supabase.rpc("create_schedule_item", {
    p_trip_id: tripId,
    p_trip_day_id: tripDayId,
    p_trip_day_date: nullable(formData, "trip_day_date"),
    p_trip_day_number: Number.isFinite(tripDayNumber) ? tripDayNumber : null,
    p_time_block: timeBlock,
    p_title: title,
    p_description: description,
    p_transport: transport,
    p_food: nullable(formData, "food"),
    p_notes: notes,
  });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}/overview`);
}

export async function removeScheduleItem(tripId: string, scheduleItemId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("delete_schedule_item", { p_schedule_item_id: scheduleItemId });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}/overview`);
  revalidatePath(`/trips/${tripId}/trip-plan`);
}

export async function updateFlightScheduleItem(tripId: string, scheduleItemId: string, formData: FormData) {
  const supabase = await authedClient();
  const plan = buildScheduleItemPlan(schedulePlanInputSchema.parse({
    planType: "flight",
    segments: flightSegmentsFromFormData(formData),
    passengers: flightPassengersFromFormData(formData),
    notes: nullable(formData, "flight_notes"),
  }));
  const { error } = await supabase.rpc("update_schedule_item", {
    p_schedule_item_id: scheduleItemId,
    p_time_block: plan.timeBlock,
    p_title: plan.title,
    p_description: plan.description,
    p_transport: plan.transport,
    p_food: null,
    p_notes: plan.notes,
  });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}/overview`);
  revalidatePath(`/trips/${tripId}/trip-plan`);
}

export async function updateScheduleItemPlan(tripId: string, scheduleItemId: string, formData: FormData) {
  const supabase = await authedClient();
  const plan = buildScheduleItemPlan(schedulePlanInputFromFormData(formData));
  const { error } = await supabase.rpc("update_schedule_item", {
    p_schedule_item_id: scheduleItemId,
    p_time_block: plan.timeBlock,
    p_title: plan.title,
    p_description: plan.description,
    p_transport: plan.transport,
    p_food: null,
    p_notes: plan.notes,
  });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}/overview`);
  revalidatePath(`/trips/${tripId}/trip-plan`);
}

export async function reorderScheduleItems(
  tripId: string,
  tripDayId: string,
  scheduleItemIds: string[],
) {
  const supabase = await authedClient();
  const orderedIds = z.array(z.string().uuid()).parse(scheduleItemIds);
  const { error } = await supabase.rpc("reorder_schedule_items", {
    p_trip_id: tripId,
    p_trip_day_id: tripDayId,
    p_schedule_item_ids: orderedIds,
  });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}/overview`);
  revalidatePath(`/trips/${tripId}/trip-plan`);
}
