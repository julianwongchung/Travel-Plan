// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleItem } from "@/lib/db/types";

const { dndHarness, reorderScheduleItems } = vi.hoisted(() => ({
  dndHarness: {
    onDragEnd: null as null | ((event: {
      active: { id: string };
      over: { id: string } | null;
    }) => void),
  },
  reorderScheduleItems: vi.fn(),
}));

vi.mock("@/lib/actions/trips", () => ({
  removeScheduleItem: vi.fn(),
  reorderScheduleItems,
}));

vi.mock("@dnd-kit/core", () => ({
  closestCenter: vi.fn(),
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd: typeof dndHarness.onDragEnd;
  }) => {
    dndHarness.onDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  KeyboardSensor: class KeyboardSensor {},
  PointerSensor: class PointerSensor {},
  TouchSensor: class TouchSensor {},
  useSensor: (sensor: unknown, options?: unknown) => ({ sensor, options }),
  useSensors: (...sensors: unknown[]) => sensors,
}));

vi.mock("@dnd-kit/sortable", () => ({
  arrayMove: <T,>(values: T[], from: number, to: number) => {
    const output = [...values];
    const [moved] = output.splice(from, 1);
    output.splice(to, 0, moved);
    return output;
  },
  KeyboardCoordinateGetter: {},
  SortableContext: ({
    children,
    items: sortableItems,
  }: {
    children: React.ReactNode;
    items: string[];
  }) => <div data-sortable-items={sortableItems.join(",")}>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: { "aria-roledescription": "sortable" },
    isDragging: false,
    listeners: { onPointerDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
  }),
  verticalListSortingStrategy: {},
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

import { ReorderableScheduleList } from "@/components/trip/reorderable-schedule-list";

const items: ScheduleItem[] = [
  {
    id: "item-1",
    trip_id: "trip-1",
    trip_day_id: "day-1",
    time_block: null,
    title: "Hotel",
    description: null,
    transport: null,
    food: null,
    notes: "https://maps.google.com/?q=Hotel",
    sort_order: 1,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: null,
  },
  {
    id: "item-2",
    trip_id: "trip-1",
    trip_day_id: "day-1",
    time_block: null,
    title: "Airport",
    description: null,
    transport: null,
    food: null,
    notes: "https://maps.google.com/?q=Airport",
    sort_order: 2,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: null,
  },
  {
    id: "item-3",
    trip_id: "trip-1",
    trip_day_id: "day-1",
    time_block: null,
    title: "Museum",
    description: null,
    transport: null,
    food: null,
    notes: "https://maps.google.com/?q=Museum",
    sort_order: 3,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: null,
  },
];

describe("ReorderableScheduleList", () => {
  beforeEach(() => {
    cleanup();
    dndHarness.onDragEnd = null;
    reorderScheduleItems.mockReset();
    reorderScheduleItems.mockResolvedValue(undefined);
  });

  function renderList() {
    return render(
      <ReorderableScheduleList
        tripId="trip-1"
        tripDayId="day-1"
        items={items}
        editable
      />,
    );
  }

  function renderedOrder(container: HTMLElement) {
    return Array.from(
      container.querySelectorAll<HTMLElement>("[data-schedule-item-id]"),
      (row) => row.dataset.scheduleItemId,
    );
  }

  it("moves the first stop below the second and persists the UUID order", async () => {
    const { container } = renderList();

    expect(dndHarness.onDragEnd).toBeTypeOf("function");
    act(() => {
      dndHarness.onDragEnd?.({
        active: { id: "item-1" },
        over: { id: "item-2" },
      });
    });

    expect(renderedOrder(container)).toEqual(["item-2", "item-1", "item-3"]);
    await waitFor(() => {
      expect(reorderScheduleItems).toHaveBeenCalledWith(
        "trip-1",
        "day-1",
        ["item-2", "item-1", "item-3"],
      );
    });
  });

  it("moves the third stop above the first and persists the UUID order", async () => {
    const { container } = renderList();

    act(() => {
      dndHarness.onDragEnd?.({
        active: { id: "item-3" },
        over: { id: "item-1" },
      });
    });

    expect(renderedOrder(container)).toEqual(["item-3", "item-1", "item-2"]);
    await waitFor(() => {
      expect(reorderScheduleItems).toHaveBeenCalledWith(
        "trip-1",
        "day-1",
        ["item-3", "item-1", "item-2"],
      );
    });
  });

  it("uses dedicated touch-safe drag handles and keeps existing actions", () => {
    const { container } = renderList();

    const handles = screen.getAllByRole("button", { name: /Reorder/ });
    expect(handles).toHaveLength(3);
    expect(handles.every((handle) => handle.className.includes("touch-none"))).toBe(true);
    expect(container.querySelector("[draggable=true]")).toBeNull();
    expect(container.querySelector("[data-sortable-items]")?.getAttribute("data-sortable-items"))
      .toBe("item-1,item-2,item-3");

    const mapLink = screen.getByRole("link", { name: "Open Hotel in Google Maps" });
    expect(mapLink.textContent).toBe("");
    expect(mapLink.getAttribute("target")).toBe("_blank");
    expect(screen.queryByText("Google Maps")).toBeNull();
    expect(screen.getByRole("button", { name: "Remove Hotel" })).toBeTruthy();
  });

  it("does not persist when an item is dropped outside the list", async () => {
    const { container } = render(
      <ReorderableScheduleList
        tripId="trip-1"
        tripDayId="day-1"
        items={items}
        editable
      />,
    );

    act(() => {
      dndHarness.onDragEnd?.({
        active: { id: "item-1" },
        over: null,
      });
    });

    expect(renderedOrder(container)).toEqual(["item-1", "item-2", "item-3"]);
    await waitFor(() => expect(reorderScheduleItems).not.toHaveBeenCalled());
  });
});
