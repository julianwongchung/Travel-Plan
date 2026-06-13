"use client";

import {
  useState,
  useTransition,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
import { Bed, ChevronDown, ChevronUp, CircleEllipsis, GripVertical, MapPin, Plane, Sparkles, Trash2, Utensils, BusFront } from "lucide-react";
import { removeScheduleItem, reorderScheduleItems } from "@/lib/actions/trips";
import type { ScheduleItem } from "@/lib/db/types";
import { scheduleItemCategory } from "@/lib/utils/schedule-item-plan";
import { Button } from "@/components/ui/button";

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

function SortableScheduleItem({
  canMoveDown,
  canMoveUp,
  editable,
  index,
  isPending,
  item,
  onMoveDown,
  onMoveUp,
  tripId,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  editable: boolean;
  index: number;
  isPending: boolean;
  item: ScheduleItem;
  onMoveDown: () => void;
  onMoveUp: () => void;
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
    disabled: !editable || isPending,
  });
  const mapLink = webLink(item.notes);
  const category = scheduleItemCategory(item);
  const categoryStyle = categoryStyles[category];
  const CategoryIcon = categoryStyle.icon;
  const detail = item.description ?? item.time_block ?? (mapLink ? null : item.notes);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    "--itinerary-accent": categoryStyle.accent,
  } as CSSProperties;

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
        {editable ? (
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

        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${categoryStyle.badge}`}>
              <CategoryIcon size={11} />
              {categoryStyle.label}
            </span>
            {item.time_block ? (
              <span className="text-xs font-medium text-[var(--muted-foreground)]">{item.time_block}</span>
            ) : null}
          </div>
          {detail && detail !== item.time_block ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">{detail}</p>
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

          {editable ? (
            <form action={removeScheduleItem.bind(null, tripId, item.id)}>
              <Button
                type="submit"
                variant="ghost"
                className="size-11 shrink-0 p-0 text-[var(--danger)]"
                aria-label={`Remove ${item.title}`}
                disabled={isPending}
              >
                <Trash2 size={16} />
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      {editable ? (
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
  tripId,
  tripDayId,
  items,
  editable,
}: {
  tripId: string;
  tripDayId: string;
  items: ScheduleItem[];
  editable: boolean;
}) {
  const [orderedItems, setOrderedItems] = useState(() => ordered(items));
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(NonTouchPointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 4 },
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
    setOrderedItems(nextItems);

    startTransition(async () => {
      try {
        await reorderScheduleItems(
          tripId,
          tripDayId,
          nextItems.map((item) => item.id),
        );
      } catch {
        setOrderedItems(previousItems);
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
              canMoveUp={index > 0}
              canMoveDown={index < orderedItems.length - 1}
              editable={editable}
              isPending={isPending}
              onMoveUp={() => moveBy(index, -1)}
              onMoveDown={() => moveBy(index, 1)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
