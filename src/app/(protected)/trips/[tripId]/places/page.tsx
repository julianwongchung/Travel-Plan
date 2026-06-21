import { PlacesClient } from "@/components/places/places-client";
import { getPlaces, getTripContext, getTripLogistics } from "@/lib/db/queries";
import { canEditTrip } from "@/lib/utils/permissions";

export default async function PlacesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ trip, role }, places, logistics] = await Promise.all([
    getTripContext(tripId),
    getPlaces(tripId, true),
    getTripLogistics(tripId),
  ]);

  return (
    <PlacesClient
      tripId={tripId}
      editable={canEditTrip(role, trip)}
      initialData={{
        places,
        hotels: logistics.hotels,
        flights: logistics.flights,
      }}
    />
  );
}
