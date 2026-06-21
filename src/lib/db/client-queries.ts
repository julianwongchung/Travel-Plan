"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { tripKeys } from "@/lib/db/query-keys";
import { isMissingLogisticsTableError } from "@/lib/utils/trip-logistics";
import type { ExpenseSplit, Place, ScheduleItem, Traveler, TripDay, TripExpense, TripFlight, TripHotel } from "@/lib/db/types";

type SupabaseQueryError = {
  message: string;
};

export type TripOverviewData = {
  days: TripDay[];
  scheduleItems: ScheduleItem[];
  places: Place[];
  expenses: TripExpense[];
  travelers: Traveler[];
  hotels: TripHotel[];
  flights: TripFlight[];
};

export type TripScheduleData = {
  days: TripDay[];
  scheduleItems: ScheduleItem[];
  travelers: Traveler[];
};

export type TripExpenseData = {
  expenses: TripExpense[];
  splits: ExpenseSplit[];
  travelers: Traveler[];
};

export type TripPlacesData = {
  places: Place[];
  hotels: TripHotel[];
  flights: TripFlight[];
};

function assertNoQueryError(error: SupabaseQueryError | null, fallbackMessage: string) {
  if (error) {
    throw new Error(error.message || fallbackMessage);
  }
}

async function fetchTripLogistics(tripId: string) {
  const supabase = createClient();
  const [{ data: hotels, error: hotelError }, { data: flights, error: flightError }] = await Promise.all([
    supabase.from("trip_hotels").select("*").eq("trip_id", tripId).is("deleted_at", null).order("check_in_date"),
    supabase.from("trip_flights").select("*").eq("trip_id", tripId).is("deleted_at", null).order("flight_date").order("flight_time"),
  ]);

  if (hotelError && !isMissingLogisticsTableError(hotelError.message)) throw hotelError;
  if (flightError && !isMissingLogisticsTableError(flightError.message)) throw flightError;

  return {
    hotels: (hotels ?? []) as TripHotel[],
    flights: (flights ?? []) as TripFlight[],
  };
}

async function fetchTripOverview(tripId: string): Promise<TripOverviewData> {
  const supabase = createClient();
  const [
    { data: days, error: daysError },
    { data: scheduleItems, error: scheduleItemsError },
    { data: places, error: placesError },
    { data: expenses, error: expensesError },
    { data: travelers, error: travelersError },
    logistics,
  ] = await Promise.all([
    supabase.from("trip_days").select("*").eq("trip_id", tripId).order("date"),
    supabase.from("schedule_items").select("*").eq("trip_id", tripId).order("sort_order"),
    supabase.from("places").select("*").eq("trip_id", tripId).is("deleted_at", null),
    supabase.from("trip_expenses").select("*").eq("trip_id", tripId).is("deleted_at", null),
    supabase.from("travelers").select("*").eq("trip_id", tripId).is("deleted_at", null).order("name"),
    fetchTripLogistics(tripId),
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
    hotels: logistics.hotels,
    flights: logistics.flights,
  };
}

async function fetchTripSchedule(tripId: string): Promise<TripScheduleData> {
  const supabase = createClient();
  const [
    { data: days, error: daysError },
    { data: scheduleItems, error: scheduleItemsError },
    { data: travelers, error: travelersError },
  ] = await Promise.all([
    supabase.from("trip_days").select("*").eq("trip_id", tripId).order("date"),
    supabase.from("schedule_items").select("*").eq("trip_id", tripId).order("sort_order"),
    supabase.from("travelers").select("*").eq("trip_id", tripId).is("deleted_at", null).order("name"),
  ]);

  assertNoQueryError(daysError, "Could not load trip days.");
  assertNoQueryError(scheduleItemsError, "Could not load itinerary.");
  assertNoQueryError(travelersError, "Could not load travelers.");

  return {
    days: (days ?? []) as TripDay[],
    scheduleItems: (scheduleItems ?? []) as ScheduleItem[],
    travelers: (travelers ?? []) as Traveler[],
  };
}

async function fetchTripExpenses(tripId: string): Promise<TripExpenseData> {
  const supabase = createClient();
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

async function fetchTripPlaces(tripId: string): Promise<TripPlacesData> {
  const supabase = createClient();
  const [{ data: places, error: placesError }, logistics] = await Promise.all([
    supabase.from("places").select("*").eq("trip_id", tripId).order("created_at", { ascending: false }),
    fetchTripLogistics(tripId),
  ]);

  assertNoQueryError(placesError, "Could not load places.");

  return {
    places: (places ?? []) as Place[],
    hotels: logistics.hotels,
    flights: logistics.flights,
  };
}

async function fetchTripTravelers(tripId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("travelers")
    .select("*")
    .eq("trip_id", tripId)
    .is("deleted_at", null)
    .order("name");

  assertNoQueryError(error, "Could not load travelers.");

  return (data ?? []) as Traveler[];
}

export function useTripOverview(tripId: string, initialData: TripOverviewData) {
  return useQuery({
    queryKey: tripKeys.overview(tripId),
    queryFn: () => fetchTripOverview(tripId),
    initialData,
  });
}

export function useTripSchedule(tripId: string, initialData: TripScheduleData) {
  return useQuery({
    queryKey: tripKeys.schedule(tripId),
    queryFn: () => fetchTripSchedule(tripId),
    initialData,
  });
}

export function useTripExpenses(tripId: string, initialData: TripExpenseData) {
  return useQuery({
    queryKey: tripKeys.expenses(tripId),
    queryFn: () => fetchTripExpenses(tripId),
    initialData,
  });
}

export function useTripPlaces(tripId: string, initialData: TripPlacesData) {
  return useQuery({
    queryKey: tripKeys.places(tripId),
    queryFn: () => fetchTripPlaces(tripId),
    initialData,
  });
}

export function useTripTravelers(tripId: string, initialData: Traveler[]) {
  return useQuery({
    queryKey: tripKeys.travelers(tripId),
    queryFn: () => fetchTripTravelers(tripId),
    initialData,
  });
}
