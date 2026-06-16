// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { createExpense, refresh } = vi.hoisted(() => ({
  createExpense: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/actions/expenses", () => ({
  createExpense,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { AddExpenseSheet } from "@/components/expenses/add-expense-sheet";

const travelers = [
  { id: "traveler-1", name: "Julian" },
  { id: "traveler-2", name: "Clarrie" },
];

describe("AddExpenseSheet", () => {
  afterEach(() => {
    cleanup();
    createExpense.mockReset();
    createExpense.mockResolvedValue(undefined);
    refresh.mockReset();
  });

  it("shows one Add launcher and opens a three-category chooser", () => {
    render(<AddExpenseSheet tripId="trip-1" travelers={travelers} defaultCurrency="MYR" />);

    expect(screen.getByRole("button", { name: "+ Add" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));

    expect(screen.getByRole("dialog", { name: "Add Expense" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Food" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Transport" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Purchase" })).toBeTruthy();
  });

  it("shows category-specific fields while preserving shared payment and split controls", () => {
    render(<AddExpenseSheet tripId="trip-1" travelers={travelers} defaultCurrency="SGD" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Transport" }));

    expect(screen.getByRole("textbox", { name: "Transport type/name" })).toBeTruthy();
    expect(screen.getByLabelText("Amount")).toBeTruthy();
    expect(screen.getByLabelText("Currency")).toHaveProperty("value", "SGD");
    expect(screen.getByLabelText("Date/time")).toBeTruthy();
    expect(screen.getByLabelText("Person who paid")).toBeTruthy();
    expect(screen.getByText("Split with people")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Expense name" })).toBeNull();
  });

  it("submits the selected category and existing split fields", async () => {
    render(<AddExpenseSheet tripId="trip-1" travelers={travelers} defaultCurrency="MYR" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Food" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Expense name" }), {
      target: { value: "Dinner" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "120.50" },
    });
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-06-15" },
    });
    fireEvent.change(screen.getByLabelText("Person who paid"), {
      target: { value: "traveler-1" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), {
      target: { value: "Team dinner" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Food Expense" }));

    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1));
    const submitted = createExpense.mock.calls[0][1] as FormData;
    expect(submitted.get("category")).toBe("food");
    expect(submitted.get("expense_name")).toBe("Dinner");
    expect(submitted.get("total_amount")).toBe("120.5");
    expect(submitted.get("expense_date")).toBe("2026-06-15");
    expect(submitted.get("notes")).toBe("Team dinner");
    expect(submitted.getAll("traveler_ids")).toEqual(["traveler-1", "traveler-2"]);
    expect(refresh).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
