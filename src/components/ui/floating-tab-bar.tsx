"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MapPin, Plane, ShieldCheck, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type FloatingTabBarIcon = "trips" | "overview" | "trip-plan" | "places" | "expenses" | "admin";

const icons = {
  trips: Plane,
  overview: Home,
  "trip-plan": CalendarDays,
  places: MapPin,
  expenses: WalletCards,
  admin: ShieldCheck,
} satisfies Record<FloatingTabBarIcon, typeof Home>;

export type FloatingTabBarItem = {
  href: string;
  label: string;
  icon: FloatingTabBarIcon;
};

function normalizePath(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function isActiveTab(pathname: string, href: string) {
  const currentPath = normalizePath(pathname);
  const itemPath = normalizePath(href);

  if (itemPath === "/trips") {
    return currentPath === itemPath;
  }

  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

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
      <div
        className="ios-glass pointer-events-auto mx-auto grid w-full max-w-md overflow-hidden rounded-[26px] p-1"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = isActiveTab(pathname, item.href);
          const Icon = icons[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "ios-pressed grid min-h-12 w-full min-w-0 place-items-center gap-0.5 overflow-hidden rounded-[20px] px-0.5 py-1.5 text-center text-[9px] font-semibold leading-3 text-[var(--muted-foreground)] sm:px-1",
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
