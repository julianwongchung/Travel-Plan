import { redirect } from "next/navigation";
import { PlacesClient } from "@/components/places/places-client";
import { getPlaces, getTripContext, getTripLogistics } from "@/lib/db/queries";
import { canAccessPlaces, canEditTrip } from "@/lib/utils/permissions";

export default async function PlacesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ trip, appRole }, places, logistics] = await Promise.all([
    getTripContext(tripId),
    getPlaces(tripId, true),
    getTripLogistics(tripId),
  ]);

  if (!canAccessPlaces(appRole)) {
    redirect("/trips");
  }

  return (
    <PlacesClient
      tripId={tripId}
      editable={canEditTrip(trip, appRole)}
      initialData={{
        places,
        hotels: logistics.hotels,
        flights: logistics.flights,
      }}
    />
  );
}
