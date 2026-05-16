import { createExpense, softDeleteExpense } from "@/lib/actions/expenses";
import { getExpenseData, getTripContext } from "@/lib/db/queries";
import { canEdit } from "@/lib/utils/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-fields";

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
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><h2 className="font-bold">Total by currency</h2></CardHeader>
          <CardContent>{Object.entries(byCurrency).map(([currency, total]) => <p key={currency} className="font-semibold">{currency} {total.toFixed(2)}</p>)}</CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><h2 className="font-bold">Traveler summary</h2></CardHeader>
          <CardContent className="grid gap-2">
            {paidByTraveler.map(({ traveler, paid, share }) => (
              <p key={traveler.id} className="text-sm">
                <strong>{traveler.name}</strong>: paid {paid.toFixed(2)}, share {share.toFixed(2)}, outstanding {(share - paid).toFixed(2)}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      {editable ? (
        <Card>
          <CardHeader><h1 className="text-lg font-bold">Add expense</h1></CardHeader>
          <CardContent>
            <form action={createExpense.bind(null, tripId)} className="grid gap-3 md:grid-cols-3">
              <Field label="Expense name"><Input name="expense_name" required /></Field>
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
              <div className="md:col-span-3 grid gap-2">
                <p className="text-sm font-bold">Split travelers</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {data.travelers.map((traveler) => (
                    <label key={traveler.id} className="grid gap-1 rounded-md border border-[var(--border)] p-3 text-sm">
                      <span className="flex items-center gap-2 font-semibold">
                        <input name="traveler_ids" type="checkbox" value={traveler.id} defaultChecked />
                        {traveler.name}
                      </span>
                      <Input name={`split_${traveler.id}`} type="number" min="0" step="0.01" placeholder="Custom amount optional" />
                    </label>
                  ))}
                </div>
              </div>
              <Button className="md:col-span-3" type="submit" disabled={!data.travelers.length}>Add expense</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm font-semibold text-slate-600">Read-only access. Mutation controls are hidden for viewers.</p>
      )}

      <Card>
        <CardHeader><h2 className="text-lg font-bold">Expenses</h2></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase text-slate-500">
                  <th className="p-3">Expense</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Currency</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Paid by</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-[var(--border)]">
                    <td className="p-3 font-semibold">{expense.expense_name}</td>
                    <td className="p-3">{expense.category}</td>
                    <td className="p-3">{expense.currency}</td>
                    <td className="p-3">{Number(expense.total_amount).toFixed(2)}</td>
                    <td className="p-3">{data.travelers.find((traveler) => traveler.id === expense.paid_by_traveler_id)?.name ?? "-"}</td>
                    <td className="p-3">{expense.created_at.slice(0, 10)}</td>
                    <td className="p-3">
                      {editable ? (
                        <form action={softDeleteExpense.bind(null, tripId, expense.id)}>
                          <Button variant="secondary" type="submit">Delete</Button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
