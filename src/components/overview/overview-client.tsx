"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { useTripOverview, type TripOverviewData } from "@/lib/db/client-queries";
import type { Trip } from "@/lib/db/types";
import { formatDisplayDate } from "@/lib/utils/date-format";
import { normalizeLegacyHotels, normalizePlanLogistics } from "@/lib/utils/trip-logistics";
import { generatedTripDayId, normalizeTripDaysForRange } from "@/lib/utils/trip-days";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { QueryStatusBanner } from "@/components/ui/query-status-banner";
import { OverviewDayTabs } from "@/components/overview/overview-day-tabs";
import { TripLogisticsSummary } from "@/components/overview/trip-logistics-summary";

function shortDate(date: string | null) {
  return date ? formatDisplayDate(date) : null;
}

function tripDestination(trip: Trip, data: TripOverviewData) {
  return [
    data.places.find((place) => place.area?.trim())?.area,
    data.days.find((day) => day.route?.trim())?.route,
    trip.name,
  ].find((destination) => destination?.trim())?.trim() ?? "Trip destination";
}

export function OverviewClient({
  trip,
  initialData,
}: {
  trip: Trip;
  initialData: TripOverviewData;
}) {
  const overviewQuery = useTripOverview(trip.id, initialData);
  const { data } = overviewQuery;
  const currentDays = normalizeTripDaysForRange(
    data.days,
    trip.start_date,
    trip.end_date,
    (date, dayNumber) => ({
      id: generatedTripDayId(date),
      trip_id: trip.id,
      date,
      day_number: dayNumber,
      route: null,
      hotel_name: null,
      hotel_link: null,
      remark: null,
      created_at: "",
      updated_at: null,
    }),
  );
  const planLogistics = normalizePlanLogistics(currentDays, data.scheduleItems);
  const dateRange = [shortDate(trip.start_date), shortDate(trip.end_date)].filter(Boolean).join(" - ") || "Dates not set";
  const destination = tripDestination(trip, data);

  return (
    <div className="grid min-w-0 gap-6 sm:gap-7">
      <IOSPageHeader
        title={trip.name}
        description={(
          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
            <span className="inline-flex min-w-0 items-center gap-2"><CalendarDays size={16} />{dateRange}</span>
            <span className="inline-flex min-w-0 items-center gap-2"><MapPin size={16} />{destination}</span>
          </div>
        )}
      />

      <QueryStatusBanner
        isError={overviewQuery.isError}
        isFetching={overviewQuery.isFetching}
        onRetry={() => {
          void overviewQuery.refetch();
        }}
      />

      <TripLogisticsSummary
        tripId={trip.id}
        hotels={data.hotels}
        legacyHotels={normalizeLegacyHotels(data.places)}
        planHotels={planLogistics.hotels}
        flights={data.flights}
        planFlights={planLogistics.flights}
        tripStartDate={trip.start_date}
        tripEndDate={trip.end_date}
        travelers={data.travelers}
      />

      <OverviewDayTabs days={currentDays} scheduleItems={data.scheduleItems} travelers={data.travelers} />
    </div>
  );
}
