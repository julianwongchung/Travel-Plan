"use client";

import { FloatingTabBar, type FloatingTabBarItem } from "@/components/ui/floating-tab-bar";
import type { AppRole } from "@/lib/db/types";
import { canAccessAdmin, canAccessExpenses, canAccessOverview, canAccessPlaces, canAccessTripPlan } from "@/lib/utils/permissions";

export function WorkspaceMobileNav({ appRole = "viewer", tripId }: { appRole?: AppRole; tripId?: string | null }) {
  const items: FloatingTabBarItem[] = [
    { href: "/trips", label: "Trips", icon: "trips" },
  ];

  if (tripId) {
    if (canAccessOverview(appRole)) {
      items.push({ href: `/trips/${tripId}/overview`, label: "Overview", icon: "overview" });
    }
    if (canAccessTripPlan(appRole)) {
      items.push({ href: `/trips/${tripId}/trip-plan`, label: "Plan", icon: "trip-plan" });
    }
    if (canAccessPlaces(appRole)) {
      items.push({ href: `/trips/${tripId}/places`, label: "Places", icon: "places" });
    }
    if (canAccessExpenses(appRole)) {
      items.push({ href: `/trips/${tripId}/expenses`, label: "Expenses", icon: "expenses" });
    }
  }

  if (canAccessAdmin(appRole)) {
    items.push({ href: "/admin", label: "Admin", icon: "admin" });
  }

  return <FloatingTabBar ariaLabel="Workspace navigation" items={items} />;
}
