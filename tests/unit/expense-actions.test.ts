import { beforeEach, describe, expect, it, vi } from "vitest";

const { authedClient, revalidatePath, rpc } = vi.hoisted(() => ({
  authedClient: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/actions/helpers", () => ({
  authedClient,
  value: (formData: FormData, key: string, fallback = "") => String(formData.get(key) ?? fallback).trim(),
  nullable: (formData: FormData, key: string) => {
    const text = String(formData.get(key) ?? "").trim();
    return text.length > 0 ? text : null;
  },
}));

import { createExpense } from "@/lib/actions/expenses";

function expenseFormData(overrides: Record<string, string | string[]> = {}) {
  const formData = new FormData();
  formData.set("category", "food");
  formData.set("expense_name", "Food");
  formData.set("currency", "MYR");
  formData.set("total_amount", "10");
  formData.set("paid_by_traveler_id", "traveler-1");

  for (const [key, value] of Object.entries(overrides)) {
    formData.delete(key);
    if (Array.isArray(value)) {
      value.forEach((entry) => formData.append(key, entry));
    } else {
      formData.set(key, value);
    }
  }

  return formData;
}

describe("expense actions", () => {
  beforeEach(() => {
    revalidatePath.mockReset();
    rpc.mockReset();
    authedClient.mockReset();
    authedClient.mockResolvedValue({ rpc });
    rpc.mockResolvedValue({ error: null });
  });

  it("rejects expense creation without a payer", async () => {
    await expect(createExpense("trip-1", expenseFormData({ paid_by_traveler_id: "" })))
      .rejects.toThrow("Who paid is required.");

    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(["0", "-1", "NaN", "Infinity", "", "not-a-number"])(
    "rejects invalid amount %s before calling the RPC",
    async (amount) => {
      await expect(createExpense("trip-1", expenseFormData({ total_amount: amount })))
        .rejects.toThrow(/Amount must be/);

      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it("creates a payer-only split when split travelers are not submitted", async () => {
    await createExpense("trip-1", expenseFormData());

    expect(rpc).toHaveBeenCalledWith("create_expense", expect.objectContaining({
      p_paid_by_traveler_id: "traveler-1",
      p_splits: [
        { traveler_id: "traveler-1", amount: 10 },
      ],
    }));
  });

  it("creates equal split payloads for submitted travelers", async () => {
    await createExpense("trip-1", expenseFormData({
      traveler_ids: ["traveler-1", "traveler-2"],
    }));

    expect(rpc).toHaveBeenCalledWith("create_expense", expect.objectContaining({
      p_paid_by_traveler_id: "traveler-1",
      p_splits: [
        { traveler_id: "traveler-1", amount: 5 },
        { traveler_id: "traveler-2", amount: 5 },
      ],
    }));
  });
});
