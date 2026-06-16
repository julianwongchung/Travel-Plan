import { ReceiptText, Trash2, UserRound } from "lucide-react";
import { AddExpenseSheet } from "@/components/expenses/add-expense-sheet";
import { ExpenseCategoryBadge } from "@/components/expenses/expense-category-badge";
import { ExpenseCategoryChart } from "@/components/expenses/expense-category-chart";
import { ExpenseTotalSummary } from "@/components/expenses/expense-total-summary";
import { softDeleteExpense } from "@/lib/actions/expenses";
import { getExpenseData, getTripContext } from "@/lib/db/queries";
import { getMyrExchangeRates } from "@/lib/exchange-rates/server";
import {
  calculateEstimatedMyrByCategory,
  calculateEstimatedMyrTotal,
  summarizeByCurrency,
} from "@/lib/utils/expense-calculations";
import { canEdit } from "@/lib/utils/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IOSListItem } from "@/components/ui/ios-list-item";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function ExpensesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ trip, role }, data, exchangeRates] = await Promise.all([
    getTripContext(tripId),
    getExpenseData(tripId),
    getMyrExchangeRates(),
  ]);
  const editable = canEdit(role);
  const byCurrency = summarizeByCurrency(data.expenses);
  const estimatedMyr = calculateEstimatedMyrTotal(
    data.expenses,
    exchangeRates.available ? exchangeRates.rates : null,
  );
  const categoryTotals = calculateEstimatedMyrByCategory(
    data.expenses,
    exchangeRates.available ? exchangeRates.rates : null,
  );
  const paidByTraveler = data.travelers.map((traveler) => ({
    traveler,
    paid: data.expenses.filter((expense) => expense.paid_by_traveler_id === traveler.id).reduce((sum, expense) => sum + Number(expense.total_amount), 0),
    share: data.splits.filter((split) => split.traveler_id === traveler.id).reduce((sum, split) => sum + Number(split.amount), 0),
  }));

  return (
    <div className="page-enter grid min-w-0 gap-6 sm:gap-7">
      <IOSPageHeader
        eyebrow="Shared spending"
        title="Expenses"
        description="Track original payments and splits with an estimated MYR trip total."
        actions={<StatusBadge status={`${data.expenses.length} expenses`} />}
      />

      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="md:col-span-2">
          <ExpenseTotalSummary
            totalsByCurrency={byCurrency}
            estimatedMyr={estimatedMyr}
            updatedAt={exchangeRates.updatedAt}
            attributionUrl={exchangeRates.attributionUrl}
          />
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
                description={`Paid ${paid.toFixed(2)} · Share ${share.toFixed(2)}`}
                trailing={<span className={share - paid > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}>{(share - paid).toFixed(2)}</span>}
              />
            )) : <p className="py-5 text-sm text-[var(--muted-foreground)]">Add travelers to see split summaries.</p>}
          </CardContent>
        </Card>
      </div>

      {editable ? (
        <div className="flex justify-end">
          <AddExpenseSheet
            tripId={tripId}
            travelers={data.travelers}
            defaultCurrency={trip.default_currency}
          />
        </div>
      ) : (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--muted)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
          Read-only access. Mutation controls are hidden for viewers.
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
                        <p className="font-bold sm:shrink-0 sm:text-right">{expense.currency}<br />{Number(expense.total_amount).toFixed(2)}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {expense.expense_date ?? expense.created_at.slice(0, 10)}
                          {expense.expense_time ? ` · ${expense.expense_time.slice(0, 5)}` : ""}
                        </span>
                        {editable ? (
                          <form action={softDeleteExpense.bind(null, tripId, expense.id)}>
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
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                      <th className="p-4">Expense</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Currency</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Paid by</th>
                      <th className="p-4">Created</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="p-4 font-semibold">{expense.expense_name}</td>
                        <td className="p-4"><ExpenseCategoryBadge category={expense.category} /></td>
                        <td className="p-4"><StatusBadge status={expense.currency} /></td>
                        <td className="p-4 font-semibold">{Number(expense.total_amount).toFixed(2)}</td>
                        <td className="p-4">{data.travelers.find((traveler) => traveler.id === expense.paid_by_traveler_id)?.name ?? "-"}</td>
                        <td className="p-4">
                          {expense.expense_date ?? expense.created_at.slice(0, 10)}
                          {expense.expense_time ? ` ${expense.expense_time.slice(0, 5)}` : ""}
                        </td>
                        <td className="p-4">
                          {editable ? (
                            <form action={softDeleteExpense.bind(null, tripId, expense.id)}>
                              <Button variant="ghost" type="submit" className="text-[var(--danger)]"><Trash2 size={16} />Delete</Button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    ))}
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
