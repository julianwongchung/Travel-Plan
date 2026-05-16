"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authedClient, nullable, value } from "@/lib/actions/helpers";
import type { Currency } from "@/lib/db/types";
import { validateTripCreationDates } from "@/lib/utils/trip-days";
import { parseTravelerNames } from "@/lib/utils/travelers";

const currencySchema = z.enum(["MYR", "SGD", "USD", "VND", "THB", "IDR", "PHP", "JPY", "KRW", "TWD", "HKD"]);

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
  const { error } = await supabase.rpc("update_trip", {
    p_trip_id: tripId,
    p_name: value(formData, "name"),
    p_start_date: nullable(formData, "start_date"),
    p_end_date: nullable(formData, "end_date"),
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
  const { error } = await supabase.from("schedule_items").insert({
    trip_id: tripId,
    trip_day_id: value(formData, "trip_day_id"),
    time_block: nullable(formData, "time_block"),
    title: value(formData, "title"),
    description: nullable(formData, "description"),
    transport: nullable(formData, "transport"),
    food: nullable(formData, "food"),
    notes: nullable(formData, "notes"),
    sort_order: Number(value(formData, "sort_order", "0")),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/overview`);
  revalidatePath(`/trips/${tripId}/trip-plan`);
}

export async function removeScheduleItem(tripId: string, scheduleItemId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("delete_schedule_item", { p_schedule_item_id: scheduleItemId });
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/overview`);
  revalidatePath(`/trips/${tripId}/trip-plan`);
}
