"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArchiveRestore, CalendarDays, CircleCheck, Ellipsis, EyeOff, FolderArchive, LockKeyhole, Search, SlidersHorizontal, Trash2, UserRound, Users, WalletCards, X } from "lucide-react";
import { restoreArchivedTrip, restoreDeletedTrip, softDeleteTrip } from "@/lib/actions/trips";
import type { AppRole } from "@/lib/db/types";
import type { TripListItem } from "@/lib/db/queries";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IOSListItem } from "@/components/ui/ios-list-item";
import { StatusBadge as UIStatusBadge } from "@/components/ui/status-badge";
import { StatusBadge } from "@/components/trip/status-badge";
import { CreateTripModal } from "@/components/trips/create-trip-modal";
import { TripCardActions } from "@/components/trips/trip-card-actions";
import { cn } from "@/lib/utils/cn";
import { formatDisplayDate } from "@/lib/utils/date-format";
import { isAppAdmin } from "@/lib/utils/permissions";

type TripFilter = "all" | "active" | "archived";

const filters: Array<{ value: TripFilter; label: string }> = [
  { value: "all", label: "All Trips" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

function travelerLabel(count: number) {
  return `${count} ${count === 1 ? "Traveler" : "Travelers"}`;
}

function dateRangeLabel(trip: TripListItem) {
  return `${trip.start_date ? formatDisplayDate(trip.start_date) : "No start date"}${trip.end_date ? ` to ${formatDisplayDate(trip.end_date)}` : ""}`;
}

function tripHeroImage(trip: TripListItem) {
  const name = trip.name.toLowerCase();
  if (name.includes("da nang") || name.includes("danang")) {
    return "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80";
  }
  if (name.includes("osaka") || name.includes("japan")) {
    return "https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=80";
  }
  if (name.includes("singapore")) {
    return "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80";
  }
  if (name.includes("kuala lumpur") || name.includes("malaysia")) {
    return "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80";
  }
  if (name.includes("vietnam")) {
    return "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80";
  }
  return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";
}

function matchesSearch(trip: TripListItem, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return [
    trip.name,
    trip.start_date,
    trip.end_date,
    trip.default_currency,
    trip.trip_status,
    trip.owner_email,
  ].some((value) => value?.toLowerCase().includes(query));
}

function VisualBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "blue" | "cyan" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-md",
        tone === "blue" && "bg-blue-100/85 text-blue-800 dark:bg-blue-400/18 dark:text-blue-100",
        tone === "cyan" && "bg-cyan-100/85 text-cyan-900 dark:bg-cyan-400/18 dark:text-cyan-100",
        tone === "neutral" && "bg-slate-100/90 text-slate-700 dark:bg-white/12 dark:text-slate-100",
      )}
    >
      {children}
    </span>
  );
}

function VisualTripCard({ appRole, trip }: { appRole: AppRole; trip: TripListItem }) {
  const admin = isAppAdmin(appRole);
  const canDelete = admin && trip.deleted_at === null;

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#d5deef] bg-white/82 shadow-[0_18px_45px_rgba(31,42,68,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[var(--card)]">
      <div className="relative min-h-56 overflow-hidden rounded-t-[22px] bg-gradient-to-br from-sky-200 via-slate-300 to-blue-900">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${tripHeroImage(trip)}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/72" />

        {canDelete ? (
          <details className="group absolute right-4 top-4 z-10">
            <summary
              aria-label={`More actions for ${trip.name}`}
              className="ios-pressable grid size-12 cursor-pointer list-none place-items-center rounded-full bg-white/88 text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.2)] backdrop-blur-xl marker:hidden [&::-webkit-details-marker]:hidden"
            >
              <Ellipsis size={22} />
            </summary>
            <div className="absolute right-0 mt-2 min-w-36 rounded-[16px] border border-white/50 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
              <form
                action={softDeleteTrip.bind(null, trip.id)}
                onSubmit={(event) => {
                  if (!window.confirm("Delete this trip? You can restore it later from Trash.")) {
                    event.preventDefault();
                  }
                }}
              >
                <button
                  type="submit"
                  className="ios-pressable flex min-h-10 w-full items-center gap-2 rounded-[12px] px-3 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </form>
            </div>
          </details>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
          <h3 className="break-words text-2xl font-bold tracking-[-0.04em] drop-shadow-sm">{trip.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white/90">
            <CalendarDays size={15} aria-hidden="true" />
            {dateRangeLabel(trip)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <VisualBadge tone="blue"><UserRound size={13} /> Trip</VisualBadge>
          <VisualBadge tone="cyan"><CircleCheck size={13} /> {trip.trip_status[0].toUpperCase() + trip.trip_status.slice(1)}</VisualBadge>
          <VisualBadge><WalletCards size={13} /> {trip.default_currency}</VisualBadge>
          <VisualBadge><Users size={13} /> {travelerLabel(trip.traveler_count)}</VisualBadge>
          <VisualBadge><EyeOff size={13} /> Private</VisualBadge>
        </div>

        <div className="border-t border-[#e3e8f2] pt-4 dark:border-white/10">
          {admin ? (
            <TripCardActions tripId={trip.id} memberCount={trip.member_count} tripStatus={trip.trip_status} />
          ) : (
            <ButtonLink className="w-full min-h-12 text-sm" href={`/trips/${trip.id}/overview`}>Open</ButtonLink>
          )}
        </div>
      </div>
    </article>
  );
}

function TripCard({ appRole, trip }: { appRole: AppRole; trip: TripListItem }) {
  const admin = isAppAdmin(appRole);
  const archived = trip.trip_status === "archived" && trip.deleted_at === null;
  const deleted = trip.deleted_at !== null;
  const canDelete = admin && !deleted;

  return (
    <Card className="relative overflow-hidden rounded-[18px] border border-[#d8e0f1] bg-white/82 shadow-[0_10px_30px_rgba(31,42,68,0.08)] dark:border-white/10 dark:bg-[var(--card)]">
      {canDelete ? (
        <form
          action={softDeleteTrip.bind(null, trip.id)}
          className="absolute right-3 top-3 z-10"
          onSubmit={(event) => {
            if (!window.confirm("Delete this trip? You can restore it later from Trash.")) {
              event.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            aria-label={`Delete ${trip.name}`}
            className="ios-pressable grid size-9 place-items-center rounded-full text-slate-500 transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          >
            <X size={16} />
          </button>
        </form>
      ) : null}
      <CardContent className="p-4 pr-12">
        <div className="min-w-0">
          <h3 className="break-words text-base font-bold tracking-[-0.02em] text-slate-950 dark:text-[var(--foreground)]">{trip.name}</h3>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-[var(--muted-foreground)]">
            <CalendarDays size={13} aria-hidden="true" />
            {dateRangeLabel(trip)}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <UIStatusBadge status={admin ? "Admin" : "Viewer"} tone={admin ? "primary" : "neutral"} className="min-h-5 px-1.5 py-0 text-[10px] leading-4" />
            <StatusBadge status={trip.trip_status} className="min-h-5 px-1.5 py-0 text-[10px] leading-4" />
            <UIStatusBadge status={travelerLabel(trip.traveler_count)} className="min-h-5 px-1.5 py-0 text-[10px] leading-4" />
          </div>
        </div>

        <div className="mt-4 border-t border-[#e5eaf5] pt-3 dark:border-white/10">
          {deleted && admin ? (
            <form action={restoreDeletedTrip.bind(null, trip.id)}>
              <Button className="w-full min-h-9 text-xs" variant="secondary" type="submit">
                <ArchiveRestore size={15} />
                Restore
              </Button>
            </form>
          ) : archived && admin ? (
            <form action={restoreArchivedTrip.bind(null, trip.id)}>
              <Button className="w-full min-h-9 text-xs" variant="secondary" type="submit">
                <ArchiveRestore size={15} />
                Restore
              </Button>
            </form>
          ) : admin ? (
            <TripCardActions tripId={trip.id} memberCount={trip.member_count} tripStatus={trip.trip_status} />
          ) : (
            <ButtonLink className="w-full min-h-9 text-xs" href={`/trips/${trip.id}/overview`}>Open</ButtonLink>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TripSection({
  title,
  icon,
  trips,
  empty,
  appRole,
  showcase = false,
}: {
  title: string;
  icon: ReactNode;
  trips: TripListItem[];
  empty: string;
  appRole: AppRole;
  showcase?: boolean;
}) {
  return (
    <section className="mx-auto grid w-full max-w-5xl gap-3">
      <h2 className="flex items-center gap-2 px-1 text-xl font-bold tracking-[-0.02em] text-slate-950 dark:text-[var(--foreground)]">
        {icon}
        {title}
      </h2>
      {trips.length ? (
        <div className={cn("grid gap-4", showcase && "sm:grid-cols-2 xl:grid-cols-2")}>
          {trips.map((trip) => (
            showcase ? <VisualTripCard key={trip.id} appRole={appRole} trip={trip} /> : <TripCard key={trip.id} appRole={appRole} trip={trip} />
          ))}
        </div>
      ) : (
        <Card className="rounded-[18px] border-dashed bg-white/48 shadow-none dark:bg-transparent">
          <CardContent className="p-0 px-4">
            <IOSListItem title={empty} description="This section will update as your travel workspace grows." />
          </CardContent>
        </Card>
      )}
    </section>
  );
}

export function TripsDashboard({ appRole, trips }: { appRole: AppRole; trips: TripListItem[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TripFilter>("all");
  const [showTrash, setShowTrash] = useState(false);
  const admin = isAppAdmin(appRole);

  const filteredTrips = useMemo(() => trips.filter((trip) => {
    if (!matchesSearch(trip, search)) return false;
    if (filter === "active") return trip.deleted_at === null && trip.trip_status !== "archived";
    if (filter === "archived") return trip.deleted_at === null && trip.trip_status === "archived";
    return true;
  }), [filter, search, trips]);

  const activeTrips = filteredTrips.filter((trip) => trip.deleted_at === null && trip.trip_status !== "archived");
  const archived = filteredTrips.filter((trip) => trip.deleted_at === null && trip.trip_status === "archived");
  const trash = filteredTrips.filter((trip) => trip.deleted_at !== null);

  return (
    <div className="mx-auto grid w-full max-w-5xl min-w-0 gap-5">
      <div className="mx-auto grid w-full max-w-5xl gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search trips</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search trips..."
              className="min-h-11 w-full min-w-0 rounded-[12px] border border-transparent bg-white/72 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none shadow-sm transition placeholder:text-slate-500 focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[var(--primary-soft)] dark:bg-white/10 dark:text-[var(--foreground)]"
            />
          </label>
          <button
            type="button"
            aria-pressed={showTrash}
            aria-label="Show trash section"
            onClick={() => setShowTrash((value) => !value)}
            className={cn(
              "ios-pressable grid size-11 shrink-0 place-items-center rounded-[12px] bg-white/72 text-slate-700 shadow-sm transition hover:bg-white dark:bg-white/10 dark:text-[var(--foreground)]",
              showTrash && "text-[var(--primary)] ring-4 ring-[var(--primary-soft)]",
            )}
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "ios-pressable min-h-8 rounded-full border px-3 text-xs font-semibold transition",
                filter === option.value
                  ? "border-transparent bg-[var(--primary)] text-white shadow-[0_8px_18px_rgba(8,120,249,0.25)]"
                  : "border-[#d8e0f1] bg-white/64 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-[var(--muted-foreground)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filter !== "archived" ? (
        <TripSection title="Trips" icon={<LockKeyhole size={20} />} trips={activeTrips} empty={admin ? "Create your first trip." : "No trips available yet."} appRole={appRole} showcase />
      ) : null}
      {admin ? (
        <div className="flex min-w-0 justify-start">
          <CreateTripModal />
        </div>
      ) : null}
      {filter !== "active" ? (
        <TripSection title="Archived" icon={<FolderArchive size={18} />} trips={archived} empty="No archived trips." appRole={appRole} />
      ) : null}
      {showTrash && admin ? (
        <>
          <TripSection title="Trash" icon={<Trash2 size={18} />} trips={trash} empty="Trash is empty." appRole={appRole} />
        </>
      ) : null}
    </div>
  );
}
