import { BusFront, CircleEllipsis, ShoppingBag, Utensils } from "lucide-react";
import { GlassCard, GlassCardContent } from "@/components/ui/glass-card";

type ExpenseCategoryChartProps = {
  categoryTotals: Record<string, number> | null;
};

const categoryStyles = {
  food: {
    label: "Food",
    color: "#f97316",
    icon: Utensils,
    iconClass: "bg-orange-500/12 text-orange-600 dark:text-orange-300",
  },
  transport: {
    label: "Transport",
    color: "#0891b2",
    icon: BusFront,
    iconClass: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
  },
  purchase: {
    label: "Purchase",
    color: "#7c3aed",
    icon: ShoppingBag,
    iconClass: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  other: {
    label: "Other",
    color: "#64748b",
    icon: CircleEllipsis,
    iconClass: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
  },
} as const;

function formatMyr(amount: number) {
  return `RM ${new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function ExpenseCategoryChart({ categoryTotals }: ExpenseCategoryChartProps) {
  const total = categoryTotals
    ? Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0)
    : 0;
  const entries = Object.entries(categoryTotals ?? {})
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => {
      const style = category in categoryStyles
        ? categoryStyles[category as keyof typeof categoryStyles]
        : categoryStyles.other;
      return {
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        ...style,
      };
    })
    .sort((left, right) => right.amount - left.amount);

  const stops = entries.map((entry, index) => {
    const start = entries
      .slice(0, index)
      .reduce((sum, previousEntry) => sum + previousEntry.percentage, 0);
    const end = start + entry.percentage;
    return `${entry.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });
  const chartLabel = entries.length
    ? `Expense category breakdown: ${entries.map((entry) => `${entry.label} ${entry.percentage.toFixed(1)} percent`).join(", ")}`
    : "Expense category breakdown: no spending";

  return (
    <GlassCard variant="glass" className="overflow-hidden">
      <GlassCardContent className="p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Spending analysis
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-[-0.02em]">Category breakdown</h2>
        </div>

        {categoryTotals === null ? (
          <p className="mt-5 rounded-[18px] bg-[var(--warning-soft)] p-4 text-sm font-semibold text-[var(--warning)]">
            Category chart unavailable until all exchange rates are available.
          </p>
        ) : entries.length ? (
          <div className="mt-6 grid min-w-0 gap-7 lg:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1.15fr)] lg:items-center">
            <div className="grid place-items-center">
              <div
                role="img"
                aria-label={chartLabel}
                className="relative grid aspect-square w-full max-w-64 place-items-center rounded-full shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                style={{ background: `conic-gradient(${stops.join(", ")})` }}
              >
                <div className="grid size-[58%] place-items-center rounded-full border border-[var(--border)] bg-[var(--card-strong)] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]">
                  <div>
                    <p className="text-xs font-semibold text-[var(--muted-foreground)]">Estimated total</p>
                    <p className="mt-1 text-xl font-black tracking-[-0.035em] sm:text-2xl">{formatMyr(total)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-w-0 gap-2">
              {entries.map((entry) => {
                const Icon = entry.icon;
                return (
                  <div
                    key={entry.category}
                    className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border)] py-3 last:border-b-0"
                  >
                    <span className={`grid size-10 place-items-center rounded-[14px] ${entry.iconClass}`}>
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-bold">{entry.label}</p>
                        <p className="shrink-0 text-xs font-semibold text-[var(--muted-foreground)]">
                          {entry.percentage.toFixed(1)}%
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${entry.percentage}%`, backgroundColor: entry.color }}
                        />
                      </div>
                    </div>
                    <p className="text-right text-sm font-bold tabular-nums">{formatMyr(entry.amount)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm text-[var(--muted-foreground)]">No category spending yet.</p>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
