import { TripPlanClient } from "@/components/trip/trip-plan-client";
import { getOverviewData, getTripContext } from "@/lib/db/queries";
import { canEditTrip } from "@/lib/utils/permissions";

export default async function TripPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { tripId } = await params;
  const selectedDayDate = (await searchParams).day;
  const [{ trip, role }, data] = await Promise.all([getTripContext(tripId), getOverviewData(tripId)]);

  return (
    <TripPlanClient
      trip={trip}
      tripId={tripId}
      editable={canEditTrip(role, trip)}
      selectedDayDate={selectedDayDate}
      initialData={{
        days: data.days,
        scheduleItems: data.scheduleItems,
        travelers: data.travelers,
      }}
    />
  );
}
