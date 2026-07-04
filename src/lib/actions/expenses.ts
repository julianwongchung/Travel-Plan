"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { throwSafeActionError } from "@/lib/actions/action-errors";
import { authedActiveClient, authedAdminClient, nullable, value } from "@/lib/actions/helpers";
import type { Currency } from "@/lib/db/types";
import { calculateEqualSplits, validateCustomSplits, type SplitInput } from "@/lib/utils/expense-calculations";

const currencySchema = z.enum(["MYR", "SGD", "USD", "VND", "THB", "IDR", "PHP", "JPY", "KRW", "TWD", "HKD", "CNY"]);
const categorySchema = z.enum(["food", "transport", "purchase"]).or(z.string().trim().min(1));
const amountSchema = z.coerce
  .number()
  .finite("Amount must be a valid number.")
  .positive("Amount must be greater than zero.");
const splitAmountSchema = z.coerce
  .number()
  .finite("Split amount must be a valid number.")
  .nonnegative("Split amount cannot be negative.");

function parsePositiveAmount(rawValue: string) {
  const result = amountSchema.safeParse(rawValue);
  if (!result.success) {
    throw new Error("Amount must be greater than zero.");
  }
  return result.data;
}

function parseSplitAmount(rawValue: string) {
  const result = splitAmountSchema.safeParse(rawValue);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Split amount must be a valid number.");
  }
  return result.data;
}

type ExpenseRpcError = {
  code?: string;
  message?: string;
};

function isMissingExpenseMetadataRpc(error: ExpenseRpcError | null) {
  if (!error) return false;
  return error.code === "PGRST202" && /schema cache/i.test(error.message ?? "");
}

function legacyCreateExpenseArgs(args: {
  p_trip_id: string;
  p_category: string;
  p_expense_name: string;
  p_currency: Currency;
  p_total_amount: number;
  p_paid_by_traveler_id: string | null;
  p_splits: { traveler_id: string; amount: number }[];
}) {
  return args as {
    p_trip_id: string;
    p_category: string;
    p_expense_name: string;
    p_currency: Currency;
    p_total_amount: number;
    p_paid_by_traveler_id: string | null;
    p_splits: { traveler_id: string; amount: number }[];
    p_expense_date: string | null;
    p_expense_time: string | null;
    p_notes: string | null;
  };
}

function legacyUpdateExpenseArgs(args: {
  p_expense_id: string;
  p_category: string;
  p_expense_name: string;
  p_currency: Currency;
  p_total_amount: number;
  p_paid_by_traveler_id: string | null;
  p_splits: { traveler_id: string; amount: number }[];
}) {
  return args as {
    p_expense_id: string;
    p_category: string;
    p_expense_name: string;
    p_currency: Currency;
    p_total_amount: number;
    p_paid_by_traveler_id: string | null;
    p_splits: { traveler_id: string; amount: number }[];
    p_expense_date: string | null;
    p_expense_time: string | null;
    p_notes: string | null;
  };
}

function parseSplits(formData: FormData, total: number, paidByTravelerId: string): SplitInput[] {
  const travelerIds = Array.from(new Set(
    formData
      .getAll("traveler_ids")
      .map((item) => String(item).trim())
      .filter(Boolean),
  ));
  if (travelerIds.length === 0) {
    return [{ travelerId: paidByTravelerId, amount: total }];
  }

  const customSplits = travelerIds.map((travelerId) => ({
    travelerId,
    amount: parseSplitAmount(value(formData, `split_${travelerId}`, "0")),
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
  const supabase = await authedActiveClient();
  const total = parsePositiveAmount(value(formData, "total_amount", ""));
  const paidByTravelerId = nullable(formData, "paid_by_traveler_id");
  if (!paidByTravelerId) {
    throw new Error("Who paid is required.");
  }

  const splits = parseSplits(formData, total, paidByTravelerId);
  const splitPayload = splits.map((split) => ({ traveler_id: split.travelerId, amount: split.amount }));
  const baseArgs = {
    p_trip_id: tripId,
    p_category: categorySchema.parse(value(formData, "category")),
    p_expense_name: value(formData, "expense_name"),
    p_currency: currencySchema.parse(value(formData, "currency", "MYR")) as Currency,
    p_total_amount: total,
    p_paid_by_traveler_id: paidByTravelerId,
    p_splits: splitPayload,
  };
  const { error } = await supabase.rpc("create_expense", {
    ...baseArgs,
    p_expense_date: nullable(formData, "expense_date"),
    p_expense_time: nullable(formData, "expense_time"),
    p_notes: nullable(formData, "notes"),
  });

  if (isMissingExpenseMetadataRpc(error)) {
    const { error: legacyError } = await supabase.rpc("create_expense", legacyCreateExpenseArgs(baseArgs));
    if (legacyError) throwSafeActionError(legacyError);
  } else if (error) {
    throwSafeActionError(error);
  }

  revalidatePath(`/trips/${tripId}/expenses`);
}

export async function updateExpense(tripId: string, expenseId: string, formData: FormData) {
  const supabase = await authedAdminClient();
  const total = parsePositiveAmount(value(formData, "total_amount", ""));
  const paidByTravelerId = nullable(formData, "paid_by_traveler_id");
  if (!paidByTravelerId) {
    throw new Error("Who paid is required.");
  }

  const splits = parseSplits(formData, total, paidByTravelerId);
  const splitPayload = splits.map((split) => ({ traveler_id: split.travelerId, amount: split.amount }));
  const baseArgs = {
    p_expense_id: expenseId,
    p_category: categorySchema.parse(value(formData, "category")),
    p_expense_name: value(formData, "expense_name"),
    p_currency: currencySchema.parse(value(formData, "currency", "MYR")) as Currency,
    p_total_amount: total,
    p_paid_by_traveler_id: paidByTravelerId,
    p_splits: splitPayload,
  };
  const { error } = await supabase.rpc("update_expense", {
    ...baseArgs,
    p_expense_date: nullable(formData, "expense_date"),
    p_expense_time: nullable(formData, "expense_time"),
    p_notes: nullable(formData, "notes"),
  });

  if (isMissingExpenseMetadataRpc(error)) {
    const { error: legacyError } = await supabase.rpc("update_expense", legacyUpdateExpenseArgs(baseArgs));
    if (legacyError) throwSafeActionError(legacyError);
  } else if (error) {
    throwSafeActionError(error);
  }

  revalidatePath(`/trips/${tripId}/expenses`);
}

export async function softDeleteExpense(tripId: string, expenseId: string) {
  const supabase = await authedAdminClient();
  const { error } = await supabase.rpc("soft_delete_expense", { p_expense_id: expenseId });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}/expenses`);
}

export async function restoreExpense(tripId: string, expenseId: string) {
  const supabase = await authedAdminClient();
  const { error } = await supabase.rpc("restore_expense", { p_expense_id: expenseId });
  if (error) throwSafeActionError(error);
  revalidatePath(`/trips/${tripId}/expenses`);
}
