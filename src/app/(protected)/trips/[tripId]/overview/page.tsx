import { OverviewClient } from "@/components/overview/overview-client";
import { getOverviewData, getTripContext, getTripLogistics } from "@/lib/db/queries";

export default async function OverviewPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ trip }, data, logistics] = await Promise.all([
    getTripContext(tripId),
    getOverviewData(tripId),
    getTripLogistics(tripId),
  ]);

  return (
    <OverviewClient
      trip={trip}
      initialData={{
        ...data,
        hotels: logistics.hotels,
        flights: logistics.flights,
      }}
    />
  );
}
