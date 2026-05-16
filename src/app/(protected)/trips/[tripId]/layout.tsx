import type { ReactNode } from "react";
import { TripShell } from "@/components/layout/trip-shell";
import { RealtimeRefresh } from "@/components/trip/realtime-refresh";
import { getTripContext, getTripMembers } from "@/lib/db/queries";

export default async function TripLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const context = await getTripContext(tripId);
  const memberData = await getTripMembers(tripId);

  return (
    <TripShell trip={context.trip} role={context.role} members={memberData.members} invitations={memberData.invitations}>
      <RealtimeRefresh tripId={tripId} />
      {context.trip.deleted_at ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">This trip is in trash. Restore it from My Trips before editing.</div>
      ) : null}
      {context.trip.trip_status === "archived" ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">This trip has been archived. Owner actions can restore it from My Trips.</div>
      ) : null}
      {children}
    </TripShell>
  );
}
