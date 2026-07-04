"use client";

import { useState, type CSSProperties } from "react";
import {
  Bed,
  BusFront,
  CircleEllipsis,
  ExternalLink,
  Plane,
  Sparkles,
  Utensils,
} from "lucide-react";
import { TripDaySelector } from "@/components/trip/trip-day-selector";
import { IOSBottomSheet } from "@/components/ui/ios-bottom-sheet";
import type { Traveler } from "@/lib/db/types";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/utils/date-format";
import {
  flightArrivalDayOffset,
  flightPlanTimeForDate,
  flightPlanTouchesDate,
  flightRouteSummary,
  flightStopoverSummary,
  parseFlightPlanDescription,
  scheduleItemCategory,
  type FlightPlanSegment,
  type ScheduleItemCategory,
} from "@/lib/utils/schedule-item-plan";
import { passengerColors, type PassengerColor } from "@/lib/utils/traveler-colors";

type OverviewDay = {
  id: string;
  date: string;
  day_number: number | null;
  route: string | null;
};

type OverviewScheduleItem = {
  id: string;
  trip_day_id: string;
  time_block: string | null;
  title: string;
  category?: string | null;
  description: string | null;
  transport: string | null;
  food: string | null;
  notes: string | null;
};

type OverviewTimelineStop = {
  kind: string;
  place: string;
  date: string;
  time: string;
  key: string;
};

type TravelerColorVars = CSSProperties & {
  "--traveler-accent"?: string;
};

const categoryStyles = {
  flight: {
    label: "Flight",
    icon: Plane,
    iconClass: "bg-blue-500/12 text-blue-600 dark:text-blue-300",
  },
  lodging: {
    label: "Lodging",
    icon: Bed,
    iconClass: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
  },
  activity: {
    label: "Activity",
    icon: Sparkles,
    iconClass: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
  },
  food: {
    label: "Food",
    icon: Utensils,
    iconClass: "bg-orange-500/12 text-orange-600 dark:text-orange-300",
  },
  transport: {
    label: "Transport",
    icon: BusFront,
    iconClass: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-300",
  },
  other: {
    label: "Other",
    icon: CircleEllipsis,
    iconClass: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
  },
} satisfies Record<ScheduleItemCategory, {
  label: string;
  icon: typeof Plane;
  iconClass: string;
}>;

const structuredLabels = new Map([
  ["passenger", "Passenger"],
  ["departure", "Departure"],
  ["arrival", "Arrival"],
  ["location", "Location"],
  ["address", "Address"],
  ["check-in", "Check-in"],
  ["check-out", "Check-out"],
  ["flight number", "Flight number"],
  ["terminal", "Terminal"],
  ["confirmation", "Confirmation"],
]);

function dayDate(date: string) {
  return formatDisplayDate(date);
}

function shortDate(date: string) {
  return formatDisplayDate(date);
}

function externalLink(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function displayStructuredValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
    ? formatDisplayDateTime(value)
    : value;
}

function descriptionParts(description: string | null | undefined) {
  return description
    ?.split(" - ")
    .map((part) => part.trim())
    .filter(Boolean) ?? [];
}

function descriptionValue(description: string | null | undefined, label: string) {
  const prefix = `${label}:`.toLowerCase();
  return descriptionParts(description)
    .find((part) => part.toLowerCase().startsWith(prefix))
    ?.slice(prefix.length)
    .trim() || null;
}

function passengerNamesFromText(value: string | null) {
  return value
    ?.split(/[,/]/)
    .map((name) => name.trim())
    .filter(Boolean) ?? [];
}

function dateTimeParts(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/.exec(trimmed);
  if (iso) {
    return {
      date: iso[1],
      time: iso[2] ?? null,
    };
  }

  const display = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}))?/.exec(trimmed);
  if (display) {
    return {
      date: `${display[3]}-${display[2]}-${display[1]}`,
      time: display[4] ?? null,
    };
  }

  const timeOnly = /^(\d{2}:\d{2})/.exec(trimmed);
  return timeOnly ? { date: null, time: timeOnly[1] } : null;
}

function itemDetails(item: OverviewScheduleItem, category: ScheduleItemCategory) {
  const fields: Array<{ label: string; value: string }> = [];
  const noteParts: string[] = [];
  const flightPlan = parseFlightPlanDescription(item.description);

  if (flightPlan) {
    fields.push(
      { label: "Route", value: flightRouteSummary(flightPlan.segments) },
      { label: "Connection", value: flightStopoverSummary(flightPlan.segments) },
      { label: "Passengers", value: flightPlan.passengers.join(", ") || "Not set" },
    );
    if (flightPlan.notes) noteParts.push(flightPlan.notes);

    return {
      fields,
      flightPlan,
      mapLink: null,
      notes: noteParts.join(" - ") || null,
    };
  }

  item.description
    ?.split(" - ")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const separator = part.indexOf(":");
      const rawLabel = separator > 0 ? part.slice(0, separator).trim().toLowerCase() : "";
      const label = structuredLabels.get(rawLabel);
      const value = separator > 0 ? part.slice(separator + 1).trim() : "";

      if (label && value) {
        fields.push({ label, value: displayStructuredValue(value) });
      } else {
        noteParts.push(part);
      }
    });

  if (category === "flight" && /^Flight\s+/i.test(item.title)) {
    fields.unshift({
      label: "Flight number",
      value: item.title.replace(/^Flight\s+/i, "").trim(),
    });
  }

  if (
    category === "transport" &&
    item.transport &&
    !["flight", "lodging", "hotel", "activity", "place"].includes(item.transport.toLowerCase())
  ) {
    fields.unshift({ label: "Transport", value: item.transport });
  }

  if (item.food) {
    fields.unshift({ label: "Meal", value: item.food });
  }

  const mapLink = externalLink(item.notes);
  if (item.notes && !mapLink) noteParts.push(item.notes);

  return {
    fields,
    flightPlan,
    mapLink,
    notes: noteParts.join(" - ") || null,
  };
}

function passengerNamesForItem(item: OverviewScheduleItem) {
  const flightPlan = parseFlightPlanDescription(item.description);
  if (flightPlan) return flightPlan.passengers;

  if (scheduleItemCategory(item) !== "flight") return [];
  return passengerNamesFromText(descriptionValue(item.description, "Passenger"));
}

function itemAppearsOnDay(item: OverviewScheduleItem, day: OverviewDay) {
  const flightPlan = parseFlightPlanDescription(item.description);
  if (flightPlan) return flightPlanTouchesDate(flightPlan, day.date);

  const category = scheduleItemCategory(item);
  const hotelStops = category === "lodging" ? hotelTimelineStops(item) : [];
  if (hotelStops.length) return hotelStops.some((stop) => stop.date === day.date);

  return item.trip_day_id === day.id;
}

function itemTimeForDay(item: OverviewScheduleItem, day: OverviewDay) {
  const flightPlan = parseFlightPlanDescription(item.description);
  return flightPlan ? flightPlanTimeForDate(flightPlan, day.date) ?? item.time_block : item.time_block;
}

function flightTimelineStops(segments: FlightPlanSegment[], selectedDate: string): OverviewTimelineStop[] {
  return segments.flatMap((segment, segmentIndex) => ([
    {
      kind: "Departure",
      place: segment.origin,
      date: segment.departureDate,
      time: segment.departureTime,
      offset: null,
      key: `${segmentIndex}-departure-${segment.origin}-${segment.departureTime}`,
    },
    {
      kind: "Arrival",
      place: segment.destination,
      date: segment.arrivalDate,
      time: segment.arrivalTime,
      offset: flightArrivalDayOffset(segment),
      key: `${segmentIndex}-arrival-${segment.destination}-${segment.arrivalTime}`,
    },
  ])).filter((stop) => stop.date === selectedDate);
}

function hotelTimelineStops(item: OverviewScheduleItem): OverviewTimelineStop[] {
  const checkIn = dateTimeParts(descriptionValue(item.description, "Check-in") ?? item.time_block);
  const checkOut = dateTimeParts(descriptionValue(item.description, "Check-out"));
  const stops: OverviewTimelineStop[] = [];

  if (checkIn?.date && checkIn.time) {
    stops.push({
      kind: "Check-in",
      place: item.title,
      date: checkIn.date,
      time: checkIn.time,
      key: `${item.id}-check-in-${checkIn.date}-${checkIn.time}`,
    });
  }

  if (checkOut?.date && checkOut.time) {
    stops.push({
      kind: "Check-out",
      place: item.title,
      date: checkOut.date,
      time: checkOut.time,
      key: `${item.id}-check-out-${checkOut.date}-${checkOut.time}`,
    });
  }

  return stops;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(5.5rem,auto)_minmax(0,1fr)] gap-4 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
      <dt className="text-sm font-medium text-[var(--muted-foreground)]">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-semibold text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}

function TravelerChip({ passenger }: { passenger: PassengerColor }) {
  return (
    <span
      className="inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
      style={{
        backgroundColor: passenger.color.soft,
        borderColor: passenger.color.border,
        color: passenger.color.text,
      }}
    >
      {passenger.name}
    </span>
  );
}

export function OverviewDayTabs({
  days,
  scheduleItems,
  travelers = [],
}: {
  days: OverviewDay[];
  scheduleItems: OverviewScheduleItem[];
  travelers?: Pick<Traveler, "id" | "name" | "created_at">[];
}) {
  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id ?? "");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const effectiveSelectedDayId = days.some((day) => day.id === selectedDayId)
    ? selectedDayId
    : (days[0]?.id ?? "");
  const selectedDayIndex = Math.max(
    0,
    days.findIndex((day) => day.id === effectiveSelectedDayId),
  );
  const selectedDay = days[selectedDayIndex];
  const selectedItems = selectedDay
    ? scheduleItems.filter((item) => itemAppearsOnDay(item, selectedDay))
    : [];
  const selectedItem = selectedItems.find((item) => item.id === selectedItemId) ?? null;
  const selectedCategory = selectedItem ? scheduleItemCategory(selectedItem) : null;
  const selectedKind = selectedCategory ? categoryStyles[selectedCategory] : null;
  const selectedDetails = selectedItem && selectedCategory
    ? itemDetails(selectedItem, selectedCategory)
    : null;

  function selectDay(dayId: string) {
    setSelectedDayId(dayId);
    setSelectedItemId(null);
  }

  return (
    <section className="grid min-w-0 gap-5 sm:gap-6">
      <TripDaySelector
        days={days}
        selectedDayId={effectiveSelectedDayId}
        onSelectDay={selectDay}
        variant="overview"
      />

      {selectedDay ? (
        <div className="mx-auto grid w-full max-w-3xl min-w-0 gap-4">
          <div className="min-w-0 border-b border-[var(--border)] pb-4">
            <h2 className="break-words text-xl font-bold tracking-[-0.03em] sm:text-2xl">
              Day {selectedDay.day_number ?? selectedDayIndex + 1}: {selectedDay.route ?? "Untitled Route"}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {dayDate(selectedDay.date)} / {selectedItems.length} Planned Item{selectedItems.length === 1 ? "" : "s"}
            </p>
          </div>

          {selectedItems.length ? (
            <div
              data-overview-timeline
              className="relative grid gap-3 pl-8 before:absolute before:bottom-5 before:left-[13px] before:top-5 before:w-px before:bg-[var(--border)]"
            >
              {selectedItems.map((item) => {
                const category = scheduleItemCategory(item);
                const kind = categoryStyles[category];
                const Icon = kind.icon;
                const displayTime = itemTimeForDay(item, selectedDay);
                const flightPlan = parseFlightPlanDescription(item.description);
                const itemPassengers = passengerColors(passengerNamesForItem(item), travelers);
                const singlePassenger = itemPassengers.length === 1 ? itemPassengers[0] : null;
                const flightAccentStyle: TravelerColorVars | undefined = singlePassenger
                  ? { "--traveler-accent": singlePassenger.color.accent }
                  : undefined;
                const flightStops = flightPlan ? flightTimelineStops(flightPlan.segments, selectedDay.date) : [];
                const hotelStops = !flightPlan && category === "lodging"
                  ? hotelTimelineStops(item).filter((stop) => stop.date === selectedDay.date)
                  : [];
                const timelineStops = flightStops.length ? flightStops : hotelStops;
                const timelineStopClass = category === "lodging"
                  ? "border-violet-100 bg-violet-50/70 dark:border-violet-400/15 dark:bg-violet-400/10"
                  : "border-blue-100 bg-blue-50/70 dark:border-blue-400/15 dark:bg-blue-400/10";
                const timelineStopLabelClass = category === "lodging"
                  ? "text-violet-600 dark:text-violet-300"
                  : "text-blue-600 dark:text-blue-300";
                const dynamicTimelineStopStyle = singlePassenger && category === "flight"
                  ? {
                      backgroundColor: singlePassenger.color.soft,
                      borderColor: singlePassenger.color.border,
                    }
                  : undefined;

                return (
                  <div key={item.id} className="relative min-w-0">
                    <span
                      data-overview-timeline-dot
                      className="absolute -left-[31px] top-4 z-10 grid size-6 place-items-center rounded-full bg-blue-500/10"
                      style={singlePassenger ? { backgroundColor: singlePassenger.color.soft } : undefined}
                    >
                      <span
                        className="size-3 rounded-full bg-[var(--primary)] ring-4 ring-white dark:ring-slate-950"
                        style={singlePassenger ? { backgroundColor: singlePassenger.color.accent } : undefined}
                      />
                    </span>
                    <button
                      type="button"
                      aria-label={`View ${item.title} details`}
                      data-itinerary-category={category}
                      onClick={() => setSelectedItemId(item.id)}
                      className="ios-pressable w-full min-w-0 rounded-[18px] border border-slate-100 bg-white/90 p-3 text-left shadow-sm transition dark:border-white/10 dark:bg-[var(--card-strong)] sm:p-4"
                      style={{
                        ...(category === "flight" ? flightAccentStyle : undefined),
                        ...(singlePassenger && category === "flight"
                          ? {
                              borderColor: singlePassenger.color.border,
                              boxShadow: `inset 4px 0 0 ${singlePassenger.color.accent}, 0 10px 26px rgba(15, 23, 42, 0.06)`,
                            }
                          : undefined),
                      }}
                    >
                      <span className="flex min-w-0 items-start gap-3">
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-[13px] ${kind.iconClass}`}
                          style={singlePassenger && category === "flight"
                            ? {
                                backgroundColor: singlePassenger.color.soft,
                                color: singlePassenger.color.accent,
                              }
                            : undefined}
                        >
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-bold text-[var(--foreground)] sm:text-base">
                            {item.title}
                          </span>
                          {itemPassengers.length ? (
                            <span className="mt-1.5 flex flex-wrap gap-1.5">
                              {itemPassengers.map((passenger) => (
                                <TravelerChip key={`${item.id}-${passenger.name}`} passenger={passenger} />
                              ))}
                            </span>
                          ) : null}
                          {displayTime && !timelineStops.length ? (
                            <span className="mt-0.5 block text-xs font-medium tabular-nums text-[var(--muted-foreground)]">
                              {dateTimeParts(displayTime)?.time ?? displayTime}
                            </span>
                          ) : null}
                        </span>
                        {displayTime && !timelineStops.length ? (
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--muted-foreground)]">
                            {dateTimeParts(displayTime)?.time ?? displayTime}
                          </span>
                        ) : null}
                      </span>

                      {timelineStops.length ? (
                        <span className="mt-3 grid gap-2">
                          {timelineStops.map((stop) => (
                            <span
                              key={stop.key}
                              className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] border px-3 py-2 ${timelineStopClass}`}
                              style={dynamicTimelineStopStyle}
                            >
                              <span className="min-w-0">
                                {category === "lodging" ? (
                                  <span className={`block text-[11px] font-semibold uppercase tracking-[0.12em] ${timelineStopLabelClass}`}>
                                    {stop.kind}
                                  </span>
                                ) : (
                                  <>
                                    <span className="block truncate text-sm font-bold text-[var(--foreground)]">
                                      {stop.place}
                                    </span>
                                    <span
                                      className={`mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] ${timelineStopLabelClass}`}
                                      style={singlePassenger && category === "flight" ? { color: singlePassenger.color.text } : undefined}
                                    >
                                      {stop.kind}
                                    </span>
                                  </>
                                )}
                              </span>
                              <span className="text-right">
                                <span className="block text-base font-extrabold tabular-nums text-[var(--foreground)]">
                                  {stop.time}
                                </span>
                              </span>
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-[var(--border)] p-6 text-sm font-medium text-[var(--muted-foreground)]">
              No planned items for this day yet.
            </div>
          )}
        </div>
      ) : (
        <div className="grid min-h-48 place-items-center rounded-[24px] border border-dashed border-[var(--border)] text-center">
          <div>
            <p className="text-lg font-bold">No itinerary yet</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Trip dates have not been set.
            </p>
          </div>
        </div>
      )}

      <IOSBottomSheet
        open={Boolean(selectedItem)}
        title={selectedItem ? `${selectedItem.title} details` : "Itinerary details"}
        onClose={() => setSelectedItemId(null)}
      >
        {selectedItem && selectedDay && selectedKind && selectedDetails ? (
          <div className="grid gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {(() => {
                const modalPassengers = passengerColors(passengerNamesForItem(selectedItem), travelers);
                const singlePassenger = modalPassengers.length === 1 ? modalPassengers[0] : null;
                return (
                  <>
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-[15px] ${selectedKind.iconClass}`}
                style={singlePassenger && selectedCategory === "flight"
                  ? {
                      backgroundColor: singlePassenger.color.soft,
                      color: singlePassenger.color.accent,
                    }
                  : undefined}
              >
                <selectedKind.icon size={19} />
              </span>
              <div className="min-w-0">
                <h3 className="break-words text-lg font-bold">{selectedItem.title}</h3>
                <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                  Day {selectedDay.day_number ?? selectedDayIndex + 1} / {dayDate(selectedDay.date)}
                </p>
                {modalPassengers.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {modalPassengers.map((passenger) => (
                      <TravelerChip key={`modal-${passenger.name}`} passenger={passenger} />
                    ))}
                  </div>
                ) : null}
              </div>
                  </>
                );
              })()}
            </div>

            <dl className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--card-strong)]">
              {selectedItem.time_block ? (
                <DetailRow label="Time" value={selectedItem.time_block} />
              ) : null}
              <DetailRow label="Type" value={selectedKind.label} />
              {selectedDetails.fields.map((field, index) => (
                <DetailRow key={`${field.label}-${index}`} label={field.label} value={field.value} />
              ))}
            </dl>

            {selectedDetails.flightPlan ? (
              <div className="grid gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--card-strong)] p-3">
                <p className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  Segments
                </p>
                {selectedDetails.flightPlan.segments.map((segment, index) => (
                  <article
                    key={`${segment.origin}-${segment.destination}-${index}`}
                    className="rounded-[16px] bg-[var(--muted)] p-3"
                  >
                    <h4 className="text-sm font-bold">
                      Segment {index + 1}: {segment.origin} to {segment.destination}
                    </h4>
                    <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]">
                      Depart {shortDate(segment.departureDate)}, {segment.departureTime}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--muted-foreground)]">
                      Arrive {shortDate(segment.arrivalDate)}, {segment.arrivalTime}
                      {flightArrivalDayOffset(segment) ? ` (${flightArrivalDayOffset(segment)})` : ""}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}

            {selectedDetails.notes ? (
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-strong)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  Notes
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                  {selectedDetails.notes}
                </p>
              </div>
            ) : null}

            {selectedDetails.mapLink ? (
              <a
                href={selectedDetails.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ios-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-[0_8px_22px_rgba(8,120,249,0.24)]"
              >
                <ExternalLink size={16} />
                Open in Google Maps
              </a>
            ) : null}
          </div>
        ) : null}
      </IOSBottomSheet>
    </section>
  );
}
