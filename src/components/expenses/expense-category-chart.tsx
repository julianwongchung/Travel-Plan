import { BedDouble, BusFront, CircleEllipsis, ShieldCheck, ShoppingBag, Utensils } from "lucide-react";
import { GlassCard, GlassCardContent } from "@/components/ui/glass-card";

type ExpenseCategoryChartProps = {
  categoryTotals: Record<string, Record<string, number>>;
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
  hotel: {
    label: "Hotel",
    color: "#2563eb",
    icon: BedDouble,
    iconClass: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  },
  insurance: {
    label: "Insurance",
    color: "#059669",
    icon: ShieldCheck,
    iconClass: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  other: {
    label: "Other",
    color: "#64748b",
    icon: CircleEllipsis,
    iconClass: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
  },
} as const;

const zeroDecimalCurrencies = new Set(["IDR", "JPY", "KRW", "VND"]);

function formatOriginalAmount(currency: string, amount: number) {
  const usesWholeUnits = zeroDecimalCurrencies.has(currency) && Number.isInteger(amount);

  return new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: usesWholeUnits ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ExpenseCategoryChart({ categoryTotals }: ExpenseCategoryChartProps) {
  const entries = Object.entries(categoryTotals)
    .map(([category, totalsByCurrency]) => {
      const style = category in categoryStyles
        ? categoryStyles[category as keyof typeof categoryStyles]
        : categoryStyles.other;
      return {
        category,
        totalsByCurrency: Object.entries(totalsByCurrency).sort(([left], [right]) => left.localeCompare(right)),
        sortTotal: Object.values(totalsByCurrency).reduce((sum, amount) => sum + amount, 0),
        ...style,
      };
    })
    .filter((entry) => entry.sortTotal > 0)
    .sort((left, right) => right.sortTotal - left.sortTotal);

  return (
    <GlassCard variant="glass" className="overflow-hidden">
      <GlassCardContent className="p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Spending analysis
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-[-0.02em]">Category totals</h2>
        </div>

        {entries.length ? (
          <div className="mt-5 grid min-w-0 gap-2">
            {entries.map((entry) => {
              const Icon = entry.icon;
              return (
                <div
                  key={entry.category}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <span className={`grid size-10 place-items-center rounded-[14px] ${entry.iconClass}`}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{entry.label}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {entry.totalsByCurrency.map(([currency, amount]) => (
                        <span key={`${entry.category}-${currency}`} className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[var(--muted)] px-3 text-xs font-semibold">
                          {currency} {formatOriginalAmount(currency, amount)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 text-sm text-[var(--muted-foreground)]">No category spending yet.</p>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
