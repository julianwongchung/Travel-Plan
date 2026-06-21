// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { invalidateQueries, removeChannel, onCalls } = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  removeChannel: vi.fn(),
  onCalls: [] as Array<{
    event: string;
    config: { table: string };
    callback: () => void;
  }>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const channel = {
      on(event: string, config: { table: string }, callback: () => void) {
        onCalls.push({ event, config, callback });
        return channel;
      },
      subscribe() {
        return channel;
      },
    };

    return {
      channel: vi.fn(() => channel),
      removeChannel,
    };
  },
}));

import { RealtimeRefresh } from "@/components/trip/realtime-refresh";

function callbackFor(table: string) {
  const callback = onCalls.find((call) => call.config.table === table)?.callback;
  if (!callback) throw new Error(`Missing realtime callback for ${table}`);
  return callback;
}

describe("RealtimeRefresh", () => {
  afterEach(() => {
    cleanup();
    invalidateQueries.mockReset();
    removeChannel.mockReset();
    onCalls.length = 0;
  });

  it("invalidates visible React Query data when expenses change through realtime", () => {
    render(<RealtimeRefresh tripId="trip-1" />);

    callbackFor("trip_expenses")();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "overview"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "expenses"] });
  });

  it("subscribes to hotel and flight logistics changes without refreshing the route", () => {
    render(<RealtimeRefresh tripId="trip-1" />);

    callbackFor("trip_hotels")();
    callbackFor("trip_flights")();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "overview"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "places"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "hotels"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["trips", "trip-1", "flights"] });
  });
});
