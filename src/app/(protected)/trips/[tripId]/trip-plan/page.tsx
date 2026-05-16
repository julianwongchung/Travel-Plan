import { CalendarDays, Hotel, MapPin, Plus, Trash2 } from "lucide-react";
import { addScheduleItem, removeScheduleItem } from "@/lib/actions/trips";
import { getOverviewData, getTripContext } from "@/lib/db/queries";
import type { ScheduleItem, TripDay } from "@/lib/db/types";
import { canEdit } from "@/lib/utils/permissions";
import { summarizeByCurrency } from "@/lib/utils/expense-calculations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form-fields";

function formatDayHeading(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function daySummary(day: TripDay, items: ScheduleItem[]) {
  return [day.route, day.hotel_name, ...items.map((item) => item.title)].filter(Boolean).join(" - ") || "Add the first schedule item";
}

export default async function TripPlanPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ role }, data] = await Promise.all([getTripContext(tripId), getOverviewData(tripId)]);
  const editable = canEdit(role);
  const expenseSummary = summarizeByCurrency(data.expenses);
  const nextDay = data.days.find((day) => new Date(`${day.date}T00:00:00`) >= new Date()) ?? data.days[0];

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Trip plan</p>
        <h1 className="text-3xl font-bold">Itinerary builder</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><h2 className="font-bold">Next route</h2></CardHeader>
          <CardContent><p className="text-sm text-slate-600">{nextDay?.route ?? "No route planned yet."}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="font-bold">Hotel</h2></CardHeader>
          <CardContent><p className="text-sm text-slate-600">{nextDay?.hotel_name ?? "No hotel saved yet."}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="font-bold">Expense summary</h2></CardHeader>
          <CardContent>
            {Object.entries(expenseSummary).length ? Object.entries(expenseSummary).map(([currency, total]) => <p key={currency} className="text-sm font-semibold">{currency} {total.toFixed(2)}</p>) : <p className="text-sm text-slate-600">No expenses yet.</p>}
          </CardContent>
        </Card>
      </div>

      {!editable ? (
        <p className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm font-semibold text-slate-600">Read-only access. Mutation controls are hidden for viewers.</p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <Card>
          <CardHeader><h2 className="text-lg font-bold">Itinerary</h2></CardHeader>
          <CardContent>
            <div className="grid gap-5">
              {data.days.map((day) => {
                const items = data.scheduleItems.filter((item) => item.trip_day_id === day.id);

                return (
                  <section key={day.id} id={`day-${day.id}`} className="border-b border-[var(--border)] pb-5 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Day {day.day_number ?? "-"}</p>
                        <h3 className="mt-1 text-2xl font-bold text-slate-950">{formatDayHeading(day.date)}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-600">{daySummary(day, items)}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {day.route ? <p className="flex items-center gap-2 text-sm text-slate-600"><MapPin size={16} />{day.route}</p> : null}
                      {day.hotel_name ? (
                        <p className="flex items-center gap-2 text-sm text-slate-600">
                          <Hotel size={16} />
                          {day.hotel_link ? <a className="font-semibold text-[var(--primary)]" href={day.hotel_link}>{day.hotel_name}</a> : day.hotel_name}
                        </p>
                      ) : null}
                      {items.map((item) => (
                        <div key={item.id} className="rounded-md bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900"><strong>{item.time_block}</strong> {item.title}</p>
                            {editable ? (
                              <form action={removeScheduleItem.bind(null, tripId, item.id)}>
                                <Button type="submit" variant="ghost" className="min-h-8 px-2 text-[var(--danger)]" aria-label={`Remove ${item.title}`}>
                                  <Trash2 size={16} />
                                </Button>
                              </form>
                            ) : null}
                          </div>
                          {[item.transport, item.food, item.notes].filter(Boolean).length ? (
                            <p className="mt-2 text-sm text-slate-600">{[item.transport, item.food, item.notes].filter(Boolean).join(" - ")}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    {editable ? (
                      <details className="mt-4 rounded-md border border-dashed border-[var(--border)] bg-white p-3">
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-[var(--primary)]">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted)]"><Plus size={18} /></span>
                          Add schedule
                        </summary>
                        <form action={addScheduleItem.bind(null, tripId)} className="mt-3 grid gap-3 md:grid-cols-2">
                          <input type="hidden" name="trip_day_id" value={day.id} />
                          <Field label="Time"><Input name="time_block" placeholder="Morning" /></Field>
                          <Field label="Title"><Input name="title" required /></Field>
                          <Field label="Transport"><Input name="transport" /></Field>
                          <Field label="Food"><Input name="food" /></Field>
                          <Field label="Notes"><Textarea name="notes" className="md:col-span-2" /></Field>
                          <Button type="submit" className="md:col-span-2"><Plus size={16} /> Add schedule</Button>
                        </form>
                      </details>
                    ) : null}

                    {day.remark ? <p className="mt-3 text-sm text-slate-500">{day.remark}</p> : null}
                  </section>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <aside className="order-first xl:order-last">
          <Card className="xl:sticky xl:top-5">
            <CardHeader>
              <h2 className="flex items-center gap-2 font-bold"><CalendarDays size={18} /> Trip dates</h2>
            </CardHeader>
            <CardContent>
              <nav className="grid gap-2">
                {data.days.map((day) => {
                  const items = data.scheduleItems.filter((item) => item.trip_day_id === day.id);
                  return (
                    <a key={day.id} href={`#day-${day.id}`} className="rounded-md px-3 py-2 text-sm hover:bg-[var(--muted)]">
                      <span className="font-bold text-slate-900">Day {day.day_number ?? "-"}</span>
                      <span className="block text-slate-600">{formatDayHeading(day.date)}</span>
                      <span className="block truncate text-xs text-slate-500">{daySummary(day, items)}</span>
                    </a>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
