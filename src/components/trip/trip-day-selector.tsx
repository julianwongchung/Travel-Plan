"use client";

import { cn } from "@/lib/utils/cn";

type SelectableTripDay = {
  id: string;
  date: string;
  day_number: number | null;
};

function compactDayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function TripDaySelector({
  days,
  selectedDayId,
  onSelectDay,
  className,
}: {
  days: SelectableTripDay[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
  className?: string;
}) {
  if (!days.length) return null;

  return (
    <nav
      aria-label="Trip dates"
      className={cn(
        "glass-surface sticky top-16 z-40 -mx-3 overflow-hidden border-x-0 px-3 py-2.5 sm:-mx-5 sm:px-5 xl:static xl:mx-0 xl:rounded-[24px] xl:border-x",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label="Select itinerary day"
        className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((day, dayIndex) => {
          const selected = day.id === selectedDayId;

          return (
            <button
              key={day.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`${compactDayDate(day.date)} D${day.day_number ?? dayIndex + 1}`}
              onClick={() => onSelectDay(day.id)}
              className={cn(
                "ios-pressable grid min-h-[56px] min-w-[62px] shrink-0 place-items-center rounded-[15px] border px-2 py-1.5 text-center",
                selected
                  ? "border-transparent bg-[var(--primary)] text-white shadow-[0_8px_22px_rgba(8,120,249,0.24)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-medium",
                  selected ? "text-white/80" : "text-[var(--muted-foreground)]",
                )}
              >
                {compactDayDate(day.date)}
              </span>
              <span className="text-base font-bold leading-none">
                D{day.day_number ?? dayIndex + 1}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
