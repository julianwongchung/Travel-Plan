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
});
