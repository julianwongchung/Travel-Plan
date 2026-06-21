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

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
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

  it("shows one Add launcher and opens a centered five-category chooser", () => {
    render(<AddExpenseSheet tripId="trip-1" travelers={travelers} defaultCurrency="MYR" />);

    expect(screen.getByRole("button", { name: "+ Add" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));

    expect(screen.getByRole("dialog", { name: "Add Expense" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Food" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Transport" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Purchase" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hotel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Insurance" })).toBeTruthy();
    expect(screen.getByRole("presentation").className.split(/\s+/)).toContain("items-center");
    expect(screen.getByRole("presentation").className.split(/\s+/)).not.toContain("items-end");
  });

  it("submits food expenses with payer only by default", async () => {
    render(<AddExpenseSheet tripId="trip-1" travelers={travelers} defaultCurrency="SGD" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Food" }));

    expect(screen.getByLabelText("Amount")).toBeTruthy();
    expect(screen.getByLabelText("Currency")).toHaveProperty("value", "SGD");
    expect(screen.getByLabelText("Who paid")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Expense name" })).toBeNull();
    expect(screen.queryByLabelText("Date")).toBeNull();
    expect(screen.getByText("Split")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Split expense" })).toHaveProperty("checked", false);
    expect(screen.queryByText("Equal split across all travelers")).toBeNull();

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "38.20" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), {
      target: { value: "Lunch" },
    });
    fireEvent.change(screen.getByLabelText("Who paid"), {
      target: { value: "traveler-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Food Expense" }));

    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1));
    const submitted = createExpense.mock.calls[0][1] as FormData;
    expect(submitted.get("category")).toBe("food");
    expect(submitted.get("expense_name")).toBe("Food");
    expect(submitted.get("total_amount")).toBe("38.2");
    expect(submitted.get("notes")).toBe("Lunch");
    expect(submitted.getAll("traveler_ids")).toEqual([]);
    expect(submitted.get("paid_by_traveler_id")).toBe("traveler-1");
    expect(String(submitted.get("expense_date"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(String(submitted.get("expense_time"))).toMatch(/^\d{2}:\d{2}$/);
  });

  it("submits equal split travelers only when split expense is enabled", async () => {
    render(<AddExpenseSheet tripId="trip-1" travelers={travelers} defaultCurrency="SGD" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Food" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Split expense" }));

    expect(screen.getByText("Equal split across all travelers")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "38.20" },
    });
    fireEvent.change(screen.getByLabelText("Who paid"), {
      target: { value: "traveler-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Food Expense" }));

    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1));
    const submitted = createExpense.mock.calls[0][1] as FormData;
    expect(submitted.getAll("traveler_ids")).toEqual(["traveler-1", "traveler-2"]);
  });

  it("submits only Clarrie in the split when Julian paid for Clarrie", async () => {
    render(<AddExpenseSheet tripId="trip-1" travelers={travelers} defaultCurrency="MYR" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Food" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Split expense" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Julian" }));

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Who paid"), {
      target: { value: "traveler-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Food Expense" }));

    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1));
    const submitted = createExpense.mock.calls[0][1] as FormData;
    expect(submitted.get("paid_by_traveler_id")).toBe("traveler-1");
    expect(submitted.getAll("traveler_ids")).toEqual(["traveler-2"]);
  });

  it("asks for a transport type before showing the simple transport form", async () => {
    render(<AddExpenseSheet tripId="trip-1" travelers={travelers} defaultCurrency="MYR" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Transport" }));

    expect(screen.getByRole("button", { name: "MRT" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Flight" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "GRAB" })).toBeTruthy();
    expect(screen.queryByLabelText("Amount")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "GRAB" }));

    expect(screen.getByLabelText("Amount")).toBeTruthy();
    expect(screen.getByLabelText("Currency")).toHaveProperty("value", "MYR");
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Transport type/name" })).toBeNull();
    expect(screen.getByLabelText("Who paid")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Split expense" })).toHaveProperty("checked", false);
    expect(screen.queryByText("Equal split across all travelers")).toBeNull();

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "18" },
    });
    fireEvent.change(screen.getByLabelText("Who paid"), {
      target: { value: "traveler-2" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), {
      target: { value: "Airport ride" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save GRAB Expense" }));

    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1));
    const submitted = createExpense.mock.calls[0][1] as FormData;
    expect(submitted.get("category")).toBe("transport");
    expect(submitted.get("expense_name")).toBe("GRAB");
    expect(submitted.get("total_amount")).toBe("18");
    expect(submitted.get("notes")).toBe("Airport ride");
    expect(submitted.get("paid_by_traveler_id")).toBe("traveler-2");
    expect(submitted.getAll("traveler_ids")).toEqual([]);
  });

  it("auto-generates purchase name and submits the simple purchase form", async () => {
    render(<AddExpenseSheet tripId="trip-1" travelers={travelers} defaultCurrency="VND" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Purchase" }));

    expect(screen.getByLabelText("Amount")).toBeTruthy();
    expect(screen.getByLabelText("Currency")).toHaveProperty("value", "VND");
    expect(screen.getByLabelText("Who paid")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Item name" })).toBeNull();
    expect(screen.queryByLabelText("Date")).toBeNull();

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "250000" },
    });
    fireEvent.change(screen.getByLabelText("Who paid"), {
      target: { value: "traveler-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Purchase Expense" }));

    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1));
    const submitted = createExpense.mock.calls[0][1] as FormData;
    expect(submitted.get("category")).toBe("purchase");
    expect(submitted.get("expense_name")).toBe("Purchase");
    expect(submitted.get("total_amount")).toBe("250000");
    expect(submitted.get("paid_by_traveler_id")).toBe("traveler-2");
    expect(submitted.getAll("traveler_ids")).toEqual([]);
  });

  it("adds hotel with amount, currency, who paid, and notes", async () => {
    render(<AddExpenseSheet tripId="trip-1" travelers={travelers} defaultCurrency="MYR" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Hotel" }));

    expect(screen.getByLabelText("Amount")).toBeTruthy();
    expect(screen.getByLabelText("Currency")).toHaveProperty("value", "MYR");
    expect(screen.getByLabelText("Who paid")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Expense name" })).toBeNull();
    expect(screen.queryByText("Split with people")).toBeNull();

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "450" },
    });
    fireEvent.change(screen.getByLabelText("Who paid"), {
      target: { value: "traveler-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Hotel Expense" }));

    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1));
    const submitted = createExpense.mock.calls[0][1] as FormData;
    expect(submitted.get("category")).toBe("hotel");
    expect(submitted.get("expense_name")).toBe("Hotel");
    expect(submitted.get("paid_by_traveler_id")).toBe("traveler-1");
    expect(submitted.getAll("traveler_ids")).toEqual([]);
  });

  it("adds insurance with payer only by default", async () => {
    render(<AddExpenseSheet tripId="trip-1" travelers={travelers} defaultCurrency="MYR" />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Insurance" }));

    expect(screen.getByLabelText("Amount")).toBeTruthy();
    expect(screen.getByLabelText("Currency")).toHaveProperty("value", "MYR");
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeTruthy();
    expect(screen.getByLabelText("Who paid")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Split expense" })).toHaveProperty("checked", false);
    expect(screen.queryByText("Equal split across all travelers")).toBeNull();

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "80" },
    });
    fireEvent.change(screen.getByLabelText("Who paid"), {
      target: { value: "traveler-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Insurance Expense" }));

    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1));
    const submitted = createExpense.mock.calls[0][1] as FormData;
    expect(submitted.get("category")).toBe("insurance");
    expect(submitted.get("expense_name")).toBe("Insurance");
    expect(submitted.get("paid_by_traveler_id")).toBe("traveler-1");
    expect(submitted.getAll("traveler_ids")).toEqual([]);
  });
});
