// @vitest-environment jsdom

import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScheduleItem } from "@/lib/db/types";

vi.mock("@/lib/actions/trips", () => ({
  removeScheduleItem: vi.fn(),
  reorderScheduleItems: vi.fn(),
}));

import { ReorderableScheduleList } from "@/components/trip/reorderable-schedule-list";

const items: ScheduleItem[] = [
  {
    id: "6c3ada98-b924-4fb3-9343-16842c3cd937",
    trip_id: "88d0a24c-088f-442d-9e3b-a9e031a6e156",
    trip_day_id: "0b359c4b-c5bc-401f-ab1b-c998738204ae",
    time_block: null,
    title: "Hotel",
    description: null,
    transport: null,
    food: null,
    notes: null,
    sort_order: 1,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: null,
  },
];

describe("ReorderableScheduleList hydration", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("hydrates without server/client attribute mismatches", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const element = (
      <ReorderableScheduleList
        tripId={items[0].trip_id}
        tripDayId={items[0].trip_day_id}
        items={items}
        editable
      />
    );
    container.innerHTML = renderToString(element);

    let root: ReturnType<typeof createRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, element);
    });

    const hydrationErrors = consoleError.mock.calls
      .flat()
      .map(String)
      .filter((message) => (
        message.includes("hydrated")
        || message.includes("Hydration")
        || message.includes("didn't match")
      ));

    expect(hydrationErrors).toEqual([]);

    await act(async () => {
      root?.unmount();
    });
    consoleError.mockRestore();
  });
});
