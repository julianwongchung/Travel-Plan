// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScheduleItem } from "@/lib/db/types";
import { serializeFlightPlan } from "@/lib/utils/schedule-item-plan";

const { closestCenter, dndHarness, invalidateQueries, pointerWithin, refresh, removeScheduleItem, reorderScheduleItems, updateFlightScheduleItem, updateScheduleItemPlan } = vi.hoisted(() => ({
  closestCenter: vi.fn(),
  dndHarness: {
    collisionDetection: null as null | ((args: unknown) => unknown),
    onDragEnd: null as null | ((event: {
      active: { id: string };
      over: { id: string } | null;
    }) => void),
    sensors: [] as Array<{
      sensor: {
        activators?: Array<{
          handler: (
            event: { nativeEvent: { button: number; isPrimary: boolean; pointerType: string } },
            options: { onActivation?: (args: { event: Event }) => void },
          ) => boolean;
        }>;
      };
      options?: unknown;
    }>,
  },
  invalidateQueries: vi.fn(),
  pointerWithin: vi.fn(),
  refresh: vi.fn(),
  removeScheduleItem: vi.fn(),
  reorderScheduleItems: vi.fn(),
  updateFlightScheduleItem: vi.fn(),
  updateScheduleItemPlan: vi.fn(),
}));

vi.mock("@/lib/actions/trips", () => ({
  removeScheduleItem,
  reorderScheduleItems,
  updateFlightScheduleItem,
  updateScheduleItemPlan,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    collisionDetection,
    onDragEnd,
    sensors,
  }: {
    children: React.ReactNode;
    collisionDetection: typeof dndHarness.collisionDetection;
    onDragEnd: typeof dndHarness.onDragEnd;
    sensors: typeof dndHarness.sensors;
  }) => {
    dndHarness.collisionDetection = collisionDetection;
    dndHarness.onDragEnd = onDragEnd;
    dndHarness.sensors = sensors;
    return <div data-testid="dnd-context">{children}</div>;
  },
  closestCenter,
  KeyboardSensor: class KeyboardSensor {},
  PointerSensor: class PointerSensor {
    static activators = [{
      handler: ({
        nativeEvent,
      }: {
        nativeEvent: { button: number; isPrimary: boolean };
      }) => nativeEvent.isPrimary && nativeEvent.button === 0,
    }];
  },
  pointerWithin,
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
    closestCenter.mockReset();
    dndHarness.collisionDetection = null;
    dndHarness.onDragEnd = null;
    dndHarness.sensors = [];
    invalidateQueries.mockReset();
    pointerWithin.mockReset();
    refresh.mockReset();
    removeScheduleItem.mockReset();
    removeScheduleItem.mockResolvedValue(undefined);
    reorderScheduleItems.mockReset();
    reorderScheduleItems.mockResolvedValue(undefined);
    updateFlightScheduleItem.mockReset();
    updateFlightScheduleItem.mockResolvedValue(undefined);
    updateScheduleItemPlan.mockReset();
    updateScheduleItemPlan.mockResolvedValue(undefined);
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
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "schedule"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "overview"] });
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

  it("passes selected day metadata when reordering a generated day list", async () => {
    render(
      <ReorderableScheduleList
        tripId="trip-1"
        tripDayId="generated-trip-day:2026-11-21"
        targetDayDate="2026-11-21"
        targetDayNumber={2}
        items={items}
        editable
      />,
    );

    act(() => {
      dndHarness.onDragEnd?.({
        active: { id: "item-1" },
        over: { id: "item-2" },
      });
    });

    await waitFor(() => {
      expect(reorderScheduleItems).toHaveBeenCalledWith(
        "trip-1",
        "generated-trip-day:2026-11-21",
        ["item-2", "item-1", "item-3"],
        "2026-11-21",
        2,
      );
    });
  });

  it("uses dedicated touch-safe drag handles and keeps existing actions", () => {
    const { container } = renderList();

    const handles = screen.getAllByRole("button", { name: /Reorder/ });
    expect(handles).toHaveLength(3);
    expect(handles.every((handle) => handle.className.includes("itinerary-drag-handle"))).toBe(true);
    expect(container.querySelector("[draggable=true]")).toBeNull();
    expect(container.querySelector("[data-sortable-items]")?.getAttribute("data-sortable-items"))
      .toBe("item-1,item-2,item-3");

    const mapLink = screen.getByRole("link", { name: "Open Hotel in Google Maps" });
    expect(mapLink.textContent).toBe("");
    expect(mapLink.getAttribute("target")).toBe("_blank");
    expect(screen.queryByText("Google Maps")).toBeNull();
    expect(screen.getByRole("button", { name: "Remove Hotel" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Move Hotel up" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Move Museum down" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("list", { name: "Itinerary stops" }).className).not.toContain("pb-24");
  });

  it("removes a stop with a handled client action and refreshes trip queries", async () => {
    renderList();

    fireEvent.click(screen.getByRole("button", { name: "Remove Hotel" }));

    await waitFor(() => expect(removeScheduleItem).toHaveBeenCalledWith("trip-1", "item-1"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "schedule"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "overview"] });
  });

  it("shows delete permission errors inline instead of throwing into the runtime overlay", async () => {
    removeScheduleItem.mockRejectedValue(new Error("You do not have permission to do this."));
    renderList();

    fireEvent.click(screen.getByRole("button", { name: "Remove Hotel" }));

    expect((await screen.findByRole("alert")).textContent).toContain("You do not have permission to do this.");
  });

  it("leaves touch events to TouchSensor and uses pointer-position collisions", () => {
    renderList();

    const pointerActivator = dndHarness.sensors[0]?.sensor.activators?.[0]?.handler;
    expect(pointerActivator).toBeTypeOf("function");
    expect(pointerActivator?.({
      nativeEvent: {
        button: 0,
        isPrimary: true,
        pointerType: "touch",
      },
    }, {})).toBe(false);
    expect(pointerActivator?.({
      nativeEvent: {
        button: 0,
        isPrimary: true,
        pointerType: "mouse",
      },
    }, {})).toBe(true);
    expect(dndHarness.sensors[1]?.options).toEqual({
      activationConstraint: { delay: 200, tolerance: 8 },
    });

    const collisions = [{ id: "item-2" }];
    pointerWithin.mockReturnValue(collisions);
    expect(dndHarness.collisionDetection?.({})).toEqual(collisions);
    expect(pointerWithin).toHaveBeenCalledTimes(1);
    expect(closestCenter).not.toHaveBeenCalled();
  });

  it("moves a stop with the mobile fallback and persists the same UUID order", async () => {
    const { container } = renderList();

    fireEvent.click(screen.getByRole("button", { name: "Move Hotel down" }));

    expect(renderedOrder(container)).toEqual(["item-2", "item-1", "item-3"]);
    await waitFor(() => {
      expect(reorderScheduleItems).toHaveBeenCalledWith(
        "trip-1",
        "day-1",
        ["item-2", "item-1", "item-3"],
      );
    });
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

  it("shows connecting flight route and segments without splitting the draggable item", () => {
    const flightItem: ScheduleItem = {
      id: "flight-1",
      trip_id: "trip-1",
      trip_day_id: "day-1",
      time_block: "18:00",
      title: "Kuching \u2192 Kuala Lumpur \u2192 Osaka",
      description: serializeFlightPlan([
        {
          origin: "Kuching",
          destination: "Kuala Lumpur",
          departureDate: "2026-11-20",
          departureTime: "18:00",
          arrivalDate: "2026-11-20",
          arrivalTime: "20:00",
        },
        {
          origin: "Kuala Lumpur",
          destination: "Osaka",
          departureDate: "2026-11-20",
          departureTime: "22:40",
          arrivalDate: "2026-11-21",
          arrivalTime: "05:50",
        },
      ], ["Julian", "Clarrie"], "Overnight flight"),
      transport: "Flight",
      food: null,
      notes: null,
      sort_order: 1,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: null,
    };

    const { container } = render(
      <ReorderableScheduleList
        tripId="trip-1"
        tripDayId="day-1"
        items={[flightItem]}
        travelers={[
          { id: "traveler-1", name: "Julian", created_at: "2026-01-01T00:00:01Z" },
          { id: "traveler-2", name: "Clarrie", created_at: "2026-01-01T00:00:02Z" },
        ]}
        editable
      />,
    );

    expect(screen.getByText("Kuching \u2192 Kuala Lumpur \u2192 Osaka")).toBeTruthy();
    expect(screen.getByText("Julian")).toBeTruthy();
    expect(screen.getByText("Clarrie")).toBeTruthy();
    expect(screen.getByText("1 stop in Kuala Lumpur - Passengers: Julian, Clarrie")).toBeTruthy();
    expect(screen.getByText("1. Kuching to Kuala Lumpur / 20/11/2026 18:00 to 20/11/2026 20:00")).toBeTruthy();
    expect(screen.getByText("2. Kuala Lumpur to Osaka / 20/11/2026 22:40 to 21/11/2026 05:50 (+1 day)")).toBeTruthy();
    expect(container.querySelectorAll("[data-schedule-item-id]")).toHaveLength(1);
  });

  it("edits a connecting flight as one grouped schedule item", async () => {
    const flightItem: ScheduleItem = {
      id: "flight-1",
      trip_id: "trip-1",
      trip_day_id: "day-1",
      time_block: "18:00",
      title: "Kuching \u2192 Kuala Lumpur \u2192 Osaka",
      description: serializeFlightPlan([
        {
          origin: "Kuching",
          destination: "Kuala Lumpur",
          departureDate: "2026-11-20",
          departureTime: "18:00",
          arrivalDate: "2026-11-20",
          arrivalTime: "20:00",
        },
        {
          origin: "Kuala Lumpur",
          destination: "Osaka",
          departureDate: "2026-11-20",
          departureTime: "22:40",
          arrivalDate: "2026-11-21",
          arrivalTime: "05:50",
        },
      ], ["Julian"], "Overnight flight"),
      transport: "Flight",
      food: null,
      notes: null,
      sort_order: 1,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: null,
    };

    render(
      <ReorderableScheduleList
        tripId="trip-1"
        tripDayId="day-1"
        items={[flightItem]}
        editable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Kuching \u2192 Kuala Lumpur \u2192 Osaka" }));
    const destinations = screen.getAllByRole("textbox", { name: "Destination / To" });
    fireEvent.change(destinations[1], { target: { value: "Kansai Airport" } });
    fireEvent.click(screen.getByRole("button", { name: "Save flight" }));

    await waitFor(() => expect(updateFlightScheduleItem).toHaveBeenCalledTimes(1));
    const submitted = updateFlightScheduleItem.mock.calls[0][2] as FormData;
    expect(updateFlightScheduleItem).toHaveBeenCalledWith("trip-1", "flight-1", expect.any(FormData));
    expect(submitted.get("flight_segment_count")).toBe("2");
    expect(submitted.get("flight_segments.0.origin")).toBe("Kuching");
    expect(submitted.get("flight_segments.1.destination")).toBe("Kansai Airport");
    expect(submitted.get("flight_segments.1.arrival_at")).toBe("2026-11-21T05:50");
    expect(submitted.get("flight_passenger_name")).toBe("Julian");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "schedule"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "overview"] });
  });

  it("edits a hotel schedule item from the plan list", async () => {
    const hotelItem: ScheduleItem = {
      id: "hotel-1",
      trip_id: "trip-1",
      trip_day_id: "day-1",
      time_block: "2026-06-13T15:00",
      title: "Harbour Stay",
      description: "Check-in: 2026-06-13T15:00 - Check-out: 2026-06-15T11:00 - Late arrival",
      transport: "Lodging",
      food: null,
      notes: null,
      sort_order: 1,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: null,
    };

    render(
      <ReorderableScheduleList
        tripId="trip-1"
        tripDayId="day-1"
        items={[hotelItem]}
        editable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Harbour Stay" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Hotel name" }), {
      target: { value: "Harbour Stay Hotel" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), {
      target: { value: "Late arrival and breakfast" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save hotel" }));

    await waitFor(() => expect(updateScheduleItemPlan).toHaveBeenCalledTimes(1));
    const submitted = updateScheduleItemPlan.mock.calls[0][2] as FormData;
    expect(updateScheduleItemPlan).toHaveBeenCalledWith("trip-1", "hotel-1", expect.any(FormData));
    expect(submitted.get("plan_type")).toBe("hotel");
    expect(submitted.get("hotel_name")).toBe("Harbour Stay Hotel");
    expect(submitted.get("check_in")).toBe("2026-06-13T15:00");
    expect(submitted.get("check_out")).toBe("2026-06-15T11:00");
    expect(submitted.get("plan_notes")).toBe("Late arrival and breakfast");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "schedule"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "overview"] });
  });

  it("edits a place schedule item from the plan list", async () => {
    const placeItem: ScheduleItem = {
      id: "place-1",
      trip_id: "trip-1",
      trip_day_id: "day-1",
      time_block: "18:00",
      title: "Marble Mountains",
      description: "Sunset visit",
      transport: "Activity",
      food: null,
      notes: "https://maps.google.com/?q=Marble%20Mountains",
      sort_order: 1,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: null,
    };

    render(
      <ReorderableScheduleList
        tripId="trip-1"
        tripDayId="day-1"
        items={[placeItem]}
        editable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Marble Mountains" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Place name" }), {
      target: { value: "Dragon Bridge" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Time" }), {
      target: { value: "20:00" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), {
      target: { value: "Evening lights" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save place" }));

    await waitFor(() => expect(updateScheduleItemPlan).toHaveBeenCalledTimes(1));
    const submitted = updateScheduleItemPlan.mock.calls[0][2] as FormData;
    expect(updateScheduleItemPlan).toHaveBeenCalledWith("trip-1", "place-1", expect.any(FormData));
    expect(submitted.get("plan_type")).toBe("place");
    expect(submitted.get("place_name")).toBe("Dragon Bridge");
    expect(submitted.get("place_time")).toBe("20:00");
    expect(submitted.get("plan_notes")).toBe("Evening lights");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "schedule"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "overview"] });
  });
});
