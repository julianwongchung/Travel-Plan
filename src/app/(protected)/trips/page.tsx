import { ArchiveRestore, CalendarPlus, FolderArchive, LockKeyhole, Trash2, Users } from "lucide-react";
import type { ReactNode } from "react";
import { createTrip, restoreArchivedTrip, restoreDeletedTrip } from "@/lib/actions/trips";
import { getTrips } from "@/lib/db/queries";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { IOSListItem } from "@/components/ui/ios-list-item";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { StatusBadge as UIStatusBadge } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/trip/role-badge";
import { StatusBadge } from "@/components/trip/status-badge";
import { WorkspaceMobileNav } from "@/components/layout/workspace-mobile-nav";
import { TripCardActions } from "@/components/trips/trip-card-actions";
import type { TripListItem } from "@/lib/db/queries";

function TripCard({ trip }: { trip: TripListItem }) {
  const archived = trip.trip_status === "archived" && trip.deleted_at === null;
  const deleted = trip.deleted_at !== null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-xl font-bold tracking-[-0.025em]">{trip.name}</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {trip.start_date ?? "No start date"} {trip.end_date ? `to ${trip.end_date}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <RoleBadge role={trip.role} />
              <StatusBadge status={trip.trip_status} />
              <UIStatusBadge status={trip.default_currency} />
              <UIStatusBadge status={`${trip.traveler_count} travelers`} />
              <UIStatusBadge status={trip.member_count > 1 ? "shared" : "private"} />
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
            {deleted ? (
              <form action={restoreDeletedTrip.bind(null, trip.id)}>
                <Button className="w-full sm:w-auto" variant="secondary" type="submit">
                  <ArchiveRestore size={16} />
                  Restore
                </Button>
              </form>
            ) : archived ? (
              <form action={restoreArchivedTrip.bind(null, trip.id)}>
                <Button className="w-full sm:w-auto" variant="secondary" type="submit">
                  <ArchiveRestore size={16} />
                  Restore
                </Button>
              </form>
            ) : (
              trip.role === "owner" ? (
                <TripCardActions tripId={trip.id} memberCount={trip.member_count} />
              ) : (
                <ButtonLink className="w-full sm:w-auto" href={`/trips/${trip.id}/overview`}>Open</ButtonLink>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TripSection({ title, icon, trips, empty }: { title: string; icon: ReactNode; trips: TripListItem[]; empty: string }) {
  return (
    <section className="grid gap-3.5">
      <h2 className="flex items-center gap-2 px-1 text-lg font-bold tracking-[-0.02em]">
        {icon}
        {title}
      </h2>
      {trips.length ? trips.map((trip) => <TripCard key={trip.id} trip={trip} />) : (
        <Card className="border-dashed bg-transparent shadow-none">
          <CardContent className="p-0 px-5">
            <IOSListItem title={empty} description="This section will update as your travel workspace grows." />
          </CardContent>
        </Card>
      )}
    </section>
  );
}

export default async function TripsPage() {
  const trips = await getTrips();
  const activeOwned = trips.filter((trip) => trip.role === "owner" && trip.deleted_at === null && trip.trip_status !== "archived");
  const shared = trips.filter((trip) => trip.role !== "owner" && trip.deleted_at === null && trip.trip_status !== "archived");
  const archived = trips.filter((trip) => trip.role === "owner" && trip.deleted_at === null && trip.trip_status === "archived");
  const trash = trips.filter((trip) => trip.role === "owner" && trip.deleted_at !== null);
  const currentTrip = activeOwned[0] ?? shared[0] ?? archived[0] ?? null;

  return (
    <>
      <main className="mx-auto grid w-full min-w-0 max-w-7xl gap-6 px-3 py-6 pb-32 sm:gap-7 sm:px-6 sm:py-8 lg:py-12">
        <IOSPageHeader
          eyebrow="Private workspace"
          title="My Trips"
          description="Plan privately, then invite collaborators only to the trips you choose."
        />

        <Card className="overflow-hidden">
          <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-[-0.02em]">
              <span className="grid size-9 place-items-center rounded-[13px] bg-[var(--primary-soft)] text-[var(--primary)]"><CalendarPlus size={18} /></span>
              Create trip
            </h2>
          </CardHeader>
          <CardContent>
            <form action={createTrip} className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_150px_140px]">
              <Field label="Trip name" className="sm:col-span-2 lg:col-span-1">
                <Input name="name" required placeholder="Da Nang Trip" />
              </Field>
              <Field label="Start">
                <Input name="start_date" type="date" required />
              </Field>
              <Field label="End">
                <Input name="end_date" type="date" required />
              </Field>
              <Field label="Currency" className="sm:col-span-2 lg:col-span-1">
                <Select name="default_currency" defaultValue="MYR">
                  {["MYR", "SGD", "USD", "VND", "THB", "IDR", "PHP", "JPY", "KRW", "TWD", "HKD"].map((currency) => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Travelers" className="sm:col-span-2 lg:col-span-4">
                <Textarea name="travelers" required placeholder="Julian, Clarrie" />
              </Field>
              <Button className="w-full self-end sm:col-span-2 sm:w-auto sm:justify-self-start lg:col-span-4" type="submit">Create private trip</Button>
            </form>
          </CardContent>
        </Card>

        <TripSection title="My Private Trips" icon={<LockKeyhole size={18} />} trips={activeOwned} empty="Create your first private trip." />
        <TripSection title="Shared With Me" icon={<Users size={18} />} trips={shared} empty="No shared trips yet." />
        <TripSection title="Archived" icon={<FolderArchive size={18} />} trips={archived} empty="No archived trips." />
        <TripSection title="Trash" icon={<Trash2 size={18} />} trips={trash} empty="Trash is empty." />
      </main>
      <WorkspaceMobileNav tripId={currentTrip?.id} />
    </>
  );
}
