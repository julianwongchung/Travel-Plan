"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MapPin, Plane, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type FloatingTabBarIcon = "trips" | "overview" | "trip-plan" | "places" | "expenses";

const icons = {
  trips: Plane,
  overview: Home,
  "trip-plan": CalendarDays,
  places: MapPin,
  expenses: WalletCards,
} satisfies Record<FloatingTabBarIcon, typeof Home>;

export type FloatingTabBarItem = {
  href: string;
  label: string;
  icon: FloatingTabBarIcon;
};

export function FloatingTabBar({
  items,
  ariaLabel = "Trip navigation",
}: {
  items: FloatingTabBarItem[];
  ariaLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={ariaLabel}
      className="pointer-events-none fixed inset-x-2 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] z-[100] sm:inset-x-3 xl:hidden"
    >
      <div className="ios-glass pointer-events-auto mx-auto grid max-w-md grid-flow-col auto-cols-fr rounded-[26px] p-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = icons[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "ios-pressed grid min-h-12 min-w-0 place-items-center gap-0.5 rounded-[20px] px-0.5 py-1.5 text-center text-[9px] font-semibold leading-3 text-[var(--muted-foreground)] sm:px-1",
                active && "bg-[var(--card-strong)] text-[var(--primary)] shadow-sm",
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
