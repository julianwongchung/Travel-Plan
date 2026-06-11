"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Bed,
  BusFront,
  CircleEllipsis,
  Edit2,
  MoreHorizontal,
  Plane,
  PlusCircle,
  Sparkles,
  Utensils,
} from "lucide-react";
import { TripDaySelector } from "@/components/trip/trip-day-selector";
import { Badge } from "@/components/ui/badge";

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

type ItemCategory = "flight" | "lodging" | "activity" | "food" | "transport" | "other";

const categoryStyles = {
  flight: {
    label: "Flight",
    icon: Plane,
    card: "border-blue-200/80 bg-blue-50/75 dark:border-blue-400/20 dark:bg-blue-500/10",
    badge: "border-blue-200/80 bg-blue-600 text-white dark:border-blue-400/20",
    dot: "bg-blue-600",
  },
  lodging: {
    label: "Lodging",
    icon: Bed,
    card: "border-violet-200/80 bg-violet-50/75 dark:border-violet-400/20 dark:bg-violet-500/10",
    badge: "border-violet-200/80 bg-violet-600 text-white dark:border-violet-400/20",
    dot: "bg-violet-600",
  },
  activity: {
    label: "Activity",
    icon: Sparkles,
    card: "border-emerald-200/80 bg-emerald-50/75 dark:border-emerald-400/20 dark:bg-emerald-500/10",
    badge: "border-emerald-200/80 bg-emerald-600 text-white dark:border-emerald-400/20",
    dot: "bg-emerald-600",
  },
  food: {
    label: "Food",
    icon: Utensils,
    card: "border-orange-200/80 bg-orange-50/75 dark:border-orange-400/20 dark:bg-orange-500/10",
    badge: "border-orange-200/80 bg-orange-500 text-white dark:border-orange-400/20",
    dot: "bg-orange-500",
  },
  transport: {
    label: "Transport",
    icon: BusFront,
    card: "border-cyan-200/80 bg-cyan-50/75 dark:border-cyan-400/20 dark:bg-cyan-500/10",
    badge: "border-cyan-200/80 bg-cyan-600 text-white dark:border-cyan-400/20",
    dot: "bg-cyan-600",
  },
  other: {
    label: "Other",
    icon: CircleEllipsis,
    card: "border-slate-200/80 bg-slate-50/75 dark:border-slate-400/20 dark:bg-slate-500/10",
    badge: "border-slate-200/80 bg-slate-600 text-white dark:border-slate-400/20",
    dot: "bg-slate-500",
  },
} satisfies Record<ItemCategory, {
  label: string;
  icon: typeof Plane;
  card: string;
  badge: string;
  dot: string;
}>;

function dayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
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

function categoryFromText(value: string): ItemCategory | null {
  const text = value.toLowerCase();
  if (/\b(flight|plane|airline|airport|boarding)\b/.test(text)) return "flight";
  if (/\b(hotel|lodging|accommodation|hostel|resort|check-in)\b/.test(text)) return "lodging";
  if (/\b(food|restaurant|dining|breakfast|lunch|dinner|cafe|meal)\b/.test(text)) return "food";
  if (/\b(transport|transit|train|taxi|bus|ferry|shuttle|metro|car)\b/.test(text)) return "transport";
  if (/\b(activity|attraction|tour|museum|sightseeing|experience|walk)\b/.test(text)) return "activity";
  return null;
}

function itemCategory(item: OverviewScheduleItem): ItemCategory {
  const explicitCategory = item.category ? categoryFromText(item.category) : null;
  if (explicitCategory) return explicitCategory;
  if (item.food) return "food";
  if (item.transport) return "transport";

  return categoryFromText(
    `${item.title} ${item.description ?? ""} ${item.notes ?? ""}`,
  ) ?? "other";
}

export function OverviewDayTabs({
  tripId,
  days,
  scheduleItems,
  logistics,
}: {
  tripId: string;
  days: OverviewDay[];
  scheduleItems: OverviewScheduleItem[];
  logistics?: ReactNode;
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
    <div className="grid gap-6">
      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <TripDaySelector
          days={days}
          selectedDayId={effectiveSelectedDayId}
          onSelectDay={setSelectedDayId}
          className="col-span-full"
        />

        <main className="grid min-w-0 content-start gap-8 lg:col-start-2 lg:row-start-2">
          {selectedDay ? (
            <section className="grid gap-5">
              <div className="flex min-w-0 items-start justify-between gap-3 border-b border-[var(--border)] pb-4 sm:gap-4 sm:pb-5">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-[-0.03em] sm:text-2xl">
                    Day {selectedDay.day_number ?? selectedDayIndex + 1}: {selectedDay.route ?? "Untitled Route"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {dayDate(selectedDay.date)} / {selectedItems.length} Planned Item{selectedItems.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Link href={`/trips/${tripId}/trip-plan`} aria-label="Edit day" className="ios-pressable grid size-11 shrink-0 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
                  <MoreHorizontal size={17} />
                </Link>
              </div>

              <div className="relative grid min-w-0 gap-3 pl-5 before:absolute before:bottom-4 before:left-2 before:top-4 before:w-px before:bg-[var(--border)] sm:pl-7 sm:before:left-2.5">
                {selectedItems.length ? (
                  selectedItems.map((item) => {
                    const category = itemCategory(item);
                    const kind = categoryStyles[category];
                    const Icon = kind.icon;
                    const itemLink = externalLink(item.notes);
                    const itemDescription = item.description
                      ?? item.transport
                      ?? item.food
                      ?? (itemLink ? null : item.notes)
                      ?? "No notes added yet.";

                    return (
                      <article
                        key={item.id}
                        data-itinerary-category={category}
                        className={`content-surface relative grid min-w-0 gap-3 rounded-[20px] p-4 pr-14 sm:rounded-[22px] sm:p-5 sm:pr-16 ${kind.card}`}
                      >
                        <span className={`absolute -left-[19px] top-6 size-3.5 rounded-full ring-4 ring-[var(--background)] sm:-left-[25px] sm:size-4 ${kind.dot}`} />
                        <p className="text-sm font-medium text-[var(--muted-foreground)]">{item.time_block ?? "Time TBD"}</p>
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-bold tracking-[-0.015em]">
                            {itemLink ? (
                              <a
                                href={itemLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-sm underline decoration-[var(--primary)]/35 underline-offset-4 transition-colors hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                              >
                                {item.title}
                              </a>
                            ) : item.title}
                          </h3>
                          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{itemDescription}</p>
                        </div>
                        <Badge className={`h-fit w-fit gap-1.5 rounded-full px-2.5 py-1 ${kind.badge}`}>
                          <Icon size={14} />
                          {kind.label}
                        </Badge>
                        <Link
                          href={`/trips/${tripId}/trip-plan`}
                          aria-label={`Edit ${item.title}`}
                          className="ios-pressable absolute right-3 top-3 grid size-10 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-white/70 hover:text-[var(--primary)] dark:hover:bg-white/10 sm:right-4 sm:top-4"
                        >
                          <Edit2 size={16} />
                        </Link>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[var(--border)] p-6 text-sm font-medium text-[var(--muted-foreground)]">
                    No planned items for this day yet.
                  </div>
                )}
              </div>
            </section>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-[24px] border border-dashed border-[var(--border)] text-center">
              <div>
                <p className="text-lg font-bold">No itinerary yet</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Create the first trip day from Trip Plan.</p>
              </div>
            </div>
          )}

          <Link href={`/trips/${tripId}/trip-plan`} className="ios-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--muted)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--primary-soft)]">
            <PlusCircle size={17} />
            Add Itinerary Item
          </Link>
        </main>

        {logistics ? (
          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            {logistics}
          </div>
        ) : null}
      </section>
    </div>
  );
}
