"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hotel, MapPin } from "lucide-react";
import type { ScheduleItem, Traveler, TripDay } from "@/lib/db/types";
import { formatDisplayDate } from "@/lib/utils/date-format";
import {
  flightPlanTouchesDate,
  parseFlightPlanDescription,
} from "@/lib/utils/schedule-item-plan";
import { isGeneratedTripDayId } from "@/lib/utils/trip-days";
import { AddItineraryPlan } from "@/components/trip/add-itinerary-plan";
import { ReorderableScheduleList } from "@/components/trip/reorderable-schedule-list";
import { TripDaySelector } from "@/components/trip/trip-day-selector";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function formatDayHeading(date: string) {
  return formatDisplayDate(date);
}

function daySummary(day: TripDay, items: ScheduleItem[]) {
  return [day.route, day.hotel_name, ...items.map((item) => item.title)].filter(Boolean).join(" - ") || "Add the first place";
}

function flightTouchesDay(item: ScheduleItem, day: TripDay) {
  const flightPlan = parseFlightPlanDescription(item.description);
  return flightPlan ? flightPlanTouchesDate(flightPlan, day.date) : false;
}

export function TripPlanDayTabs({
  tripId,
  days,
  scheduleItems,
  travelers = [],
  editable,
  initialSelectedDayId,
}: {
  tripId: string;
  days: TripDay[];
  scheduleItems: ScheduleItem[];
  travelers?: Traveler[];
  editable: boolean;
  initialSelectedDayId?: string;
}) {
  const router = useRouter();
  const [selectedDayId, setSelectedDayId] = useState(
    initialSelectedDayId && days.some((day) => day.id === initialSelectedDayId)
      ? initialSelectedDayId
      : (days[0]?.id ?? ""),
  );
  const effectiveSelectedDayId = days.some((day) => day.id === selectedDayId)
    ? selectedDayId
    : (days[0]?.id ?? "");
  const selectedDayIndex = Math.max(0, days.findIndex((day) => day.id === effectiveSelectedDayId));
  const selectedDay = days[selectedDayIndex];
  const ownedItems = selectedDay
    ? scheduleItems.filter((item) => item.trip_day_id === selectedDay.id)
    : [];
  const relatedFlightItems = selectedDay
    ? scheduleItems.filter((item) => item.trip_day_id !== selectedDay.id && flightTouchesDay(item, selectedDay))
    : [];
  const selectedItems = [...ownedItems, ...relatedFlightItems];
  const relatedFlightItemIds = relatedFlightItems.map((item) => item.id);

  function selectDay(dayId: string) {
    setSelectedDayId(dayId);
    const day = days.find((candidate) => candidate.id === dayId);
    if (!day) return;

    router.replace(`${window.location.pathname}?day=${day.date}`, { scroll: false });
  }

  return (
    <div className="grid gap-5">
      <TripDaySelector
        days={days}
        selectedDayId={effectiveSelectedDayId}
        onSelectDay={selectDay}
      />

      <Card>
        <CardHeader><h2 className="text-lg font-bold">Itinerary</h2></CardHeader>
        <CardContent>
          {selectedDay ? (
            <section>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Day {selectedDay.day_number ?? selectedDayIndex + 1}
                </p>
                <h3 className="mt-1 text-xl font-bold tracking-[-0.03em] sm:text-2xl">{formatDayHeading(selectedDay.date)}</h3>
                <p className="mt-1 text-sm font-semibold text-[var(--muted-foreground)]">{daySummary(selectedDay, selectedItems)}</p>
              </div>

              <div className="mt-4 grid gap-3">
                {!selectedItems.length ? (
                  <div className="rounded-[18px] border border-dashed border-[var(--border)] p-4 text-sm font-medium text-[var(--muted-foreground)]">
                    No itinerary yet. Add the first place below.
                  </div>
                ) : null}
                {selectedDay.route ? <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><MapPin size={16} />{selectedDay.route}</p> : null}
                {selectedDay.hotel_name ? (
                  <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <Hotel size={16} />
                    {selectedDay.hotel_link ? <a className="font-semibold text-[var(--primary)]" href={selectedDay.hotel_link}>{selectedDay.hotel_name}</a> : selectedDay.hotel_name}
                  </p>
                ) : null}
                {selectedItems.length ? (
                  <ReorderableScheduleList
                    key={`${selectedDay.id}:${selectedItems.map((item) => `${item.id}:${item.trip_day_id}:${item.sort_order}`).join(",")}`}
                    tripId={tripId}
                    tripDayId={selectedDay.id}
                    targetDayDate={selectedDay.date}
                    targetDayNumber={selectedDay.day_number ?? selectedDayIndex + 1}
                    items={selectedItems}
                    editable={editable}
                    removeDisabledItemIds={relatedFlightItemIds}
                    travelers={travelers}
                  />
                ) : null}
              </div>

              {editable ? (
                <AddItineraryPlan
                  tripId={tripId}
                  dayId={isGeneratedTripDayId(selectedDay.id) ? null : selectedDay.id}
                  dayDate={selectedDay.date}
                  dayNumber={selectedDay.day_number ?? selectedDayIndex + 1}
                  travelers={travelers}
                />
              ) : null}

              {selectedDay.remark ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">{selectedDay.remark}</p> : null}
            </section>
          ) : (
            <div className="grid min-h-56 place-items-center rounded-[20px] border border-dashed border-[var(--border)] text-center">
              <div>
                <p className="font-bold">No trip days yet</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Add a trip day to start planning the itinerary.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
