// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { createTripFromModal, push } = vi.hoisted(() => ({
  createTripFromModal: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/lib/actions/trips", () => ({
  createTripFromModal,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { CreateTripModal } from "@/components/trips/create-trip-modal";

const travelerDraftStorageKey = "travel-os:create-trip:traveler-names";

describe("CreateTripModal", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    createTripFromModal.mockReset();
    createTripFromModal.mockResolvedValue("trip-1");
    push.mockReset();
  });

  function openModal() {
    render(<CreateTripModal />);
    fireEvent.click(screen.getByRole("button", { name: "Create Private Trip" }));
  }

  function fillRequiredTripFields() {
    fireEvent.change(screen.getByRole("textbox", { name: "Trip name" }), {
      target: { value: "Osaka Trip" },
    });
    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2026-11-20" },
    });
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2026-11-25" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Country" }), {
      target: { value: "Japan" },
    });
  }

  it("uses traveler name rows instead of a traveler count", () => {
    openModal();

    expect(screen.getByText("Traveler name")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add traveler" })).toBeTruthy();
    expect(screen.queryByText("Number of travelers if available")).toBeNull();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("persists traveler drafts and submits trimmed unique traveler names", async () => {
    openModal();
    fillRequiredTripFields();

    fireEvent.change(screen.getByRole("textbox", { name: "Traveler name" }), {
      target: { value: "  Julian  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add traveler" }));
    fireEvent.change(screen.getAllByRole("textbox", { name: "Traveler name" })[1], {
      target: { value: "Clarrie" },
    });

    await waitFor(() => {
      expect(window.sessionStorage.getItem(travelerDraftStorageKey)).toContain("Julian");
    });

    await waitFor(() => {
      expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createTripFromModal).toHaveBeenCalledTimes(1));
    const submitted = createTripFromModal.mock.calls[0][0] as FormData;
    expect(submitted.get("travelers")).toBe("Julian\nClarrie");
    await waitFor(() => {
      expect(window.sessionStorage.getItem(travelerDraftStorageKey)).toBeNull();
    });
    expect(push).toHaveBeenCalledWith("/trips/trip-1/overview");
  });

  it("blocks duplicate traveler names before creating", async () => {
    openModal();
    fillRequiredTripFields();

    fireEvent.change(screen.getByRole("textbox", { name: "Traveler name" }), {
      target: { value: "Julian" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add traveler" }));
    fireEvent.change(screen.getAllByRole("textbox", { name: "Traveler name" })[1], {
      target: { value: " julian " },
    });

    expect(screen.getByText("Traveler names must be unique.")).toBeTruthy();
    await waitFor(() => {
      expect((screen.getByRole("button", { name: "Create" }) as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
