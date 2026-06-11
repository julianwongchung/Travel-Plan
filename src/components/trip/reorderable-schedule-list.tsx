"use client";

import { useState, useTransition, type CSSProperties } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MapPin, Trash2 } from "lucide-react";
import { removeScheduleItem, reorderScheduleItems } from "@/lib/actions/trips";
import type { ScheduleItem } from "@/lib/db/types";
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

function SortableScheduleItem({
  editable,
  index,
  isPending,
  item,
  tripId,
}: {
  editable: boolean;
  index: number;
  isPending: boolean;
  item: ScheduleItem;
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
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="listitem"
      data-schedule-item-id={item.id}
      className={`relative rounded-[18px] border border-[var(--border)] bg-[var(--muted)] p-2.5 transition-[opacity,box-shadow] ${
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
            className="ios-pressable grid size-11 shrink-0 touch-none cursor-grab place-items-center rounded-full text-[var(--muted-foreground)] active:cursor-grabbing disabled:cursor-wait disabled:opacity-50"
          >
            <GripVertical size={18} />
          </button>
        ) : null}

        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
          {index + 1}
        </span>

        <p className="min-w-0 flex-1 break-words text-sm font-semibold text-[var(--foreground)]">
          {item.title}
        </p>

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
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;

    const previousItems = orderedItems;
    const activeIndex = orderedItems.findIndex((item) => item.id === active.id);
    const overIndex = orderedItems.findIndex((item) => item.id === over.id);
    if (activeIndex < 0 || overIndex < 0) return;

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

  return (
    <DndContext
      id={`itinerary-${tripDayId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
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
              editable={editable}
              isPending={isPending}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
