// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceMobileNav } from "@/components/layout/workspace-mobile-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/trips",
}));

describe("WorkspaceMobileNav", () => {
  it("keeps the mobile navigation available from My Trips", () => {
    render(<WorkspaceMobileNav tripId="trip-1" />);

    const navigation = screen.getByRole("navigation", { name: "Workspace navigation" });
    expect(navigation.className).toContain("fixed");
    expect(screen.getByRole("link", { name: "Trips" }).getAttribute("href")).toBe("/trips");
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("/trips/trip-1/overview");
    expect(screen.getByRole("link", { name: "Plan" }).getAttribute("href")).toBe("/trips/trip-1/trip-plan");
    expect(screen.getByRole("link", { name: "Places" }).getAttribute("href")).toBe("/trips/trip-1/places");
    expect(screen.getByRole("link", { name: "Expenses" }).getAttribute("href")).toBe("/trips/trip-1/expenses");
  });
});
