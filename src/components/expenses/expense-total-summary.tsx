import { CircleDollarSign, Clock3, TriangleAlert } from "lucide-react";
import { GlassCard, GlassCardContent } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";

type ExpenseTotalSummaryProps = {
  totalsByCurrency: Record<string, number>;
  estimatedMyr: number | null;
  updatedAt: string | null;
  attributionUrl: string;
};

const zeroDecimalCurrencies = new Set(["IDR", "JPY", "KRW", "VND"]);

function formatOriginalAmount(currency: string, amount: number) {
  const usesWholeUnits = zeroDecimalCurrencies.has(currency) && Number.isInteger(amount);

  return new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: usesWholeUnits ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatMyrAmount(amount: number) {
  return `RM ${new Intl.NumberFormat("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function formatRateUpdateTime(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
}

export function ExpenseTotalSummary({
  totalsByCurrency,
  estimatedMyr,
  updatedAt,
  attributionUrl,
}: ExpenseTotalSummaryProps) {
  const originalTotals = Object.entries(totalsByCurrency).sort(([left], [right]) => left.localeCompare(right));
  const formattedUpdateTime = formatRateUpdateTime(updatedAt);

  return (
    <GlassCard variant="glass" className="overflow-hidden">
      <GlassCardContent className="grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-stretch">
        <section className="rounded-[22px] border border-[rgba(8,120,249,0.18)] bg-[linear-gradient(145deg,var(--primary-soft),transparent_72%)] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-[16px] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_10px_28px_rgba(8,120,249,0.24)]">
              <CircleDollarSign size={22} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Total Expenses</p>
              <h2 className="mt-1 text-lg font-bold tracking-[-0.02em]">Estimated in MYR</h2>
            </div>
          </div>

          <div className="mt-6" aria-live="polite">
            {estimatedMyr === null ? (
              <div className="rounded-[18px] border border-[rgba(199,123,10,0.22)] bg-[var(--warning-soft)] p-4 text-[var(--warning)]">
                <p className="flex items-start gap-2 text-sm font-bold">
                  <TriangleAlert className="mt-0.5" size={18} />
                  <span>MYR estimate unavailable. Please check exchange rate.</span>
                </p>
              </div>
            ) : (
              <p className="text-[clamp(2rem,8vw,3.4rem)] font-black tracking-[-0.055em] text-[var(--foreground)]">
                {formatMyrAmount(estimatedMyr)}
              </p>
            )}
          </div>

          {formattedUpdateTime ? (
            <p className="mt-4 flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
              <Clock3 size={14} />
              Rates updated {formattedUpdateTime}
            </p>
          ) : null}

          <a
            className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-[var(--primary)] underline decoration-[rgba(8,120,249,0.35)] underline-offset-4"
            href={attributionUrl}
            target="_blank"
            rel="noreferrer"
          >
            Rates by Exchange Rate API
          </a>
        </section>

        <section className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <h3 className="text-sm font-bold">Original totals</h3>
          <div className="mt-4 grid gap-3">
            {originalTotals.length ? originalTotals.map(([currency, total]) => (
              <div key={currency} className="flex min-h-11 items-center justify-between gap-4">
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
