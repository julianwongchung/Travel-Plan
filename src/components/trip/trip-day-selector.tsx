"use client";

import { cn } from "@/lib/utils/cn";

type SelectableTripDay = {
  id: string;
  date: string;
  day_number: number | null;
};

function compactDayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T00:00:00`)).toUpperCase();
}

export function TripDaySelector({
  days,
  selectedDayId,
  onSelectDay,
  className,
  variant = "default",
}: {
  days: SelectableTripDay[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
  className?: string;
  variant?: "default" | "overview";
}) {
  if (!days.length) return null;

  const isOverview = variant === "overview";

  return (
    <nav
      aria-label="Trip dates"
      className={cn(
        isOverview
          ? "sticky top-16 z-40 mx-auto w-full max-w-3xl overflow-hidden bg-[var(--background)] py-2 sm:py-3 xl:static"
          : "glass-surface sticky top-16 z-40 -mx-3 overflow-hidden border-x-0 px-3 py-2.5 sm:-mx-5 sm:px-5 xl:static xl:mx-0 xl:rounded-[24px] xl:border-x",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label="Select itinerary day"
        className={cn(
          isOverview
            ? "grid grid-flow-col auto-cols-[calc(20%_-_0.4rem)] gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {days.map((day, dayIndex) => {
          const selected = day.id === selectedDayId;
          const dateLabel = compactDayDate(day.date);

          return (
            <button
              key={day.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`${dateLabel} D${day.day_number ?? dayIndex + 1}`}
              onClick={() => onSelectDay(day.id)}
              className={cn(
                isOverview
                  ? "ios-pressable grid min-h-[72px] w-full min-w-0 place-items-center rounded-[14px] border px-1 py-2 text-center shadow-sm sm:min-h-[78px]"
                  : "ios-pressable grid min-h-[56px] min-w-[82px] shrink-0 place-items-center rounded-[15px] border px-2 py-1.5 text-center",
                selected
                  ? "border-transparent bg-[var(--primary)] text-white shadow-[0_8px_22px_rgba(8,120,249,0.24)]"
                  : isOverview
                    ? "border-slate-100 bg-white text-[var(--foreground)] shadow-sm dark:border-white/10 dark:bg-[var(--card-strong)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]",
              )}
            >
              <span
                className={cn(
                  isOverview ? "text-[10px] font-semibold sm:text-[11px]" : "text-[10px] font-medium",
                  selected ? "text-white/80" : "text-[var(--muted-foreground)]",
                )}
              >
                {dateLabel}
              </span>
              <span className={cn(
                isOverview ? "text-[1.35rem] font-extrabold leading-none sm:text-2xl" : "text-base font-bold leading-none",
              )}>
                D{day.day_number ?? dayIndex + 1}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
