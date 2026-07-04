"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bed, CalendarDays, ChevronLeft, MapPin, Plane, Plus, X } from "lucide-react";
import { addScheduleItem } from "@/lib/actions/trips";
import { tripKeys } from "@/lib/db/query-keys";
import type { Traveler } from "@/lib/db/types";
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

type FlightDateTimeField = "departure" | "arrival";

type ParsedFlightDateTime = {
  date: string;
  display: string;
  iso: string;
  time: string;
};

function padTwoDigits(value: string) {
  return value.padStart(2, "0");
}

function isValidDateParts(year: string, month: string, day: string) {
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const date = new Date(Date.UTC(numericYear, numericMonth - 1, numericDay));

  return (
    Number.isInteger(numericYear)
    && Number.isInteger(numericMonth)
    && Number.isInteger(numericDay)
    && date.getUTCFullYear() === numericYear
    && date.getUTCMonth() === numericMonth - 1
    && date.getUTCDate() === numericDay
  );
}

function parseFlightDateTime(value: string): ParsedFlightDateTime | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T|\s+)(\d{1,2}):(\d{2})$/);
  const displayMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{2})$/);
  const match = isoMatch ?? displayMatch;
  if (!match) return null;

  const [, first, second, third, hourValue, minuteValue] = match;
  const isIsoInput = match === isoMatch;
  const year = isIsoInput ? first : third;
  const month = padTwoDigits(second);
  const day = padTwoDigits(isIsoInput ? third : first);
  const hour = padTwoDigits(hourValue);
  const minute = minuteValue;

  if (
    Number(hour) > 23
    || Number(minute) > 59
    || !isValidDateParts(year, month, day)
  ) {
    return null;
  }

  const date = `${year}-${month}-${day}`;
  const time = `${hour}:${minute}`;

  return {
    date,
    display: `${day}/${month}/${year} ${time}`,
    iso: `${date}T${time}`,
    time,
  };
}

function displayFlightDateTimeFromLocalValue(value: string) {
  return parseFlightDateTime(value)?.display ?? "";
}

function FlightDateTimeInput({
  field,
  label,
  segmentIndex,
}: {
  field: FlightDateTimeField;
  label: string;
  segmentIndex: number;
}) {
  const [value, setValue] = useState("");
  const parsedValue = parseFlightDateTime(value);
  const baseName = `flight_segments.${segmentIndex}`;

  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-[var(--foreground)]">
      <span>{label}</span>
      <span className="relative block min-h-12 min-w-0">
        <Input
          type="text"
          required
          inputMode="numeric"
          placeholder="DD/MM/YYYY HH:mm"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => {
            if (parsedValue) setValue(parsedValue.display);
          }}
          aria-label={label}
          autoComplete="off"
          className="pr-14 font-semibold tabular-nums"
        />
        <span className="absolute right-0 top-0 grid size-12 place-items-center rounded-[16px] text-[var(--muted-foreground)]">
          <CalendarDays
            size={17}
            aria-hidden="true"
            className="pointer-events-none"
          />
          <input
            type="datetime-local"
            lang="en-GB"
            aria-label={`${label} calendar`}
            value={parsedValue?.iso ?? ""}
            onChange={(event) => {
              const displayValue = displayFlightDateTimeFromLocalValue(event.target.value);
              setValue(displayValue);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </span>
      </span>
      <input type="hidden" name={`${baseName}.${field}_at`} value={parsedValue?.iso ?? ""} />
      <input type="hidden" name={`${baseName}.${field}_date`} value={parsedValue?.date ?? ""} />
      <input type="hidden" name={`${baseName}.${field}_time`} value={parsedValue?.time ?? ""} />
      <span className="text-xs font-semibold text-[var(--muted-foreground)]">
        Use 24-hour time, e.g. 20/11/2026 18:00.
      </span>
    </label>
  );
}

export function AddItineraryPlan({
  tripId,
  dayId,
  dayDate,
  dayNumber,
  travelers = [],
}: {
  tripId: string;
  dayId: string | null;
  dayDate: string;
  dayNumber: number;
  travelers?: Pick<Traveler, "id" | "name">[];
}) {
  const [open, setOpen] = useState(false);
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [flightSegmentIds, setFlightSegmentIds] = useState([0]);
  const [nextFlightSegmentId, setNextFlightSegmentId] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function closeSheet() {
    if (isPending) return;
    setOpen(false);
    setPlanType(null);
    setFlightSegmentIds([0]);
    setNextFlightSegmentId(1);
    setError(null);
  }

  function submitPlan(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addScheduleItem(tripId, formData);
        setOpen(false);
        setPlanType(null);
        setFlightSegmentIds([0]);
        setNextFlightSegmentId(1);
        setError(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: tripKeys.schedule(tripId) }),
          queryClient.invalidateQueries({ queryKey: tripKeys.days(tripId) }),
          queryClient.invalidateQueries({ queryKey: tripKeys.overview(tripId) }),
        ]);
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Could not add this plan.",
        );
      }
    });
  }

  function choosePlanType(nextPlanType: PlanType) {
    setPlanType(nextPlanType);
    setError(null);
    if (nextPlanType === "flight") {
      setFlightSegmentIds([0]);
      setNextFlightSegmentId(1);
    }
  }

  function addFlightSegment() {
    setFlightSegmentIds((current) => [...current, nextFlightSegmentId]);
    setNextFlightSegmentId((current) => current + 1);
  }

  function removeFlightSegment(segmentId: number) {
    setFlightSegmentIds((current) => current.length > 1
      ? current.filter((id) => id !== segmentId)
      : current);
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
                setFlightSegmentIds([0]);
                setNextFlightSegmentId(1);
                setError(null);
              }}
              className="ios-pressable -mt-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-full px-2 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              <ChevronLeft size={17} />
              Choose another type
            </button>

            {planType === "flight" ? (
              <>
                <input type="hidden" name="flight_segment_count" value={flightSegmentIds.length} />
                <div className="grid gap-3">
                  {flightSegmentIds.map((segmentId, segmentIndex) => (
                    <section
                      key={segmentId}
                      className="grid gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--muted)] p-3"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <h3 className="text-sm font-bold">Segment {segmentIndex + 1}</h3>
                        {flightSegmentIds.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeFlightSegment(segmentId)}
                            className="ios-pressable grid size-9 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--card-strong)] hover:text-[var(--danger)]"
                            aria-label={`Remove segment ${segmentIndex + 1}`}
                          >
                            <X size={16} />
                          </button>
                        ) : null}
                      </div>

                      <div className="grid gap-3">
                        <Field label="Origin / From">
                          <Input
                            name={`flight_segments.${segmentIndex}.origin`}
                            required
                            placeholder="Kuching"
                            autoComplete="off"
                          />
                        </Field>
                        <FlightDateTimeInput
                          field="departure"
                          label="Departure date & time"
                          segmentIndex={segmentIndex}
                        />
                        <Field label="Destination / To">
                          <Input
                            name={`flight_segments.${segmentIndex}.destination`}
                            required
                            placeholder={segmentIndex === 0 ? "Kuala Lumpur" : "Osaka"}
                            autoComplete="off"
                          />
                        </Field>
                        <FlightDateTimeInput
                          field="arrival"
                          label="Arrival date & time"
                          segmentIndex={segmentIndex}
                        />
                      </div>
                    </section>
                  ))}
                </div>

                <div className="grid gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--muted)] p-3">
                  {travelers.length ? (
                    <div className="grid gap-2 text-sm font-semibold text-[var(--foreground)]">
                      <span>Passenger</span>
                      <div className="grid gap-2">
                        {travelers.map((traveler) => (
                          <label
                            key={traveler.id}
                            className="ios-pressable flex min-h-11 items-center gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--card-strong)] px-3 text-sm font-semibold"
                          >
                            <input
                              type="checkbox"
                              name="flight_passenger_names"
                              value={traveler.name}
                              className="size-4 accent-[var(--primary)]"
                            />
                            <span>{traveler.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Field label="Passenger">
                      <Input
                        name="flight_passenger_name"
                        required
                        placeholder="Julian"
                        autoComplete="name"
                      />
                    </Field>
                  )}

                  <Field label="Notes">
                    <Textarea
                      name="flight_notes"
                      placeholder="Optional notes"
                      className="min-h-20"
                    />
                  </Field>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={addFlightSegment}
                  disabled={flightSegmentIds.length >= 6}
                >
                  <Plus size={16} aria-hidden="true" />
                  + Add connecting flight
                </Button>
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
                    <Input name="check_in" type="datetime-local" lang="en-GB" />
                  </Field>
                  <Field label="Check-out">
                    <Input name="check_out" type="datetime-local" lang="en-GB" />
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

            {planType !== "flight" ? (
              <Field label="Notes">
                <Textarea
                  name="plan_notes"
                  placeholder="Optional notes"
                  className="min-h-24"
                />
              </Field>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-[16px] bg-[var(--danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--danger)]"
              >
                {error}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={closeSheet} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : `Save ${planTitles[planType].replace("Add ", "")}`}
              </Button>
            </div>
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
                  onClick={() => choosePlanType(option.type)}
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
