"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { tripKeys } from "@/lib/db/query-keys";
import { createClient } from "@/lib/supabase/client";

export function RealtimeRefresh({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const invalidate = (...queryKeys: Array<readonly unknown[]>) => {
      for (const queryKey of queryKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };

    const channel = supabase
      .channel(`trip:${tripId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_days", filter: `trip_id=eq.${tripId}` }, () => {
        invalidate(tripKeys.overview(tripId), tripKeys.schedule(tripId), tripKeys.days(tripId));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_items", filter: `trip_id=eq.${tripId}` }, () => {
        invalidate(tripKeys.overview(tripId), tripKeys.schedule(tripId), tripKeys.days(tripId));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "places", filter: `trip_id=eq.${tripId}` }, () => {
        invalidate(tripKeys.overview(tripId), tripKeys.places(tripId));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_hotels", filter: `trip_id=eq.${tripId}` }, () => {
        invalidate(tripKeys.overview(tripId), tripKeys.places(tripId), tripKeys.hotels(tripId));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_flights", filter: `trip_id=eq.${tripId}` }, () => {
        invalidate(tripKeys.overview(tripId), tripKeys.places(tripId), tripKeys.flights(tripId));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_expenses", filter: `trip_id=eq.${tripId}` }, () => {
        invalidate(tripKeys.overview(tripId), tripKeys.expenses(tripId));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "expense_splits", filter: `trip_id=eq.${tripId}` }, () => {
        invalidate(tripKeys.expenses(tripId));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "travelers", filter: `trip_id=eq.${tripId}` }, () => {
        invalidate(tripKeys.overview(tripId), tripKeys.schedule(tripId), tripKeys.expenses(tripId), tripKeys.travelers(tripId));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, tripId]);

  return null;
}
