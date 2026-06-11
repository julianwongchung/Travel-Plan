import { describe, expect, it } from "vitest";
import { reorderItineraryItems } from "@/lib/utils/itinerary-order";

describe("itinerary ordering", () => {
  it("moves a dragged stop to the target position and renumbers the sequence", () => {
    const items = [
      { id: "item-1", sort_order: 1 },
      { id: "item-2", sort_order: 2 },
      { id: "item-3", sort_order: 3 },
    ];

    expect(reorderItineraryItems(items, "item-1", "item-3")).toEqual([
      { id: "item-2", sort_order: 1 },
      { id: "item-3", sort_order: 2 },
      { id: "item-1", sort_order: 3 },
    ]);
  });

  it("returns the existing order when either stop cannot be found", () => {
    const items = [
      { id: "item-1", sort_order: 1 },
      { id: "item-2", sort_order: 2 },
    ];

    expect(reorderItineraryItems(items, "missing", "item-2")).toEqual(items);
  });
});
