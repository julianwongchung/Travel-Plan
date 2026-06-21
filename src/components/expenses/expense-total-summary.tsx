import { CircleDollarSign } from "lucide-react";
import { GlassCard, GlassCardContent } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";

type ExpenseTotalSummaryProps = {
  totalsByCurrency: Record<string, number>;
};

const zeroDecimalCurrencies = new Set(["IDR", "JPY", "KRW", "VND"]);

function formatOriginalAmount(currency: string, amount: number) {
  const usesWholeUnits = zeroDecimalCurrencies.has(currency) && Number.isInteger(amount);

  return new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: usesWholeUnits ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ExpenseTotalSummary({
  totalsByCurrency,
}: ExpenseTotalSummaryProps) {
  const originalTotals = Object.entries(totalsByCurrency).sort(([left], [right]) => left.localeCompare(right));

  return (
    <GlassCard variant="glass" className="overflow-hidden">
      <GlassCardContent className="p-5 sm:p-6">
        <section className="rounded-[22px] border border-[rgba(8,120,249,0.18)] bg-[linear-gradient(145deg,var(--primary-soft),transparent_72%)] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-[16px] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_10px_28px_rgba(8,120,249,0.24)]">
              <CircleDollarSign size={22} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Total Expenses</p>
              <h2 className="mt-1 text-lg font-bold tracking-[-0.02em]">Original currency totals</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {originalTotals.length ? originalTotals.map(([currency, total]) => (
              <div key={currency} className="flex min-h-12 items-center justify-between gap-4 rounded-[18px] bg-[var(--card-strong)] px-4">
                <StatusBadge status={currency} />
                <p className="text-right text-lg font-bold tracking-[-0.025em]">
                  {formatOriginalAmount(currency, total)}
                </p>
              </div>
            )) : (
              <p className="text-sm text-[var(--muted-foreground)]">No expenses yet.</p>
            )}
          </div>
        </section>
      </GlassCardContent>
    </GlassCard>
  );
}
