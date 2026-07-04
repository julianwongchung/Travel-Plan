"use client";

import {
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type PointerSensorOptions,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bed, ChevronDown, ChevronUp, CircleEllipsis, GripVertical, MapPin, Pencil, Plane, Plus, Sparkles, Trash2, Utensils, BusFront, X } from "lucide-react";
import { removeScheduleItem, reorderScheduleItems, updateFlightScheduleItem, updateScheduleItemPlan } from "@/lib/actions/trips";
import { tripKeys } from "@/lib/db/query-keys";
import type { ScheduleItem, Traveler } from "@/lib/db/types";
import { formatDisplayDateAndTime } from "@/lib/utils/date-format";
import {
  flightArrivalDayOffset,
  flightStopoverSummary,
  parseFlightPlanDescription,
  scheduleItemCategory,
  type FlightPlan,
  type FlightPlanSegment,
} from "@/lib/utils/schedule-item-plan";
import { passengerColors, type PassengerColor } from "@/lib/utils/traveler-colors";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-fields";
import { IOSBottomSheet } from "@/components/ui/ios-bottom-sheet";

function webLink(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function ordered(items: ScheduleItem[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

function renumber(items: ScheduleItem[]) {
  return items.map((item, index) => ({
    ...item,
    sort_order: index + 1,
  }));
}

class NonTouchPointerSensor extends PointerSensor {
  static activators = [{
    eventName: "onPointerDown" as const,
    handler: (
      { nativeEvent: event }: ReactPointerEvent,
      { onActivation }: PointerSensorOptions,
    ) => {
      if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0) {
        return false;
      }

      onActivation?.({ event });
      return true;
    },
  }];
}

const itineraryCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
};

const categoryStyles = {
  flight: { label: "Flight", icon: Plane, accent: "#2563eb", badge: "bg-blue-600 text-white" },
  lodging: { label: "Lodging", icon: Bed, accent: "#7c3aed", badge: "bg-violet-600 text-white" },
  activity: { label: "Activity", icon: Sparkles, accent: "#16a34a", badge: "bg-emerald-600 text-white" },
  food: { label: "Food", icon: Utensils, accent: "#f97316", badge: "bg-orange-500 text-white" },
  transport: { label: "Transport", icon: BusFront, accent: "#0891b2", badge: "bg-cyan-600 text-white" },
  other: { label: "Other", icon: CircleEllipsis, accent: "#64748b", badge: "bg-slate-600 text-white" },
};

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

function emptyFlightSegment(previous?: FlightPlanSegment): FlightPlanSegment {
  return {
    origin: previous?.destination ?? "",
    destination: "",
    departureDate: previous?.arrivalDate ?? previous?.departureDate ?? "",
    departureTime: "",
    arrivalDate: previous?.arrivalDate ?? previous?.departureDate ?? "",
    arrivalTime: "",
  };
}

function formatFlightDateTime(date: string, time: string) {
  return formatDisplayDateAndTime(date, time, "");
}

function toLocalDateTimeValue(date: string, time: string) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

function splitLocalDateTimeValue(value: string) {
  const [date = "", timeWithSeconds = ""] = value.split("T");
  const [hour = "", minute = ""] = timeWithSeconds.split(":");
  return {
    date,
    time: hour && minute ? `${hour}:${minute}` : timeWithSeconds,
  };
}

function dateTimeInputValue(value: string | null | undefined) {
  const cleaned = value?.trim();
  if (!cleaned) return "";
  const normalized = cleaned.replace(" ", "T");
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return match ? `${match[1]}T${match[2]}` : "";
}

function hotelDetailValue(description: string | null, label: "Check-in" | "Check-out") {
  const prefix = `${label}:`;
  return description
    ?.split(" - ")
    .find((part) => part.trim().startsWith(prefix))
    ?.slice(prefix.length)
    .trim() ?? "";
}

function hotelNotesValue(description: string | null) {
  return description
    ?.split(" - ")
    .filter((part) => {
      const trimmed = part.trim();
      return !trimmed.startsWith("Check-in:") && !trimmed.startsWith("Check-out:");
    })
    .join(" - ")
    .trim() ?? "";
}

function FlightScheduleItemEditor({
  disabled,
  flightPlan,
  item,
  travelers,
  tripId,
}: {
  disabled: boolean;
  flightPlan: FlightPlan;
  item: ScheduleItem;
  travelers: Pick<Traveler, "id" | "name" | "created_at">[];
  tripId: string;
}) {
  const [open, setOpen] = useState(false);
  const [draftSegments, setDraftSegments] = useState(flightPlan.segments);
  const [selectedPassengers, setSelectedPassengers] = useState(flightPlan.passengers);
  const [manualPassenger, setManualPassenger] = useState(flightPlan.passengers.join(", "));
  const [flightNotes, setFlightNotes] = useState(flightPlan.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function openEditor() {
    setDraftSegments(flightPlan.segments);
    setSelectedPassengers(flightPlan.passengers);
    setManualPassenger(flightPlan.passengers.join(", "));
    setFlightNotes(flightPlan.notes ?? "");
    setError(null);
    setOpen(true);
  }

  function closeEditor() {
    if (isSaving) return;
    setOpen(false);
    setError(null);
  }

  function updateSegment(index: number, field: keyof FlightPlanSegment, value: string) {
    setDraftSegments((segments) => segments.map((segment, segmentIndex) => (
      segmentIndex === index
        ? { ...segment, [field]: value }
        : segment
    )));
  }

  function updateSegmentDateTime(
    index: number,
    dateField: "departureDate" | "arrivalDate",
    timeField: "departureTime" | "arrivalTime",
    value: string,
  ) {
    const { date, time } = splitLocalDateTimeValue(value);
    setDraftSegments((segments) => segments.map((segment, segmentIndex) => (
      segmentIndex === index
        ? { ...segment, [dateField]: date, [timeField]: time }
        : segment
    )));
  }

  function addSegment() {
    setDraftSegments((segments) => [
      ...segments,
      emptyFlightSegment(segments.at(-1)),
    ]);
  }

  function removeSegment(index: number) {
    setDraftSegments((segments) => (
      segments.length > 1 ? segments.filter((_, segmentIndex) => segmentIndex !== index) : segments
    ));
  }

  function togglePassenger(name: string) {
    setSelectedPassengers((current) => (
      current.includes(name)
        ? current.filter((passenger) => passenger !== name)
        : [...current, name]
    ));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await updateFlightScheduleItem(tripId, item.id, formData);
        setOpen(false);
        setError(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: tripKeys.schedule(tripId) }),
          queryClient.invalidateQueries({ queryKey: tripKeys.overview(tripId) }),
        ]);
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : "Unable to update flight.");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="size-11 shrink-0 p-0"
        aria-label={`Edit ${item.title}`}
        disabled={disabled}
        onClick={openEditor}
      >
        <Pencil size={16} />
      </Button>

      <IOSBottomSheet open={open} title="Edit Flight" onClose={closeEditor}>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <input type="hidden" name="flight_segment_count" value={draftSegments.length} />
          <div className="grid gap-3">
            {draftSegments.map((segment, index) => (
              <section
                key={index}
                className="grid gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--muted)] p-3"
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">Segment {index + 1}</h3>
                  {draftSegments.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeSegment(index)}
                      className="ios-pressable grid size-9 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--card-strong)] hover:text-[var(--danger)]"
                      aria-label={`Remove segment ${index + 1}`}
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <Field label="Origin / From">
                    <Input
                      name={`flight_segments.${index}.origin`}
                      required
                      value={segment.origin}
                      onChange={(event) => updateSegment(index, "origin", event.target.value)}
                    />
                  </Field>
                  <Field label="Departure date & time">
                    <Input
                      name={`flight_segments.${index}.departure_at`}
                      type="datetime-local"
                      lang="en-GB"
                      required
                      value={toLocalDateTimeValue(segment.departureDate, segment.departureTime)}
                      onChange={(event) => updateSegmentDateTime(index, "departureDate", "departureTime", event.target.value)}
                    />
                  </Field>
                  <Field label="Destination / To">
                    <Input
                      name={`flight_segments.${index}.destination`}
                      required
                      value={segment.destination}
                      onChange={(event) => updateSegment(index, "destination", event.target.value)}
                    />
                  </Field>
                  <Field label="Arrival date & time">
                    <Input
                      name={`flight_segments.${index}.arrival_at`}
                      type="datetime-local"
                      lang="en-GB"
                      required
                      value={toLocalDateTimeValue(segment.arrivalDate, segment.arrivalTime)}
                      onChange={(event) => updateSegmentDateTime(index, "arrivalDate", "arrivalTime", event.target.value)}
                    />
                  </Field>
                </div>
              </section>
            ))}
          </div>

          <div className="grid gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--muted)] p-3">
            {travelers.length ? (
              <div className="grid gap-2 text-sm font-semibold text-[var(--foreground)]">
                <span>Passenger</span>
                <div className="grid gap-2">
                  {travelers.map((traveler) => {
                    const travelerPassenger = passengerColors([traveler.name], travelers)[0];
                    return (
                    <label
                      key={traveler.id}
                      className="ios-pressable flex min-h-11 items-center gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--card-strong)] px-3 text-sm font-semibold"
                      style={travelerPassenger ? {
                        borderColor: selectedPassengers.includes(traveler.name) ? travelerPassenger.color.border : undefined,
                        backgroundColor: selectedPassengers.includes(traveler.name) ? travelerPassenger.color.soft : undefined,
                      } : undefined}
                    >
                      <input
                        type="checkbox"
                        name="flight_passenger_names"
                        value={traveler.name}
                        checked={selectedPassengers.includes(traveler.name)}
                        onChange={() => togglePassenger(traveler.name)}
                        className="size-4"
                        style={travelerPassenger ? { accentColor: travelerPassenger.color.accent } : undefined}
                      />
                      {travelerPassenger ? <TravelerChip passenger={travelerPassenger} /> : <span>{traveler.name}</span>}
                    </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Field label="Passenger">
                <Input
                  name="flight_passenger_name"
                  required
                  value={manualPassenger}
                  onChange={(event) => setManualPassenger(event.target.value)}
                />
              </Field>
            )}

            <Field label="Notes">
              <Textarea
                name="flight_notes"
                placeholder="Optional notes"
                className="min-h-20"
                value={flightNotes}
                onChange={(event) => setFlightNotes(event.target.value)}
              />
            </Field>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={addSegment}
            disabled={draftSegments.length >= 6 || isSaving}
          >
            <Plus size={16} aria-hidden="true" />
            + Add connecting flight
          </Button>

          {error ? (
            <p role="alert" className="rounded-[16px] bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={closeEditor} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save flight"}
            </Button>
          </div>
        </form>
      </IOSBottomSheet>
    </>
  );
}

function ScheduleItemPlanEditor({
  category,
  disabled,
  item,
  tripId,
}: {
  category: "lodging" | "activity";
  disabled: boolean;
  item: ScheduleItem;
  tripId: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const planType = category === "lodging" ? "hotel" : "place";
  const title = planType === "hotel" ? "Edit Hotel" : "Edit Place";
  const saveLabel = planType === "hotel" ? "Save hotel" : "Save place";

  function closeEditor() {
    if (isSaving) return;
    setOpen(false);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await updateScheduleItemPlan(tripId, item.id, formData);
        setOpen(false);
        setError(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: tripKeys.schedule(tripId) }),
          queryClient.invalidateQueries({ queryKey: tripKeys.overview(tripId) }),
        ]);
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : `Unable to update ${planType}.`);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="size-11 shrink-0 p-0"
        aria-label={`Edit ${item.title}`}
        disabled={disabled}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Pencil size={16} />
      </Button>

      <IOSBottomSheet open={open} title={title} onClose={closeEditor}>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <input type="hidden" name="plan_type" value={planType} />

          {planType === "hotel" ? (
            <div className="grid gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--muted)] p-3">
              <Field label="Hotel name">
                <Input name="hotel_name" defaultValue={item.title} required />
              </Field>
              <Field label="Check-in date & time">
                <Input
                  name="check_in"
                  type="datetime-local"
                  lang="en-GB"
                  defaultValue={dateTimeInputValue(hotelDetailValue(item.description, "Check-in") || item.time_block)}
                />
              </Field>
              <Field label="Check-out date & time">
                <Input
                  name="check_out"
                  type="datetime-local"
                  lang="en-GB"
                  defaultValue={dateTimeInputValue(hotelDetailValue(item.description, "Check-out"))}
                />
              </Field>
              <Field label="Notes">
                <Textarea
                  name="plan_notes"
                  placeholder="Optional notes"
                  className="min-h-20"
                  defaultValue={hotelNotesValue(item.description)}
                />
              </Field>
            </div>
          ) : (
            <div className="grid gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--muted)] p-3">
              <Field label="Place name">
                <Input name="place_name" defaultValue={item.title} required />
              </Field>
              <Field label="Time">
                <Input name="place_time" defaultValue={item.time_block ?? ""} placeholder="18:00" />
              </Field>
              <Field label="Notes">
                <Textarea
                  name="plan_notes"
                  placeholder="Optional notes"
                  className="min-h-20"
                  defaultValue={item.description ?? ""}
                />
              </Field>
            </div>
          )}

          {error ? (
            <p role="alert" className="rounded-[16px] bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={closeEditor} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : saveLabel}
            </Button>
          </div>
        </form>
      </IOSBottomSheet>
    </>
  );
}

function SortableScheduleItem({
  allowEdit,
  allowRemove,
  allowReorder,
  canMoveDown,
  canMoveUp,
  index,
  isPending,
  item,
  onMoveDown,
  onMoveUp,
  travelers,
  tripId,
}: {
  allowEdit: boolean;
  allowRemove: boolean;
  allowReorder: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  index: number;
  isPending: boolean;
  item: ScheduleItem;
  onMoveDown: () => void;
  onMoveUp: () => void;
  travelers: Pick<Traveler, "id" | "name" | "created_at">[];
  tripId: string;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: item.id,
    disabled: !allowReorder || isPending,
  });
  const mapLink = webLink(item.notes);
  const category = scheduleItemCategory(item);
  const categoryStyle = categoryStyles[category];
  const CategoryIcon = categoryStyle.icon;
  const flightPlan = parseFlightPlanDescription(item.description);
  const flightPassengerColors = flightPlan ? passengerColors(flightPlan.passengers, travelers) : [];
  const singleFlightPassenger = flightPassengerColors.length === 1 ? flightPassengerColors[0] : null;
  const canEditPlanItem = allowEdit && !flightPlan && (category === "lodging" || category === "activity");
  const flightPassengers = flightPlan?.passengers.join(", ") ?? null;
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isRemoving, startRemoveTransition] = useTransition();
  const queryClient = useQueryClient();
  const detail = flightPlan
    ? [flightStopoverSummary(flightPlan.segments), flightPassengers ? `Passengers: ${flightPassengers}` : null].filter(Boolean).join(" - ")
    : (item.description ?? item.time_block ?? (mapLink ? null : item.notes));
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    "--itinerary-accent": singleFlightPassenger?.color.accent ?? categoryStyle.accent,
  } as CSSProperties;

  function handleRemoveSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRemoveError(null);

    startRemoveTransition(async () => {
      try {
        await removeScheduleItem(tripId, item.id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: tripKeys.schedule(tripId) }),
          queryClient.invalidateQueries({ queryKey: tripKeys.overview(tripId) }),
        ]);
      } catch (submissionError) {
        setRemoveError(
          submissionError instanceof Error
            ? submissionError.message
            : "Unable to remove this item.",
        );
      }
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
      data-schedule-item-id={item.id}
      className={`itinerary-category-card relative rounded-[18px] border p-2.5 transition-[opacity,box-shadow] ${
        isDragging ? "opacity-70 shadow-xl" : "opacity-100"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {allowReorder ? (
          <button
            type="button"
            aria-label={`Reorder ${item.title}`}
            disabled={isPending}
            {...attributes}
            {...listeners}
            className="itinerary-drag-handle ios-pressable grid size-11 shrink-0 cursor-grab place-items-center rounded-full text-[var(--muted-foreground)] active:cursor-grabbing disabled:cursor-wait disabled:opacity-50"
          >
            <GripVertical size={18} />
          </button>
        ) : null}

        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white"
          style={singleFlightPassenger ? { backgroundColor: singleFlightPassenger.color.accent } : undefined}
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${categoryStyle.badge}`}>
              <CategoryIcon size={11} />
              {categoryStyle.label}
            </span>
            {flightPassengerColors.map((passenger) => (
              <TravelerChip key={`${item.id}-${passenger.name}`} passenger={passenger} />
            ))}
            {item.time_block ? (
              <span className="text-xs font-medium text-[var(--muted-foreground)]">{item.time_block}</span>
            ) : null}
          </div>
          {detail && detail !== item.time_block ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">{detail}</p>
          ) : null}
          {flightPlan ? (
            <div className="mt-2 grid gap-1.5">
              {flightPlan.segments.map((segment, segmentIndex) => (
                <p
                  key={`${segment.origin}-${segment.destination}-${segmentIndex}`}
                  className="rounded-[12px] bg-white/55 px-2 py-1 text-[11px] font-semibold leading-4 text-[var(--muted-foreground)] dark:bg-white/10"
                >
                  {segmentIndex + 1}. {segment.origin} to {segment.destination} / {formatFlightDateTime(segment.departureDate, segment.departureTime)} to {formatFlightDateTime(segment.arrivalDate, segment.arrivalTime)}
                  {flightArrivalDayOffset(segment) ? ` (${flightArrivalDayOffset(segment)})` : ""}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {mapLink ? (
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${item.title} in Google Maps`}
              className="ios-pressable grid size-11 place-items-center rounded-full text-[var(--primary)] hover:bg-[var(--primary-soft)]"
            >
              <MapPin size={17} />
            </a>
          ) : null}

          {allowEdit && flightPlan ? (
            <FlightScheduleItemEditor
              disabled={isPending}
              flightPlan={flightPlan}
              item={item}
              travelers={travelers}
              tripId={tripId}
            />
          ) : null}

          {canEditPlanItem ? (
            <ScheduleItemPlanEditor
              category={category}
              disabled={isPending}
              item={item}
              tripId={tripId}
            />
          ) : null}

          {allowRemove ? (
            <form onSubmit={handleRemoveSubmit}>
              <Button
                type="submit"
                variant="ghost"
                className="size-11 shrink-0 p-0 text-[var(--danger)]"
                aria-label={`Remove ${item.title}`}
                disabled={isPending || isRemoving}
              >
                <Trash2 size={16} />
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      {removeError ? (
        <p role="alert" className="mt-2 rounded-[14px] bg-[var(--danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--danger)]">
          {removeError}
        </p>
      ) : null}

      {allowReorder ? (
        <div className="mt-1 flex justify-end gap-1 border-t border-[var(--border)] pt-1 sm:hidden">
          <button
            type="button"
            aria-label={`Move ${item.title} up`}
            disabled={isPending || !canMoveUp}
            onClick={onMoveUp}
            className="ios-pressable grid size-11 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--card)] disabled:opacity-30"
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            aria-label={`Move ${item.title} down`}
            disabled={isPending || !canMoveDown}
            onClick={onMoveDown}
            className="ios-pressable grid size-11 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--card)] disabled:opacity-30"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ReorderableScheduleList({
  allowEdit,
  allowRemove,
  allowReorder,
  removeDisabledItemIds = [],
  targetDayDate,
  targetDayNumber,
  tripId,
  tripDayId,
  items,
  editable,
  travelers = [],
}: {
  allowEdit?: boolean;
  allowRemove?: boolean;
  allowReorder?: boolean;
  removeDisabledItemIds?: string[];
  targetDayDate?: string;
  targetDayNumber?: number;
  tripId: string;
  tripDayId: string;
  items: ScheduleItem[];
  editable: boolean;
  travelers?: Pick<Traveler, "id" | "name" | "created_at">[];
}) {
  const [orderedItems, setOrderedItems] = useState(() => ordered(items));
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const canEditItems = allowEdit ?? editable;
  const canRemoveItems = allowRemove ?? editable;
  const canReorderItems = allowReorder ?? editable;
  const removeDisabledItems = new Set(removeDisabledItemIds);
  const sensors = useSensors(
    useSensor(NonTouchPointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function moveItem(activeId: string, overId: string) {
    const previousItems = orderedItems;
    const activeIndex = orderedItems.findIndex((item) => item.id === activeId);
    const overIndex = orderedItems.findIndex((item) => item.id === overId);
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return;

    const nextItems = renumber(arrayMove(orderedItems, activeIndex, overIndex));
    setReorderError(null);
    setOrderedItems(nextItems);

    startTransition(async () => {
      try {
        const orderedIds = nextItems.map((item) => item.id);
        if (targetDayDate) {
          await reorderScheduleItems(
            tripId,
            tripDayId,
            orderedIds,
            targetDayDate,
            targetDayNumber,
          );
        } else {
          await reorderScheduleItems(tripId, tripDayId, orderedIds);
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: tripKeys.schedule(tripId) }),
          queryClient.invalidateQueries({ queryKey: tripKeys.overview(tripId) }),
        ]);
      } catch (submissionError) {
        setOrderedItems(previousItems);
        setReorderError(
          submissionError instanceof Error
            ? submissionError.message
            : "Unable to save this itinerary order.",
        );
      }
    });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    moveItem(String(active.id), String(over.id));
  }

  function moveBy(index: number, offset: -1 | 1) {
    const target = orderedItems[index + offset];
    const item = orderedItems[index];
    if (!item || !target) return;
    moveItem(item.id, target.id);
  }

  return (
    <DndContext
      id={`itinerary-${tripDayId}`}
      sensors={sensors}
      collisionDetection={itineraryCollisionDetection}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedItems.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          role="list"
          aria-label="Itinerary stops"
          aria-busy={isPending}
          className="grid min-w-0 gap-3"
        >
          {orderedItems.map((item, index) => (
            <SortableScheduleItem
              key={item.id}
              tripId={tripId}
              item={item}
              index={index}
              allowEdit={canEditItems}
              allowRemove={canRemoveItems && !removeDisabledItems.has(item.id)}
              allowReorder={canReorderItems}
              canMoveUp={index > 0}
              canMoveDown={index < orderedItems.length - 1}
              isPending={isPending}
              onMoveUp={() => moveBy(index, -1)}
              onMoveDown={() => moveBy(index, 1)}
              travelers={travelers}
            />
          ))}
        </div>
        {reorderError ? (
          <p role="alert" className="rounded-[14px] bg-[var(--danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--danger)]">
            {reorderError}
          </p>
        ) : null}
      </SortableContext>
    </DndContext>
  );
}
