"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { tripKeys } from "@/lib/db/query-keys";
import { createClient } from "@/lib/supabase/client";

export function RealtimeRefresh({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip:${tripId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_days", filter: `trip_id=eq.${tripId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: tripKeys.days(tripId) });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_items", filter: `trip_id=eq.${tripId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: tripKeys.days(tripId) });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "places", filter: `trip_id=eq.${tripId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: tripKeys.places(tripId) });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_expenses", filter: `trip_id=eq.${tripId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: tripKeys.expenses(tripId) });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "expense_splits", filter: `trip_id=eq.${tripId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: tripKeys.expenses(tripId) });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, tripId]);

  return null;
}
