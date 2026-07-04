import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, ChevronLeft, Home, LogOut, MapPin, ShieldCheck, WalletCards } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { AppLogo } from "@/components/layout/app-logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { WorkspaceMobileNav } from "@/components/layout/workspace-mobile-nav";
import { StatusBadge } from "@/components/trip/status-badge";
import { StatusBadge as UIStatusBadge } from "@/components/ui/status-badge";
import type { AppRole, Trip } from "@/lib/db/types";
import { canAccessAdmin, canAccessExpenses, canAccessOverview, canAccessPlaces, canAccessTripPlan } from "@/lib/utils/permissions";

const navItems = [
  { href: "overview", label: "Overview", icon: Home, canAccess: canAccessOverview },
  { href: "trip-plan", label: "Trip Plan", icon: CalendarDays, canAccess: canAccessTripPlan },
  { href: "places", label: "Places", icon: MapPin, canAccess: canAccessPlaces },
  { href: "expenses", label: "Expenses", icon: WalletCards, canAccess: canAccessExpenses },
];

export function TripShell({
  trip,
  appRole,
  isAuthenticated = true,
  children,
}: {
  trip: Trip;
  appRole: AppRole;
  isAuthenticated?: boolean;
  children: ReactNode;
}) {
  const visibleNavItems = navItems.filter((item) => item.canAccess(appRole));
  const accountBadge = appRole === "admin" ? "Admin" : "Viewer";

  return (
    <div className="min-h-screen">
      <aside className="glass-surface-strong fixed inset-y-4 left-4 z-30 hidden w-72 rounded-[30px] p-5 xl:block">
        <AppLogo imageClassName="w-[174px]" />
        <GlassCard variant="subtle" className="mt-7 rounded-[22px] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Current trip</p>
          <h1 className="mt-1.5 text-lg font-bold tracking-[-0.02em]">{trip.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <UIStatusBadge status={accountBadge} tone={appRole === "admin" ? "primary" : "neutral"} />
            <StatusBadge status={trip.trip_status} />
          </div>
        </GlassCard>
        <nav className="mt-6 grid gap-1.5">
          {visibleNavItems.map((item) => (
            <Link key={item.href} href={`/trips/${trip.id}/${item.href}`} className="ios-pressable flex min-h-12 items-center gap-3 rounded-[17px] px-3.5 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
          {canAccessAdmin(appRole) ? (
            <Link href="/admin" className="ios-pressable flex min-h-12 items-center gap-3 rounded-[17px] px-3.5 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
              <ShieldCheck size={18} />
              Admin
            </Link>
          ) : null}
        </nav>
        {isAuthenticated ? (
          <form action={signOut} className="absolute bottom-5 left-5 right-5">
            <Button variant="secondary" className="w-full" type="submit">
              <LogOut size={16} />
              Sign out
            </Button>
          </form>
        ) : (
          <ButtonLink href="/login" variant="secondary" className="absolute bottom-5 left-5 right-5 justify-center">
            Log in
          </ButtonLink>
        )}
      </aside>

      <header className="glass-surface-strong sticky top-0 z-50 min-h-14 border-x-0 border-t-0 px-2.5 py-1.5 xl:ml-80 xl:min-h-0 xl:px-4 xl:py-3 xl:bg-transparent xl:shadow-none xl:backdrop-blur-none">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <AppLogo className="xl:hidden" imageClassName="w-[104px] sm:w-[126px]" />
            <Link href="/trips" aria-label="Back to My Trips" className="ios-pressable grid size-11 shrink-0 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
              <ChevronLeft size={16} />
            </Link>
            <h2 className="truncate text-sm font-bold tracking-[-0.02em] sm:text-base">{trip.name}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <UIStatusBadge status={accountBadge} tone={appRole === "admin" ? "primary" : "neutral"} className="min-h-6 px-2 py-0.5 text-[10px]" />
            <StatusBadge status={trip.trip_status} className="min-h-6 px-2 py-0.5 text-[10px]" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-7xl px-3 py-5 pb-32 sm:px-5 sm:py-6 xl:ml-80 xl:w-auto xl:max-w-[calc(100%-20rem)] xl:px-8 xl:pb-10">{children}</main>

      <WorkspaceMobileNav tripId={trip.id} appRole={appRole} />
    </div>
  );
}
