export type SplitInput = {
  travelerId: string;
  amount: number;
};

export function calculateEqualSplits(total: number, travelerIds: string[]): SplitInput[] {
  if (travelerIds.length === 0) return [];

  const cents = Math.round(total * 100);
  const base = Math.floor(cents / travelerIds.length);
  const remainder = cents - base * travelerIds.length;

  return travelerIds.map((travelerId, index) => ({
    travelerId,
    amount: (base + (index === travelerIds.length - 1 ? remainder : 0)) / 100,
  }));
}

export function validateCustomSplits(total: number, splits: SplitInput[]) {
  const totalCents = Math.round(total * 100);
  const splitCents = splits.reduce((sum, split) => sum + Math.round(split.amount * 100), 0);
  return totalCents === splitCents;
}

export function summarizeByCurrency<T extends { currency: string; total_amount: number }>(expenses: T[]) {
  return expenses.reduce<Record<string, number>>((summary, expense) => {
    summary[expense.currency] = (summary[expense.currency] ?? 0) + Number(expense.total_amount);
    return summary;
  }, {});
}

export function calculateEstimatedMyrTotal<T extends { currency: string; total_amount: number }>(
  expenses: T[],
  rates: Readonly<Record<string, number>> | null,
) {
  let totalMyr = 0;

  for (const expense of expenses) {
    const amount = Number(expense.total_amount);
    const rate = expense.currency === "MYR" ? 1 : rates?.[expense.currency];

    if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate === undefined || rate <= 0) {
      return null;
    }

    totalMyr += amount / rate;
  }

  return Math.round((totalMyr + Number.EPSILON) * 100) / 100;
}

function normalizedExpenseCategory(category: string | null | undefined) {
  const normalized = category?.trim().toLowerCase();
  return normalized === "food" || normalized === "transport" || normalized === "purchase"
    ? normalized
    : "other";
}

export function calculateEstimatedMyrByCategory<
  T extends { category?: string | null; currency: string; total_amount: number },
>(
  expenses: T[],
  rates: Readonly<Record<string, number>> | null,
) {
  const categoryTotals: Record<string, number> = {};

  for (const expense of expenses) {
    const amount = Number(expense.total_amount);
    const rate = expense.currency === "MYR" ? 1 : rates?.[expense.currency];

    if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate === undefined || rate <= 0) {
      return null;
    }

    const category = normalizedExpenseCategory(expense.category);
    categoryTotals[category] = (categoryTotals[category] ?? 0) + amount / rate;
  }

  return Object.fromEntries(
    Object.entries(categoryTotals).map(([category, total]) => [
      category,
      Math.round((total + Number.EPSILON) * 100) / 100,
    ]),
  );
}
