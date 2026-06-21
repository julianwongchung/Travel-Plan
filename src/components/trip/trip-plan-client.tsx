"use client";

import { useTripSchedule, type TripScheduleData } from "@/lib/db/client-queries";
import type { Trip } from "@/lib/db/types";
import { generatedTripDayId, normalizeTripDaysForRange } from "@/lib/utils/trip-days";
import { TripPlanDayTabs } from "@/components/trip/trip-plan-day-tabs";
import { QueryStatusBanner } from "@/components/ui/query-status-banner";

export function TripPlanClient({
  trip,
  tripId,
  editable,
  initialData,
  selectedDayDate,
}: {
  trip: Trip;
  tripId: string;
  editable: boolean;
  initialData: TripScheduleData;
  selectedDayDate?: string;
}) {
  const scheduleQuery = useTripSchedule(tripId, initialData);
  const { data } = scheduleQuery;
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
  const initialSelectedDayId = currentDays.find((day) => day.date === selectedDayDate)?.id;

  return (
    <div className="grid min-w-0 gap-6 sm:gap-7">
      {!editable ? (
        <p className="rounded-[18px] border border-[var(--border)] bg-[var(--muted)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">Read-only access. Mutation controls are hidden for viewers.</p>
      ) : null}

      <QueryStatusBanner
        isError={scheduleQuery.isError}
        isFetching={scheduleQuery.isFetching}
        onRetry={() => {
          void scheduleQuery.refetch();
        }}
      />

      <TripPlanDayTabs
        tripId={tripId}
        days={currentDays}
        scheduleItems={data.scheduleItems}
        travelers={data.travelers}
        editable={editable}
        initialSelectedDayId={initialSelectedDayId}
      />
    </div>
  );
}
