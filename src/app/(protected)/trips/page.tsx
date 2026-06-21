import { getTrips } from "@/lib/db/queries";
import { AppLogo } from "@/components/layout/app-logo";
import { WorkspaceMobileNav } from "@/components/layout/workspace-mobile-nav";
import { TripsDashboard } from "@/components/trips/trips-dashboard";

export default async function TripsPage() {
  const trips = await getTrips();
  const activeOwned = trips.filter((trip) => trip.role === "owner" && trip.deleted_at === null && trip.trip_status !== "archived");
  const shared = trips.filter((trip) => trip.role !== "owner" && trip.deleted_at === null && trip.trip_status !== "archived");
  const archived = trips.filter((trip) => trip.role === "owner" && trip.deleted_at === null && trip.trip_status === "archived");
  const currentTrip = activeOwned[0] ?? shared[0] ?? archived[0] ?? null;

  return (
    <>
      <main className="mx-auto grid w-full min-w-0 max-w-xl gap-6 px-4 py-5 pb-32 sm:px-6 sm:py-8">
        <AppLogo className="justify-self-start" imageClassName="w-[150px] sm:w-[174px]" />
        <TripsDashboard trips={trips} />
      </main>
      <WorkspaceMobileNav tripId={currentTrip?.id} />
    </>
  );
}
