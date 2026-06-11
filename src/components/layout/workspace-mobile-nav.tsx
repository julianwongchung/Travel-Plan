"use client";

import { FloatingTabBar, type FloatingTabBarItem } from "@/components/ui/floating-tab-bar";

export function WorkspaceMobileNav({ tripId }: { tripId?: string | null }) {
  const items: FloatingTabBarItem[] = [
    { href: "/trips", label: "Trips", icon: "trips" },
  ];

  if (tripId) {
    items.push(
      { href: `/trips/${tripId}/overview`, label: "Overview", icon: "overview" },
      { href: `/trips/${tripId}/trip-plan`, label: "Plan", icon: "trip-plan" },
      { href: `/trips/${tripId}/places`, label: "Places", icon: "places" },
      { href: `/trips/${tripId}/expenses`, label: "Expenses", icon: "expenses" },
    );
  }

  return <FloatingTabBar ariaLabel="Workspace navigation" items={items} />;
}
