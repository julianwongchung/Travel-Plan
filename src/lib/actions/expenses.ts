"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedClient, nullable, value } from "@/lib/actions/helpers";
import type { Currency } from "@/lib/db/types";
import { calculateEqualSplits, validateCustomSplits, type SplitInput } from "@/lib/utils/expense-calculations";

const currencySchema = z.enum(["MYR", "SGD", "USD", "VND", "THB", "IDR", "PHP", "JPY", "KRW", "TWD", "HKD"]);

function parseSplits(formData: FormData, total: number): SplitInput[] {
  const travelerIds = formData.getAll("traveler_ids").map((item) => String(item));
  const customSplits = travelerIds.map((travelerId) => ({
    travelerId,
    amount: Number(value(formData, `split_${travelerId}`, "0")),
  }));
  const hasCustom = customSplits.some((split) => split.amount > 0);

  if (!hasCustom) {
    return calculateEqualSplits(total, travelerIds);
  }

  if (!validateCustomSplits(total, customSplits)) {
    throw new Error("Split amounts must equal total amount.");
  }

  return customSplits;
}

export async function createExpense(tripId: string, formData: FormData) {
  const supabase = await authedClient();
  const total = Number(value(formData, "total_amount", "0"));
  const splits = parseSplits(formData, total);
  const { error } = await supabase.rpc("create_expense", {
    p_trip_id: tripId,
    p_category: nullable(formData, "category"),
    p_expense_name: value(formData, "expense_name"),
    p_currency: currencySchema.parse(value(formData, "currency", "MYR")) as Currency,
    p_total_amount: total,
    p_paid_by_traveler_id: nullable(formData, "paid_by_traveler_id"),
    p_splits: splits.map((split) => ({ traveler_id: split.travelerId, amount: split.amount })),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/expenses`);
}

export async function updateExpense(tripId: string, expenseId: string, formData: FormData) {
  const supabase = await authedClient();
  const total = Number(value(formData, "total_amount", "0"));
  const splits = parseSplits(formData, total);
  const { error } = await supabase.rpc("update_expense", {
    p_expense_id: expenseId,
    p_category: nullable(formData, "category"),
    p_expense_name: value(formData, "expense_name"),
    p_currency: currencySchema.parse(value(formData, "currency", "MYR")) as Currency,
    p_total_amount: total,
    p_paid_by_traveler_id: nullable(formData, "paid_by_traveler_id"),
    p_splits: splits.map((split) => ({ traveler_id: split.travelerId, amount: split.amount })),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/expenses`);
}

export async function softDeleteExpense(tripId: string, expenseId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("soft_delete_expense", { p_expense_id: expenseId });
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/expenses`);
}

export async function restoreExpense(tripId: string, expenseId: string) {
  const supabase = await authedClient();
  const { error } = await supabase.rpc("restore_expense", { p_expense_id: expenseId });
  if (error) throw new Error(error.message);
  revalidatePath(`/trips/${tripId}/expenses`);
}
