// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceMobileNav } from "@/components/layout/workspace-mobile-nav";

const pathname = vi.hoisted(() => ({ value: "/trips" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

describe("WorkspaceMobileNav", () => {
  afterEach(() => {
    cleanup();
    pathname.value = "/trips";
  });

  it("keeps the mobile navigation available from My Trips", () => {
    render(<WorkspaceMobileNav tripId="trip-1" appRole="viewer" />);

    const navigation = screen.getByRole("navigation", { name: "Workspace navigation" });
    expect(navigation.className).toContain("fixed");
    expect(screen.getByRole("link", { name: "Trips" }).getAttribute("href")).toBe("/trips");
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/trips/trip-1/overview");
    expect(screen.getByRole("link", { name: "Plan" }).getAttribute("href")).toBe("/trips/trip-1/trip-plan");
    expect(screen.getByRole("link", { name: "Places" }).getAttribute("href")).toBe("/trips/trip-1/places");
    expect(screen.getByRole("link", { name: "Expenses" }).getAttribute("href")).toBe("/trips/trip-1/expenses");
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
  });

  it("shows the full mobile navigation for admins", () => {
    render(<WorkspaceMobileNav tripId="trip-1" appRole="admin" />);

    expect(screen.getByRole("link", { name: "Trips" }).getAttribute("href")).toBe("/trips");
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/trips/trip-1/overview");
    expect(screen.getByRole("link", { name: "Plan" }).getAttribute("href")).toBe("/trips/trip-1/trip-plan");
    expect(screen.getByRole("link", { name: "Places" }).getAttribute("href")).toBe("/trips/trip-1/places");
    expect(screen.getByRole("link", { name: "Expenses" }).getAttribute("href")).toBe("/trips/trip-1/expenses");
    expect(screen.getByRole("link", { name: "Admin" }).getAttribute("href")).toBe("/admin");
  });

  it.each([
    { route: "/trips", active: "Trips" },
    { route: "/trips/trip-1/overview", active: "Overview" },
    { route: "/trips/trip-1/trip-plan", active: "Plan" },
    { route: "/trips/trip-1/places", active: "Places" },
    { route: "/trips/trip-1/expenses", active: "Expenses" },
  ])("keeps the active highlight behind $active", ({ route, active }) => {
    pathname.value = route;
    render(<WorkspaceMobileNav tripId="trip-1" appRole="admin" />);

    const activeLink = screen.getByRole("link", { name: active });
    const currentLinks = screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");

    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0]).toBe(activeLink);
    expect(activeLink.className).toContain("w-full");
    expect(activeLink.className).toContain("overflow-hidden");
    expect(activeLink.className).toContain("bg-[var(--card-strong)]");
  });
});
