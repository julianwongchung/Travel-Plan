// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TripCardActions } from "@/components/trips/trip-card-actions";

describe("TripCardActions", () => {
  afterEach(cleanup);

  it("keeps Open primary and exposes admin trip actions", () => {
    render(<TripCardActions tripId="trip-1" memberCount={2} />);

    expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe("/trips/trip-1/overview");
    expect(screen.getByRole("button", { name: "Invite People" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Archive trip" })).toBeTruthy();
  });

  it("opens the invite sheet directly from the trip card", () => {
    render(<TripCardActions tripId="trip-1" memberCount={2} />);

    fireEvent.click(screen.getByRole("button", { name: "Invite People" }));

    expect(screen.getByRole("dialog", { name: "Invite People" })).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.queryByLabelText("Role")).toBeNull();
  });
});
