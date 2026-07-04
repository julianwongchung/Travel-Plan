"use client";

import { useMemo, type FormEvent } from "react";
import { ReceiptText, Trash2, UserRound } from "lucide-react";
import { AddExpenseSheet } from "@/components/expenses/add-expense-sheet";
import { ExpenseCategoryBadge } from "@/components/expenses/expense-category-badge";
import { ExpenseCategoryChart } from "@/components/expenses/expense-category-chart";
import { ExpenseTotalSummary } from "@/components/expenses/expense-total-summary";
import { softDeleteExpense } from "@/lib/actions/expenses";
import { useTripExpenses, type TripExpenseData } from "@/lib/db/client-queries";
import type { Trip } from "@/lib/db/types";
import {
  calculateEstimatedMyr,
  estimateAmountInMyr,
  summarizeByCategoryCurrency,
  summarizeByCurrency,
} from "@/lib/utils/expense-calculations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IOSListItem } from "@/components/ui/ios-list-item";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { QueryStatusBanner } from "@/components/ui/query-status-banner";
import { StatusBadge } from "@/components/ui/status-badge";

function confirmDeleteExpense(event: FormEvent<HTMLFormElement>) {
  if (!window.confirm("Delete this expense? You can restore it later if needed.")) {
    event.preventDefault();
  }
}

function formatEstimatedMyr(amount: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ExpensesClient({
  trip,
  tripId,
  canAddExpense,
  canManageExpenses,
  initialData,
}: {
  trip: Trip;
  tripId: string;
  canAddExpense: boolean;
  canManageExpenses: boolean;
  initialData: TripExpenseData;
}) {
  const expensesQuery = useTripExpenses(tripId, initialData);
  const { data } = expensesQuery;
  const byCurrency = useMemo(() => summarizeByCurrency(data.expenses), [data.expenses]);
  const estimatedMyrTotal = useMemo(() => calculateEstimatedMyr(data.expenses), [data.expenses]);
  const categoryTotals = useMemo(() => summarizeByCategoryCurrency(data.expenses), [data.expenses]);
  const paidByTraveler = useMemo(() => data.travelers.map((traveler) => ({
    traveler,
    paid: data.expenses.filter((expense) => expense.paid_by_traveler_id === traveler.id).reduce((sum, expense) => sum + Number(expense.total_amount), 0),
    share: data.splits.filter((split) => split.traveler_id === traveler.id).reduce((sum, split) => sum + Number(split.amount), 0),
  })), [data.expenses, data.splits, data.travelers]);

  return (
    <div className="page-enter grid min-w-0 gap-6 sm:gap-7">
      <IOSPageHeader
        eyebrow="Shared spending"
        title="Expenses"
        description="Track original payments and traveler splits by recorded currency."
        actions={<StatusBadge status={`${data.expenses.length} expenses`} />}
      />

      <QueryStatusBanner
        isError={expensesQuery.isError}
        isFetching={expensesQuery.isFetching}
        onRetry={() => {
          void expensesQuery.refetch();
        }}
      />

      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="md:col-span-2">
          <ExpenseTotalSummary estimatedMyrTotal={estimatedMyrTotal} totalsByCurrency={byCurrency} />
        </div>
        <div className="md:col-span-2">
          <ExpenseCategoryChart categoryTotals={categoryTotals} />
        </div>
        <Card className="md:col-span-2">
          <CardHeader><h2 className="flex items-center gap-2 font-bold"><UserRound size={18} /> Traveler summary</h2></CardHeader>
          <CardContent className="px-5 py-0">
            {paidByTraveler.length ? paidByTraveler.map(({ traveler, paid, share }) => (
              <IOSListItem
                key={traveler.id}
                icon={<UserRound size={18} />}
                title={traveler.name}
                description={`Paid ${paid.toFixed(2)} - Share ${share.toFixed(2)}`}
                trailing={<span className={share - paid > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}>{(share - paid).toFixed(2)}</span>}
              />
            )) : <p className="py-5 text-sm text-[var(--muted-foreground)]">Add travelers to see split summaries.</p>}
          </CardContent>
        </Card>
      </div>

      {canAddExpense ? (
        <div className="flex justify-end">
          <AddExpenseSheet
            tripId={tripId}
            travelers={data.travelers}
            defaultCurrency={trip.default_currency}
          />
        </div>
      ) : (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--muted)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
          Expense creation is unavailable for this trip.
        </div>
      )}

      <Card>
        <CardHeader><h2 className="flex items-center gap-2 text-lg font-bold"><ReceiptText size={19} /> Expense history</h2></CardHeader>
        <CardContent className="p-0">
          {data.expenses.length ? (
            <>
              <div className="divide-y divide-[var(--border)] lg:hidden">
                {data.expenses.map((expense) => {
                  const paidBy = data.travelers.find((traveler) => traveler.id === expense.paid_by_traveler_id)?.name ?? "Not set";
                  const estimatedMyr = estimateAmountInMyr(expense.currency, Number(expense.total_amount));
                  return (
                    <article key={expense.id} className="min-w-0 p-4 sm:p-5">
                      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                        <div className="min-w-0">
                          <h3 className="break-words font-bold">{expense.expense_name}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <ExpenseCategoryBadge category={expense.category} />
                            <span className="text-sm text-[var(--muted-foreground)]">Paid by {paidBy}</span>
                          </div>
                          {expense.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted-foreground)]">{expense.notes}</p> : null}
                        </div>
                        <div className="sm:shrink-0 sm:text-right">
                          <p className="font-bold">{expense.currency}<br />{Number(expense.total_amount).toFixed(2)}</p>
                          {estimatedMyr !== null ? (
                            <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
                              est. {formatEstimatedMyr(estimatedMyr)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {expense.expense_date ?? expense.created_at.slice(0, 10)}
                          {expense.expense_time ? ` - ${expense.expense_time.slice(0, 5)}` : ""}
                        </span>
                        {canManageExpenses ? (
                          <form action={softDeleteExpense.bind(null, tripId, expense.id)} onSubmit={confirmDeleteExpense}>
                            <Button variant="ghost" type="submit" className="text-[var(--danger)]">
                              <Trash2 size={16} />
                              Delete
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden max-w-full overflow-x-auto lg:block">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <th className="p-4">Expense</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Currency</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Est. MYR</th>
                      <th className="p-4">Paid by</th>
                      <th className="p-4">Created</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.map((expense) => {
                      const estimatedMyr = estimateAmountInMyr(expense.currency, Number(expense.total_amount));
                      return (
                        <tr key={expense.id} className="border-b border-[var(--border)] last:border-b-0">
                          <td className="p-4 font-semibold">{expense.expense_name}</td>
                          <td className="p-4"><ExpenseCategoryBadge category={expense.category} /></td>
                          <td className="p-4"><StatusBadge status={expense.currency} /></td>
                          <td className="p-4 font-semibold">{Number(expense.total_amount).toFixed(2)}</td>
                          <td className="p-4 font-semibold">
                            {estimatedMyr !== null ? formatEstimatedMyr(estimatedMyr) : "-"}
                          </td>
                          <td className="p-4">{data.travelers.find((traveler) => traveler.id === expense.paid_by_traveler_id)?.name ?? "-"}</td>
                          <td className="p-4">
                            {expense.expense_date ?? expense.created_at.slice(0, 10)}
                            {expense.expense_time ? ` ${expense.expense_time.slice(0, 5)}` : ""}
                          </td>
                          <td className="p-4">
                            {canManageExpenses ? (
                              <form action={softDeleteExpense.bind(null, tripId, expense.id)} onSubmit={confirmDeleteExpense}>
                                <Button variant="ghost" type="submit" className="text-[var(--danger)]"><Trash2 size={16} />Delete</Button>
                              </form>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="grid min-h-44 place-items-center p-5 text-center">
              <div>
                <ReceiptText className="mx-auto text-[var(--primary)]" size={26} />
                <h3 className="mt-3 font-bold">No expenses yet</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Use + Add to record the first shared cost.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
