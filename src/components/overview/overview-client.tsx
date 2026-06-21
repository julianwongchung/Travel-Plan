"use client";

import { CalendarDays, MapPin, UsersRound, WalletCards } from "lucide-react";
import { useTripOverview, type TripOverviewData } from "@/lib/db/client-queries";
import type { Trip } from "@/lib/db/types";
import { formatDisplayDate } from "@/lib/utils/date-format";
import { summarizeByCurrency } from "@/lib/utils/expense-calculations";
import { normalizeLegacyHotels, normalizePlanLogistics } from "@/lib/utils/trip-logistics";
import { generatedTripDayId, normalizeTripDaysForRange } from "@/lib/utils/trip-days";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { QueryStatusBanner } from "@/components/ui/query-status-banner";
import { OverviewDayTabs } from "@/components/overview/overview-day-tabs";
import { TripLogisticsSummary } from "@/components/overview/trip-logistics-summary";

function shortDate(date: string | null) {
  return date ? formatDisplayDate(date) : null;
}

function formatMoney(amount: number) {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function TripSummaryCards({
  travelerNames,
  expenseTotals,
}: {
  travelerNames: string[];
  expenseTotals: Record<string, number>;
}) {
  const visibleTravelers = travelerNames.slice(0, 4);
  const remainingTravelerCount = Math.max(0, travelerNames.length - visibleTravelers.length);
  const expenseEntries = Object.entries(expenseTotals);

  return (
    <section aria-label="Trip summary" className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-[18px] border border-slate-100 bg-white/88 p-4 shadow-sm dark:border-white/10 dark:bg-[var(--card-strong)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)]">
          <UsersRound size={16} />
          Travelers
        </div>
        <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">{travelerNames.length}</p>
        <p className="mt-1 min-h-5 break-words text-sm font-medium text-[var(--muted-foreground)]">
          {visibleTravelers.length ? visibleTravelers.join(", ") : "No travelers added yet"}
          {remainingTravelerCount ? ` + ${remainingTravelerCount} more` : ""}
        </p>
      </article>

      <article className="rounded-[18px] border border-slate-100 bg-white/88 p-4 shadow-sm dark:border-white/10 dark:bg-[var(--card-strong)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)]">
          <WalletCards size={16} />
          Expenses
        </div>
        {expenseEntries.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {expenseEntries.map(([currency, total]) => (
              <span key={currency} className="rounded-full bg-[var(--muted)] px-3 py-1 text-sm font-bold">
                {currency} {formatMoney(total)}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm font-medium text-[var(--muted-foreground)]">No expenses added yet</p>
        )}
      </article>
    </section>
  );
}

export function OverviewClient({
  trip,
  initialData,
}: {
  trip: Trip;
  initialData: TripOverviewData;
}) {
  const overviewQuery = useTripOverview(trip.id, initialData);
  const { data } = overviewQuery;
  const currentDays = normalizeTripDaysForRange(
    data.days,
    trip.start_date,
    trip.end_date,
    (date, dayNumber) => ({
      id: generatedTripDayId(date),
      trip_id: trip.id,
      date,
      day_number: dayNumber,
      route: null,
      hotel_name: null,
      hotel_link: null,
      remark: null,
      created_at: "",
      updated_at: null,
    }),
  );
  const planLogistics = normalizePlanLogistics(currentDays, data.scheduleItems);
  const dateRange = [shortDate(trip.start_date), shortDate(trip.end_date)].filter(Boolean).join(" - ") || "Dates not set";
  const destination = data.places[0]?.area ?? data.days[0]?.route ?? "Destination not set";
  const travelerNames = data.travelers.map((traveler) => traveler.name);
  const expenseTotals = summarizeByCurrency(data.expenses);

  return (
    <div className="grid min-w-0 gap-6 sm:gap-7">
      <IOSPageHeader
        title={trip.name}
        description={(
          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
            <span className="inline-flex min-w-0 items-center gap-2"><CalendarDays size={16} />{dateRange}</span>
            <span className="inline-flex min-w-0 items-center gap-2"><MapPin size={16} />{destination}</span>
          </div>
        )}
      />

      <QueryStatusBanner
        isError={overviewQuery.isError}
        isFetching={overviewQuery.isFetching}
        onRetry={() => {
          void overviewQuery.refetch();
        }}
      />

      <TripSummaryCards travelerNames={travelerNames} expenseTotals={expenseTotals} />

      <TripLogisticsSummary
        tripId={trip.id}
        hotels={data.hotels}
        legacyHotels={normalizeLegacyHotels(data.places)}
        planHotels={planLogistics.hotels}
        flights={data.flights}
        planFlights={planLogistics.flights}
      />

      <OverviewDayTabs days={currentDays} scheduleItems={data.scheduleItems} />
    </div>
  );
}
