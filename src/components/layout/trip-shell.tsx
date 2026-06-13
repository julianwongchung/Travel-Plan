import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, ChevronLeft, Home, LogOut, MapPin, Plane, WalletCards } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { WorkspaceMobileNav } from "@/components/layout/workspace-mobile-nav";
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
    <div className="min-h-screen">
      <aside className="glass-surface-strong fixed inset-y-4 left-4 z-30 hidden w-72 rounded-[30px] p-5 xl:block">
        <Link href="/trips" className="flex items-center gap-3 text-lg font-bold tracking-[-0.02em]">
          <span className="grid size-11 place-items-center rounded-[16px] bg-[var(--primary)] text-white shadow-[0_8px_24px_rgba(10,132,255,0.28)]">
            <Plane size={20} />
          </span>
          Travel OS
        </Link>
        <GlassCard variant="subtle" className="mt-7 rounded-[22px] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Current trip</p>
          <h1 className="mt-1.5 text-lg font-bold tracking-[-0.02em]">{trip.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <RoleBadge role={role} />
            <StatusBadge status={trip.trip_status} />
          </div>
        </GlassCard>
        <nav className="mt-6 grid gap-1.5">
          {navItems.map((item) => (
            <Link key={item.href} href={`/trips/${trip.id}/${item.href}`} className="ios-pressable flex min-h-12 items-center gap-3 rounded-[17px] px-3.5 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
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

      <header className="glass-surface-strong sticky top-0 z-50 min-h-14 border-x-0 border-t-0 px-2.5 py-1.5 xl:ml-80 xl:min-h-0 xl:px-4 xl:py-3 xl:bg-transparent xl:shadow-none xl:backdrop-blur-none">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <Link href="/trips" aria-label="Back to My Trips" className="ios-pressable grid size-11 shrink-0 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
              <ChevronLeft size={16} />
            </Link>
            <h2 className="truncate text-sm font-bold tracking-[-0.02em] sm:text-base">{trip.name}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <RoleBadge role={role} className="min-h-6 px-2 py-0.5 text-[10px]" />
            <StatusBadge status={trip.trip_status} className="min-h-6 px-2 py-0.5 text-[10px]" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-7xl px-3 py-5 pb-32 sm:px-5 sm:py-6 xl:ml-80 xl:w-auto xl:max-w-[calc(100%-20rem)] xl:px-8 xl:pb-10">{children}</main>

      <WorkspaceMobileNav tripId={trip.id} />
    </div>
  );
}
