import { Plus, ReceiptText, Trash2, UserRound, WalletCards } from "lucide-react";
import { createExpense, softDeleteExpense } from "@/lib/actions/expenses";
import { getExpenseData, getTripContext } from "@/lib/db/queries";
import { canEdit } from "@/lib/utils/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-fields";
import { IOSListItem } from "@/components/ui/ios-list-item";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function ExpensesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ role }, data] = await Promise.all([getTripContext(tripId), getExpenseData(tripId)]);
  const editable = canEdit(role);
  const byCurrency = data.expenses.reduce<Record<string, number>>((summary, expense) => {
    summary[expense.currency] = (summary[expense.currency] ?? 0) + Number(expense.total_amount);
    return summary;
  }, {});
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
        description="Track payments and splits by traveler without converting currencies."
        actions={<StatusBadge status={`${data.expenses.length} expenses`} />}
      />

      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader><h2 className="flex items-center gap-2 font-bold"><WalletCards size={18} /> Total by currency</h2></CardHeader>
          <CardContent className="grid gap-3">
            {Object.entries(byCurrency).length ? Object.entries(byCurrency).map(([currency, total]) => (
              <div key={currency} className="flex items-end justify-between gap-3">
                <StatusBadge status={currency} />
                <p className="text-2xl font-bold tracking-[-0.03em]">{total.toFixed(2)}</p>
              </div>
            )) : <p className="text-sm text-[var(--muted-foreground)]">No expenses yet.</p>}
          </CardContent>
        </Card>
        <Card>
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
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-3 text-lg font-bold tracking-[-0.02em]">
              <span className="grid size-9 place-items-center rounded-[13px] bg-[var(--primary-soft)] text-[var(--primary)]"><Plus size={18} /></span>
              Add expense
            </h2>
          </CardHeader>
          <CardContent>
            <form action={createExpense.bind(null, tripId)} className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Expense name" className="sm:col-span-2 lg:col-span-1"><Input name="expense_name" required placeholder="Dinner" /></Field>
              <Field label="Category"><Input name="category" placeholder="Food" /></Field>
              <Field label="Currency">
                <Select name="currency" defaultValue="MYR">
                  {["MYR", "SGD", "USD", "VND", "THB", "IDR", "PHP", "JPY", "KRW", "TWD", "HKD"].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </Select>
              </Field>
              <Field label="Total amount"><Input name="total_amount" type="number" min="0" step="0.01" required /></Field>
              <Field label="Paid by">
                <Select name="paid_by_traveler_id" defaultValue="">
                  <option value="">Not set</option>
                  {data.travelers.map((traveler) => <option key={traveler.id} value={traveler.id}>{traveler.name}</option>)}
                </Select>
              </Field>
              <div className="grid min-w-0 gap-2 sm:col-span-2 lg:col-span-3">
                <p className="text-sm font-bold">Split travelers</p>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  {data.travelers.map((traveler) => (
                    <label key={traveler.id} className="min-w-0 rounded-[18px] border border-[var(--border)] bg-[var(--muted)] p-4 text-sm">
                      <span className="flex min-h-8 items-center gap-3 font-semibold">
                        <input name="traveler_ids" type="checkbox" value={traveler.id} defaultChecked className="size-5 accent-[var(--primary)]" />
                        {traveler.name}
                      </span>
                      <Input className="mt-2 bg-[var(--card-strong)]" name={`split_${traveler.id}`} type="number" min="0" step="0.01" placeholder="Custom amount optional" />
                    </label>
                  ))}
                </div>
              </div>
              <Button className="w-full sm:col-span-2 sm:w-auto sm:justify-self-start lg:col-span-3" type="submit" disabled={!data.travelers.length}>
                <Plus size={17} />
                Add expense
              </Button>
            </form>
          </CardContent>
        </Card>
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
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{expense.category || "Uncategorized"} · Paid by {paidBy}</p>
                        </div>
                        <p className="font-bold sm:shrink-0 sm:text-right">{expense.currency}<br />{Number(expense.total_amount).toFixed(2)}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-[var(--muted-foreground)]">{expense.created_at.slice(0, 10)}</span>
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
                        <td className="p-4">{expense.category || "-"}</td>
                        <td className="p-4"><StatusBadge status={expense.currency} /></td>
                        <td className="p-4 font-semibold">{Number(expense.total_amount).toFixed(2)}</td>
                        <td className="p-4">{data.travelers.find((traveler) => traveler.id === expense.paid_by_traveler_id)?.name ?? "-"}</td>
                        <td className="p-4">{expense.created_at.slice(0, 10)}</td>
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
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Add the first shared cost above.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
