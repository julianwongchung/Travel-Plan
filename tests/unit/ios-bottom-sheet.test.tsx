// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { IOSBottomSheet } from "@/components/ui/ios-bottom-sheet";

describe("IOSBottomSheet", () => {
  afterEach(cleanup);

  it("portals the fixed overlay outside transformed page containers", () => {
    render(
      <div data-testid="page-container" style={{ transform: "translateY(0)" }}>
        <IOSBottomSheet open title="Add Expense" onClose={() => undefined}>
          <p>Sheet content</p>
        </IOSBottomSheet>
      </div>,
    );

    const pageContainer = screen.getByTestId("page-container");
    const dialog = screen.getByRole("dialog", { name: "Add Expense" });

    expect(pageContainer.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("can center the sheet for flows that should not use a mobile bottom sheet", () => {
    render(
      <IOSBottomSheet open title="Add Expense" placement="center" onClose={() => undefined}>
        <p>Sheet content</p>
      </IOSBottomSheet>,
    );

    expect(screen.getByRole("presentation").className.split(/\s+/)).toContain("items-center");
    expect(screen.getByRole("presentation").className.split(/\s+/)).not.toContain("items-end");
    expect(screen.getByRole("dialog", { name: "Add Expense" }).className).toContain("rounded-[30px]");
  });
});
