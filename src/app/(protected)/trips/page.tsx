import { ArchiveRestore, CalendarPlus, FolderArchive, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { createTrip, restoreArchivedTrip, restoreDeletedTrip } from "@/lib/actions/trips";
import { getTrips } from "@/lib/db/queries";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { RoleBadge } from "@/components/trip/role-badge";
import { StatusBadge } from "@/components/trip/status-badge";
import type { TripListItem } from "@/lib/db/queries";

function TripCard({ trip }: { trip: TripListItem }) {
  const archived = trip.trip_status === "archived" && trip.deleted_at === null;
  const deleted = trip.deleted_at !== null;

  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{trip.name}</h3>
            <p className="text-sm text-slate-500">
              {trip.start_date ?? "No start date"} {trip.end_date ? `to ${trip.end_date}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <RoleBadge role={trip.role} />
              <StatusBadge status={trip.trip_status} />
              <span className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs font-bold text-slate-700">{trip.default_currency}</span>
              <span className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs font-bold text-slate-700">{trip.traveler_count} travelers</span>
              <span className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs font-bold text-slate-700">{trip.member_count > 1 ? "Shared" : "Private"}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {deleted ? (
              <form action={restoreDeletedTrip.bind(null, trip.id)}>
                <Button variant="secondary" type="submit">
                  <ArchiveRestore size={16} />
                  Restore
                </Button>
              </form>
            ) : archived ? (
              <form action={restoreArchivedTrip.bind(null, trip.id)}>
                <Button variant="secondary" type="submit">
                  <ArchiveRestore size={16} />
                  Restore
                </Button>
              </form>
            ) : (
              <ButtonLink href={`/trips/${trip.id}/overview`}>Open</ButtonLink>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TripSection({ title, icon, trips, empty }: { title: string; icon: ReactNode; trips: TripListItem[]; empty: string }) {
  return (
    <section className="grid gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        {icon}
        {title}
      </h2>
      {trips.length ? trips.map((trip) => <TripCard key={trip.id} trip={trip} />) : <p className="rounded-lg border border-dashed border-[var(--border)] p-5 text-sm text-slate-500">{empty}</p>}
    </section>
  );
}

export default async function TripsPage() {
  const trips = await getTrips();
  const activeOwned = trips.filter((trip) => trip.role === "owner" && trip.deleted_at === null && trip.trip_status !== "archived");
  const shared = trips.filter((trip) => trip.role !== "owner" && trip.deleted_at === null && trip.trip_status !== "archived");
  const archived = trips.filter((trip) => trip.role === "owner" && trip.deleted_at === null && trip.trip_status === "archived");
  const trash = trips.filter((trip) => trip.role === "owner" && trip.deleted_at !== null);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-slate-500">Private workspace</p>
          <h1 className="text-3xl font-bold">My Trips</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <CalendarPlus size={18} />
            Create trip
          </h2>
        </CardHeader>
        <CardContent>
          <form action={createTrip} className="grid gap-3 md:grid-cols-[1fr_150px_150px_140px]">
            <Field label="Trip name">
              <Input name="name" required placeholder="Da Nang Trip" />
            </Field>
            <Field label="Start">
              <Input name="start_date" type="date" required />
            </Field>
            <Field label="End">
              <Input name="end_date" type="date" required />
            </Field>
            <Field label="Currency">
              <Select name="default_currency" defaultValue="MYR">
                {["MYR", "SGD", "USD", "VND", "THB", "IDR", "PHP", "JPY", "KRW", "TWD", "HKD"].map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </Select>
            </Field>
            <Field label="Travelers" className="md:col-span-4">
              <Textarea name="travelers" required placeholder="Julian, Clarrie" />
            </Field>
            <Button className="self-end md:col-span-4" type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <TripSection title="My Private Trips" icon={<CalendarPlus size={18} />} trips={activeOwned} empty="Create your first private trip." />
      <TripSection title="Shared With Me" icon={<CalendarPlus size={18} />} trips={shared} empty="No shared trips yet." />
      <TripSection title="Archived" icon={<FolderArchive size={18} />} trips={archived} empty="No archived trips." />
      <TripSection title="Trash" icon={<Trash2 size={18} />} trips={trash} empty="Trash is empty." />
    </main>
  );
}
