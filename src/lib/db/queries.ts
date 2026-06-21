import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMissingLogisticsTableError } from "@/lib/utils/trip-logistics";
import type { ExpenseSplit, Place, Role, ScheduleItem, Traveler, Trip, TripDay, TripExpense, TripFlight, TripHotel, TripInvitation, TripMember } from "@/lib/db/types";

export type TripContext = {
  trip: Trip;
  role: Role;
};

export type TripListItem = Trip & {
  role: Role;
  owner_email: string | null;
  traveler_count: number;
  member_count: number;
};

type SupabaseQueryError = {
  message: string;
};

function assertNoQueryError(error: SupabaseQueryError | null, fallbackMessage: string) {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }
}

async function getUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export async function getTripContext(tripId: string): Promise<TripContext> {
  const { supabase, userId } = await getUserId();
  const { data: trip, error: tripError } = await supabase.from("trips").select("*").eq("id", tripId).single();
  if (tripError || !trip) redirect("/trips");

  const typedTrip = trip as Trip;
  const { data: member } = await supabase.from("trip_members").select("role").eq("trip_id", tripId).eq("user_id", userId).single();
  const role = typedTrip.owner_id === userId ? "owner" : ((member?.role as Role | undefined) ?? null);
  if (!role) redirect("/trips");

  return { trip: typedTrip, role };
}

export async function getTrips(): Promise<TripListItem[]> {
  const { supabase } = await getUserId();
  const { data: trips, error } = await supabase.rpc("get_trip_cards");
  assertNoQueryError(error, "Could not load trips.");

  return (trips ?? []) as TripListItem[];
}

export async function getOverviewData(tripId: string) {
  const supabase = await createClient();
  const [
    { data: days, error: daysError },
    { data: scheduleItems, error: scheduleItemsError },
    { data: places, error: placesError },
    { data: expenses, error: expensesError },
    { data: travelers, error: travelersError },
  ] = await Promise.all([
    supabase.from("trip_days").select("*").eq("trip_id", tripId).order("date"),
    supabase.from("schedule_items").select("*").eq("trip_id", tripId).order("sort_order"),
    supabase.from("places").select("*").eq("trip_id", tripId).is("deleted_at", null),
    supabase.from("trip_expenses").select("*").eq("trip_id", tripId).is("deleted_at", null),
    supabase.from("travelers").select("*").eq("trip_id", tripId).is("deleted_at", null).order("name"),
  ]);

  assertNoQueryError(daysError, "Could not load trip days.");
  assertNoQueryError(scheduleItemsError, "Could not load itinerary.");
  assertNoQueryError(placesError, "Could not load places.");
  assertNoQueryError(expensesError, "Could not load expenses.");
  assertNoQueryError(travelersError, "Could not load travelers.");

  return {
    days: (days ?? []) as TripDay[],
    scheduleItems: (scheduleItems ?? []) as ScheduleItem[],
    places: (places ?? []) as Place[],
    expenses: (expenses ?? []) as TripExpense[],
    travelers: (travelers ?? []) as Traveler[],
  };
}

export async function getPlaces(tripId: string, includeDeleted = false) {
  const supabase = await createClient();
  let query = supabase.from("places").select("*").eq("trip_id", tripId).order("created_at", { ascending: false });
  if (!includeDeleted) query = query.is("deleted_at", null);
  const { data, error } = await query;
  assertNoQueryError(error, "Could not load places.");
  return (data ?? []) as Place[];
}

export async function getTripLogistics(tripId: string) {
  const supabase = await createClient();
  const [{ data: hotels, error: hotelError }, { data: flights, error: flightError }] = await Promise.all([
    supabase.from("trip_hotels").select("*").eq("trip_id", tripId).is("deleted_at", null).order("check_in_date"),
    supabase.from("trip_flights").select("*").eq("trip_id", tripId).is("deleted_at", null).order("flight_date").order("flight_time"),
  ]);
  if (hotelError && !isMissingLogisticsTableError(hotelError.message)) throw new Error(hotelError.message);
  if (flightError && !isMissingLogisticsTableError(flightError.message)) throw new Error(flightError.message);
  return {
    hotels: (hotels ?? []) as TripHotel[],
    flights: (flights ?? []) as TripFlight[],
  };
}

export async function getExpenseData(tripId: string) {
  const supabase = await createClient();
  const [
    { data: expenses, error: expensesError },
    { data: splits, error: splitsError },
    { data: travelers, error: travelersError },
  ] = await Promise.all([
    supabase.from("trip_expenses").select("*").eq("trip_id", tripId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("expense_splits").select("*").eq("trip_id", tripId),
    supabase.from("travelers").select("*").eq("trip_id", tripId).is("deleted_at", null).order("name"),
  ]);

  assertNoQueryError(expensesError, "Could not load expenses.");
  assertNoQueryError(splitsError, "Could not load expense splits.");
  assertNoQueryError(travelersError, "Could not load travelers.");

  return {
    expenses: (expenses ?? []) as TripExpense[],
    splits: (splits ?? []) as ExpenseSplit[],
    travelers: (travelers ?? []) as Traveler[],
  };
}

export async function getTripMembers(tripId: string) {
  const supabase = await createClient();
  const [{ data: members, error: membersError }, { data: invitations, error: invitationsError }] = await Promise.all([
    supabase.from("trip_members").select("*, profiles(email, full_name)").eq("trip_id", tripId).order("created_at"),
    supabase.from("trip_invitations").select("*").eq("trip_id", tripId).eq("status", "pending").order("created_at", { ascending: false }),
  ]);

  assertNoQueryError(membersError, "Could not load members.");
  assertNoQueryError(invitationsError, "Could not load invitations.");

  return {
    members: (members ?? []) as TripMember[],
    invitations: (invitations ?? []) as TripInvitation[],
  };
}
