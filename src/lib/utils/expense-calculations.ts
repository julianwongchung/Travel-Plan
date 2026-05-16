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
