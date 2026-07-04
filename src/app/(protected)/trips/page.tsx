import { getCurrentProfile, getTrips } from "@/lib/db/queries";
import { AppLogo } from "@/components/layout/app-logo";
import { WorkspaceMobileNav } from "@/components/layout/workspace-mobile-nav";
import { TripsDashboard } from "@/components/trips/trips-dashboard";
import { ButtonLink } from "@/components/ui/button";
import { isAppAdmin } from "@/lib/utils/permissions";

export default async function TripsPage() {
  const profile = await getCurrentProfile();
  const trips = await getTrips();
  const activeTrips = trips.filter((trip) => trip.deleted_at === null && trip.trip_status !== "archived");
  const archivedTrips = trips.filter((trip) => trip.deleted_at === null && trip.trip_status === "archived");
  const currentTrip = activeTrips[0] ?? archivedTrips[0] ?? null;

  return (
    <>
      <main className="mx-auto grid w-full min-w-0 max-w-xl gap-6 px-4 py-5 pb-32 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <AppLogo className="justify-self-start" imageClassName="w-[150px] sm:w-[174px]" />
          {isAppAdmin(profile.app_role) ? (
            <ButtonLink href="/admin" variant="secondary" className="min-h-10 px-4 text-xs">Admin</ButtonLink>
          ) : null}
        </div>
        <TripsDashboard trips={trips} appRole={profile.app_role} />
      </main>
      <WorkspaceMobileNav tripId={currentTrip?.id} appRole={profile.app_role} />
    </>
  );
}
