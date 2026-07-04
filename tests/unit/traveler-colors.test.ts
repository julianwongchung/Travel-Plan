import { describe, expect, it } from "vitest";
import { passengerColors, travelerColorMap } from "@/lib/utils/traveler-colors";

const travelers = [
  { id: "traveler-2", name: "Clarrie", created_at: "2026-01-01T00:00:02Z" },
  { id: "traveler-1", name: "Julian", created_at: "2026-01-01T00:00:01Z" },
  { id: "traveler-3", name: "Alex", created_at: "2026-01-01T00:00:03Z" },
];

describe("traveler color helpers", () => {
  it("assigns stable colors from traveler creation order", () => {
    const colors = travelerColorMap(travelers);

    expect(colors.get("julian")?.name).toBe("blue");
    expect(colors.get("clarrie")?.name).toBe("purple");
    expect(colors.get("alex")?.name).toBe("green");
  });

  it("matches passenger names case-insensitively and keeps manual names stable", () => {
    const colors = passengerColors([" julian ", "CLARRIE", "Guest Friend", "Julian"], travelers);

    expect(colors).toHaveLength(3);
    expect(colors[0]).toMatchObject({ name: "julian", knownTraveler: true });
    expect(colors[0].color.name).toBe("blue");
    expect(colors[1]).toMatchObject({ name: "CLARRIE", knownTraveler: true });
    expect(colors[1].color.name).toBe("purple");
    expect(colors[2]).toMatchObject({ name: "Guest Friend", knownTraveler: false });
    expect(passengerColors(["Guest Friend"], travelers)[0].color).toEqual(colors[2].color);
  });
});
