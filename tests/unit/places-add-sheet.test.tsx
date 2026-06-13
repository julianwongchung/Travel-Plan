// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlacesAddSheet } from "@/components/places/places-add-sheet";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("PlacesAddSheet", () => {
  afterEach(cleanup);

  it("opens one menu with Hotel, Flight, and Place choices", () => {
    render(<PlacesAddSheet tripId="trip-1" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));

    expect(screen.getByRole("button", { name: "Add Hotel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Flight" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Place" })).toBeTruthy();
  });

  it("opens the selected structured form", () => {
    render(<PlacesAddSheet tripId="trip-1" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Hotel" }));

    expect(screen.getByLabelText("Hotel name")).toBeTruthy();
    expect(screen.getByLabelText("Location/address")).toBeTruthy();
    expect(screen.getByLabelText("Check-in date")).toBeTruthy();
    expect(screen.getByLabelText("Check-out date")).toBeTruthy();
  });
});
