"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bed, ChevronLeft, MapPin, Plane } from "lucide-react";
import { addScheduleItem } from "@/lib/actions/trips";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { IOSBottomSheet } from "@/components/ui/ios-bottom-sheet";

type PlanType = "flight" | "hotel" | "place";

const planOptions = [
  {
    type: "flight" as const,
    label: "Add Flight",
    icon: Plane,
    className: "border-blue-300/50 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  },
  {
    type: "hotel" as const,
    label: "Add Hotel",
    icon: Bed,
    className: "border-violet-300/50 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  },
  {
    type: "place" as const,
    label: "Add Place",
    icon: MapPin,
    className: "border-emerald-300/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
];

const planTitles: Record<PlanType, string> = {
  flight: "Add Flight",
  hotel: "Add Hotel",
  place: "Add Place",
};

export function AddItineraryPlan({
  tripId,
  dayId,
  dayDate,
  dayNumber,
}: {
  tripId: string;
  dayId: string | null;
  dayDate: string;
  dayNumber: number;
}) {
  const [open, setOpen] = useState(false);
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function closeSheet() {
    if (isPending) return;
    setOpen(false);
    setPlanType(null);
    setError(null);
  }

  function submitPlan(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addScheduleItem(tripId, formData);
        setOpen(false);
        setPlanType(null);
        setError(null);
        router.refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Could not add this plan.",
        );
      }
    });
  }

  return (
    <div className="pb-24 pt-4 xl:pb-0">
      <Button
        type="button"
        className="w-full sm:w-auto"
        onClick={() => setOpen(true)}
      >
        + Add Plan
      </Button>

      <IOSBottomSheet
        open={open}
        title={planType ? planTitles[planType] : "Add Plan"}
        onClose={closeSheet}
      >
        {planType ? (
          <form action={submitPlan} className="grid min-w-0 gap-4">
            <input type="hidden" name="plan_type" value={planType} />
            <input type="hidden" name="trip_day_id" value={dayId ?? ""} />
            <input type="hidden" name="trip_day_date" value={dayDate} />
            <input type="hidden" name="trip_day_number" value={dayNumber} />

            <button
              type="button"
              onClick={() => {
                setPlanType(null);
                setError(null);
              }}
              className="ios-pressable -mt-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-full px-2 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              <ChevronLeft size={17} />
              Choose another type
            </button>

            {planType === "flight" ? (
              <>
                <Field label="Flight number">
                  <Input
                    name="flight_number"
                    required
                    placeholder="SQ 123"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Flight time">
                  <Input name="flight_time" type="time" />
                </Field>
                <Field label="Passenger name">
                  <Input
                    name="passenger_name"
                    required
                    placeholder="Passenger name"
                    autoComplete="name"
                  />
                </Field>
              </>
            ) : null}

            {planType === "hotel" ? (
              <>
                <Field label="Hotel name">
                  <Input
                    name="hotel_name"
                    required
                    placeholder="Hotel name"
                    autoComplete="organization"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Check-in">
                    <Input name="check_in" type="datetime-local" />
                  </Field>
                  <Field label="Check-out">
                    <Input name="check_out" type="datetime-local" />
                  </Field>
                </div>
              </>
            ) : null}

            {planType === "place" ? (
              <>
                <Field label="Place name">
                  <Input
                    name="place_name"
                    required
                    placeholder="Enter a place manually"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Time">
                  <Input name="place_time" type="time" />
                </Field>
              </>
            ) : null}

            <Field label="Notes">
              <Textarea
                name="plan_notes"
                placeholder="Optional notes"
                className="min-h-24"
              />
            </Field>

            {error ? (
              <p
                role="alert"
                className="rounded-[16px] bg-[var(--danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--danger)]"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : `Save ${planTitles[planType].replace("Add ", "")}`}
            </Button>
          </form>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {planOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.type}
                  type="button"
                  aria-label={option.label}
                  onClick={() => setPlanType(option.type)}
                  className={`ios-pressable grid min-h-28 min-w-0 place-items-center content-center gap-2 rounded-[22px] border p-3 text-center ${option.className}`}
                >
                  <span className="grid size-10 place-items-center rounded-full bg-white/55 dark:bg-white/10">
                    <Icon size={20} />
                  </span>
                  <span className="text-sm font-bold text-[var(--foreground)]">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </IOSBottomSheet>
    </div>
  );
}
