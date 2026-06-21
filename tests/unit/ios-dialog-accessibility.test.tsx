// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IOSBottomSheet } from "@/components/ui/ios-bottom-sheet";
import { IOSModal } from "@/components/ui/ios-modal";

describe("iOS dialog accessibility", () => {
  afterEach(cleanup);

  it("closes bottom sheets with Escape", () => {
    const onClose = vi.fn();
    render(
      <IOSBottomSheet open title="Add Expense" onClose={onClose}>
        <button type="button">Focusable action</button>
      </IOSBottomSheet>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes modals with Escape", () => {
    const onClose = vi.fn();
    render(
      <IOSModal open title="Create Private Trip" onClose={onClose}>
        <button type="button">Focusable action</button>
      </IOSModal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the opened dialog", () => {
    render(
      <IOSBottomSheet open title="Invite People" onClose={() => undefined}>
        <button type="button">Send Invite</button>
      </IOSBottomSheet>,
    );

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
  });
});
