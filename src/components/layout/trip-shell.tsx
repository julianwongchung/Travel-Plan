import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, Home, LogOut, MapPin, Plane, WalletCards } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/trip/role-badge";
import { StatusBadge } from "@/components/trip/status-badge";
import type { Role, Trip, TripInvitation, TripMember } from "@/lib/db/types";

const navItems = [
  { href: "overview", label: "Overview", icon: Home },
  { href: "trip-plan", label: "Trip Plan", icon: CalendarDays },
  { href: "places", label: "Places", icon: MapPin },
  { href: "expenses", label: "Expenses", icon: WalletCards },
];

export function TripShell({
  trip,
  role,
  children,
}: {
  trip: Trip;
  role: Role;
  members: TripMember[];
  invitations: TripInvitation[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[var(--border)] bg-white p-5 lg:block">
        <Link href="/trips" className="flex items-center gap-3 text-lg font-bold">
          <span className="grid size-10 place-items-center rounded-lg bg-[var(--primary)] text-white">
            <Plane size={20} />
          </span>
          Travel OS
        </Link>
        <div className="mt-6 rounded-lg bg-[var(--muted)] p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Current trip</p>
          <h1 className="mt-1 text-lg font-bold">{trip.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <RoleBadge role={role} />
            <StatusBadge status={trip.trip_status} />
          </div>
        </div>
        <nav className="mt-6 grid gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={`/trips/${trip.id}/${item.href}`} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-700 hover:bg-[var(--muted)]">
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="absolute bottom-5 left-5 right-5">
          <Button variant="secondary" className="w-full" type="submit">
            <LogOut size={16} />
            Sign out
          </Button>
        </form>
      </aside>

      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/95 px-4 py-3 backdrop-blur lg:ml-72">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/trips" className="text-xs font-bold uppercase text-slate-500">
              My Trips
            </Link>
            <h2 className="text-xl font-bold">{trip.name}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role={role} />
            <StatusBadge status={trip.trip_status} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 pb-28 lg:ml-72 lg:px-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--border)] bg-white px-2 py-2 shadow-lg lg:hidden">
        {navItems.map((item) => (
          <Link key={item.href} href={`/trips/${trip.id}/${item.href}`} className="grid min-h-14 justify-items-center gap-1 rounded-md px-1 py-2 text-xs font-bold text-slate-600">
            <item.icon size={19} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
