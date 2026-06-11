"use client";

import { useState } from "react";
import { Hotel, MapPin } from "lucide-react";
import type { ScheduleItem, TripDay } from "@/lib/db/types";
import { getNextStopNumber, isGeneratedTripDayId } from "@/lib/utils/trip-days";
import { AddItineraryPlaceForm } from "@/components/trip/add-itinerary-place-form";
import { ReorderableScheduleList } from "@/components/trip/reorderable-schedule-list";
import { TripDaySelector } from "@/components/trip/trip-day-selector";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function formatDayHeading(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function daySummary(day: TripDay, items: ScheduleItem[]) {
  return [day.route, day.hotel_name, ...items.map((item) => item.title)].filter(Boolean).join(" - ") || "Add the first place";
}

export function TripPlanDayTabs({
  tripId,
  days,
  scheduleItems,
  editable,
}: {
  tripId: string;
  days: TripDay[];
  scheduleItems: ScheduleItem[];
  editable: boolean;
}) {
  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id ?? "");
  const effectiveSelectedDayId = days.some((day) => day.id === selectedDayId)
    ? selectedDayId
    : (days[0]?.id ?? "");
  const selectedDayIndex = Math.max(0, days.findIndex((day) => day.id === effectiveSelectedDayId));
  const selectedDay = days[selectedDayIndex];
  const selectedItems = selectedDay
    ? scheduleItems.filter((item) => item.trip_day_id === selectedDay.id)
    : [];

  return (
    <div className="grid gap-5">
      <TripDaySelector
        days={days}
        selectedDayId={effectiveSelectedDayId}
        onSelectDay={setSelectedDayId}
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
                    key={`${selectedDay.id}:${selectedItems.map((item) => `${item.id}:${item.sort_order}`).join(",")}`}
                    tripId={tripId}
                    tripDayId={selectedDay.id}
                    items={selectedItems}
                    editable={editable}
                  />
                ) : null}
              </div>

              {editable ? (
                <AddItineraryPlaceForm
                  tripId={tripId}
                  dayId={isGeneratedTripDayId(selectedDay.id) ? null : selectedDay.id}
                  dayDate={selectedDay.date}
                  dayNumber={selectedDay.day_number ?? selectedDayIndex + 1}
                  nextStopNumber={getNextStopNumber(selectedDay.id, scheduleItems)}
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
