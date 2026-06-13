"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authedClient, nullable, value } from "@/lib/actions/helpers";
import type { Currency } from "@/lib/db/types";
import { buildTripDateRange, validateTripCreationDates } from "@/lib/utils/trip-days";
import { generateGoogleMapsLink } from "@/lib/utils/google-maps";
import { buildScheduleItemPlan } from "@/lib/utils/schedule-item-plan";
import { parseTravelerNames } from "@/lib/utils/travelers";

const currencySchema = z.enum(["MYR", "SGD", "USD", "VND", "THB", "IDR", "PHP", "JPY", "KRW", "TWD", "HKD"]);
const schedulePlanInputSchema = z.discriminatedUnion("planType", [
  z.object({
    planType: z.literal("flight"),
    flightNumber: z.string().trim().min(1, "Flight number is required."),
    flightTime: z.string().trim().nullable(),
    passengerName: z.string().trim().min(1, "Passenger name is required."),
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

export async function createTrip(formData: FormData) {
  const supabase = await authedClient();
  const defaultCurrency = currencySchema.parse(value(formData, "default_currency", "MYR"));
  const travelerNames = parseTravelerNames(value(formData, "travelers"));
  const startDate = nullable(formData, "start_date");
  const endDate = nullable(formData, "end_date");
  const dateValidation = validateTripCreationDates(startDate, endDate);
  if (!dateValidation.ok) throw new Error(dateValidation.message);
  if (!travelerNames.length) throw new Error("Add at least one traveler.");
  const { data, error } = await supabase.rpc("create_trip", {
    p_name: value(formData, "name", "New Trip"),
    p_start_date: startDate,
    p_end_date: endDate,
    p_default_currency: defaultCurrency as Currency,
  });

  if (error) throw new Error(error.message);
  if (travelerNames.length) {
    const { error: travelerError } = await supabase.from("travelers").insert(
      travelerNames.map((name) => ({
        trip_id: data,
        name,
      })),
    );
    if (travelerError) throw new Error(travelerError.message);
  }
  revalidatePath("/trips");
  redirect(`/trips/${data}/overview`);
}

export async function updateTrip(tripId: string, formData: FormData) {
  const supabase = await authedClient();
  const defaultCurrency = currencySchema.parse(value(formData, "default_currency", "MYR"));
  const startDate = nullable(formData, "start_date");
  const endDate = nullable(formData, "end_date");
  const dateValidation = validateTripCreationDates(startDate, endDate);
  if (!dateValidation.ok) throw new Error(dateValidation.message);
  const { error } = await supabase.rpc("update_trip", {
    p_trip_id: tripId,
    p_name: value(formData, "name"),
    p_start_date: startDate,
    p_end_date: endDate,
    p_default_currency: defaultCurrency as Currency,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

export async function completeTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("complete_trip", { p_trip_id: tripId });
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

export async function archiveTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("archive_trip", { p_trip_id: tripId });
  if (error) throw new Error(error.message);
  revalidatePath("/trips");
  redirect("/trips");
}

export async function restoreArchivedTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("restore_archived_trip", { p_trip_id: tripId });
  if (error) throw new Error(error.message);
  revalidatePath("/trips");
}

export async function softDeleteTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("soft_delete_trip", { p_trip_id: tripId });
  if (error) throw new Error(error.message);
  revalidatePath("/trips");
  redirect("/trips");
}

export async function restoreDeletedTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("restore_deleted_trip", { p_trip_id: tripId });
  if (error) throw new Error(error.message);
  revalidatePath("/trips");
}

export async function leaveTrip(tripId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("leave_trip", { p_trip_id: tripId });
  if (error) throw new Error(error.message);
  revalidatePath("/trips");
  redirect("/trips");
}

export async function addTraveler(tripId: string, formData: FormData) {
  const supabase = await authedClient();
  const { error } = await supabase.from("travelers").insert({ trip_id: tripId, name: value(formData, "name") });
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}`);
}

export async function addScheduleItem(tripId: string, formData: FormData) {
  const supabase = await authedClient();
  let tripDayId = nullable(formData, "trip_day_id");
  if (!tripDayId) {
    const tripDayDate = value(formData, "trip_day_date");
    const tripDayNumber = Number(value(formData, "trip_day_number"));
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("start_date,end_date")
      .eq("id", tripId)
      .single();
    if (tripError) throw new Error(tripError.message);
    if (!buildTripDateRange(trip.start_date, trip.end_date).includes(tripDayDate)) {
      throw new Error("This itinerary date is outside the trip date range.");
    }

    const { data: tripDay, error: tripDayError } = await supabase
      .from("trip_days")
      .upsert(
        {
          trip_id: tripId,
          date: tripDayDate,
          day_number: tripDayNumber,
        },
        { onConflict: "trip_id,date" },
      )
      .select("id")
      .single();
    if (tripDayError) throw new Error(tripDayError.message);
    tripDayId = tripDay.id;
  }

  const planType = nullable(formData, "plan_type");
  let title: string;
  let timeBlock: string | null;
  let description: string | null;
  let transport: string | null;
  let notes: string | null;

  if (planType) {
    const commonNotes = nullable(formData, "plan_notes");
    let planInput: z.infer<typeof schedulePlanInputSchema>;

    if (planType === "flight") {
      planInput = schedulePlanInputSchema.parse({
        planType,
        flightNumber: value(formData, "flight_number"),
        flightTime: nullable(formData, "flight_time"),
        passengerName: value(formData, "passenger_name"),
        notes: commonNotes,
      });
    } else if (planType === "hotel") {
      planInput = schedulePlanInputSchema.parse({
        planType,
        hotelName: value(formData, "hotel_name"),
        checkIn: nullable(formData, "check_in"),
        checkOut: nullable(formData, "check_out"),
        notes: commonNotes,
      });
    } else if (planType === "place") {
      planInput = schedulePlanInputSchema.parse({
        planType,
        placeName: value(formData, "place_name"),
        placeTime: nullable(formData, "place_time"),
        notes: commonNotes,
      });
    } else {
      throw new Error("Unsupported plan type.");
    }

    const plan = buildScheduleItemPlan(planInput);
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

  const { count, error: countError } = await supabase
    .from("schedule_items")
    .select("*", { count: "exact", head: true })
    .eq("trip_id", tripId)
    .eq("trip_day_id", tripDayId);
  if (countError) throw new Error(countError.message);

  const { error } = await supabase.from("schedule_items").insert({
    trip_id: tripId,
    trip_day_id: tripDayId,
    time_block: timeBlock,
    title,
    description,
    transport,
    food: nullable(formData, "food"),
    notes,
    sort_order: (count ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/overview`);
}

export async function removeScheduleItem(tripId: string, scheduleItemId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("delete_schedule_item", { p_schedule_item_id: scheduleItemId });
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/overview`);
  revalidatePath(`/trips/${tripId}/trip-plan`);
}
