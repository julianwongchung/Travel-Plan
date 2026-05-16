import Link from "next/link";
import { Archive, Bed, CalendarDays, Edit2, Map, MapPin, Plane, PlusCircle, Ticket, Users, Utensils } from "lucide-react";
import { inviteTripMember } from "@/lib/actions/invitations";
import { archiveTrip, completeTrip } from "@/lib/actions/trips";
import { getOverviewData, getTripContext, getTripMembers } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-fields";

function shortDate(date: string | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function dayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function itemKind(item: { title: string; transport: string | null; food: string | null }) {
  const text = `${item.title} ${item.transport ?? ""} ${item.food ?? ""}`.toLowerCase();
  if (text.includes("flight") || text.includes("airport")) return { label: "Flight", className: "bg-blue-600 text-white", icon: Plane };
  if (text.includes("hotel") || text.includes("check-in") || text.includes("lodging")) return { label: "Lodging", className: "bg-violet-600 text-white", icon: Bed };
  if (item.food || text.includes("dinner") || text.includes("lunch") || text.includes("breakfast")) return { label: "Activity", className: "bg-emerald-600 text-white", icon: Utensils };
  return { label: "Activity", className: "bg-emerald-600 text-white", icon: Ticket };
}

export default async function OverviewPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ trip, role }, memberData, data] = await Promise.all([getTripContext(tripId), getTripMembers(tripId), getOverviewData(tripId)]);
  const isOwner = role === "owner";
  const sortedDays = [...data.days].sort((a, b) => a.date.localeCompare(b.date));
  const firstDay = sortedDays[0];
  const nextHotel = sortedDays.find((day) => day.hotel_name)?.hotel_name ?? "Add base hotel in Trip Plan";
  const destination = firstDay?.route ?? data.places[0]?.area ?? "Destination not set";
  const dateRange = [shortDate(trip.start_date), shortDate(trip.end_date)].filter(Boolean).join(" - ") || "Dates not set";

  return (
    <div className="-mx-4 -my-5 min-h-screen bg-white lg:-mx-8">
      <section className="border-b border-slate-200 px-6 py-8 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">{trip.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-base text-slate-700">
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={18} />
                {dateRange}
              </span>
              <span className="text-slate-300">/</span>
              <span className="inline-flex items-center gap-2">
                <MapPin size={18} />
                {destination}
              </span>
            </div>
          </div>

          {isOwner ? (
            <div className="flex flex-wrap items-center gap-3">
              <a href="#invite-member" className="inline-flex min-h-12 items-center gap-2 border border-slate-300 bg-white px-5 text-sm font-semibold shadow-sm transition hover:bg-slate-50">
                <Users size={18} />
                Invite Member
              </a>
              <form action={archiveTrip.bind(null, trip.id)}>
                <Button variant="ghost" type="submit" className="min-h-12 px-5">
                  <Archive size={17} />
                  Archive
                </Button>
              </form>
              <form action={completeTrip.bind(null, trip.id)}>
                <Button type="submit" className="min-h-12 bg-red-700 px-6 hover:bg-red-800">
                  Complete Trip
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-8 px-6 py-9 lg:grid-cols-[390px_1fr] lg:px-10">
        <aside className="grid content-start gap-7">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Logistics Overview</h2>
            <div className="mt-4 h-px bg-slate-200" />
          </div>

          <Card className="rounded-md border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-blue-600">
                <Plane size={24} />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">Inbound Flight</p>
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-950">{firstDay?.route ?? "Arrival route not set"}</h3>
              <p className="mt-2 text-sm text-slate-700">{firstDay ? `${dayDate(firstDay.date)} arrival plan` : "Add the first trip day to populate this card."}</p>
              <div className="mt-5 border-t border-slate-200 pt-4">
                <Link href={`/trips/${tripId}/trip-plan`} className="text-sm font-semibold text-red-700">
                  Edit Arrival
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-violet-600">
                <Bed size={24} />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">Base Camp</p>
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-950">{nextHotel}</h3>
              <p className="mt-2 text-sm text-slate-700">{dateRange}</p>
              <div className="mt-5 border-t border-slate-200 pt-4">
                <Link href={`/trips/${tripId}/trip-plan`} className="text-sm font-semibold text-red-700">
                  Details
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid min-h-72 place-items-center overflow-hidden rounded-md border border-slate-200 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(20,184,166,0.1)),repeating-linear-gradient(90deg,rgba(148,163,184,0.22)_0_1px,transparent_1px_22px),repeating-linear-gradient(0deg,rgba(148,163,184,0.18)_0_1px,transparent_1px_22px)]">
            <Link href={`/trips/${tripId}/places`} className="inline-flex min-h-12 items-center gap-3 border border-slate-300 bg-white px-5 text-sm font-semibold shadow-sm">
              <Map size={18} />
              Explore Map View
            </Link>
          </div>

          {isOwner ? (
            <Card id="invite-member" className="rounded-md border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold">Invite Member</h2>
                <p className="mt-1 text-sm text-slate-500">{memberData.members.length} member(s), {memberData.invitations.length} pending invitation(s)</p>
                <form action={inviteTripMember.bind(null, trip.id)} className="mt-4 grid gap-3">
                  <Field label="Email">
                    <Input name="email" type="email" required placeholder="friend@example.com" />
                  </Field>
                  <Field label="Role">
                    <Select name="role" defaultValue="viewer">
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </Select>
                  </Field>
                  <Button type="submit">Send Invite</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </aside>

        <main className="grid content-start gap-10">
          {sortedDays.length ? (
            sortedDays.map((day, dayIndex) => {
              const items = data.scheduleItems.filter((item) => item.trip_day_id === day.id);
              return (
                <section key={day.id} className="grid gap-5">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-950">Day {day.day_number ?? dayIndex + 1}: {day.route ?? "Untitled Route"}</h2>
                      <p className="mt-1 text-sm text-slate-600">{dayDate(day.date)} / {items.length} Planned Item{items.length === 1 ? "" : "s"}</p>
                    </div>
                    <Link href={`/trips/${tripId}/trip-plan`} aria-label="Edit day" className="rounded-md p-2 text-slate-600 hover:bg-slate-100">...</Link>
                  </div>

                  <div className="relative grid gap-3 pl-8 before:absolute before:bottom-4 before:left-3 before:top-4 before:w-px before:bg-slate-200">
                    {items.length ? (
                      items.map((item, itemIndex) => {
                        const kind = itemKind(item);
                        const Icon = kind.icon;
                        return (
                          <article key={item.id} className="relative grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[100px_1fr_auto_32px]">
                            <span className={`absolute -left-[27px] top-6 size-4 rounded-full ${itemIndex % 3 === 0 ? "bg-blue-600" : itemIndex % 3 === 1 ? "bg-violet-600" : "bg-emerald-600"}`} />
                            <p className="text-sm font-medium text-slate-700">{item.time_block ?? "Time TBD"}</p>
                            <div>
                              <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">{item.description ?? item.transport ?? item.food ?? item.notes ?? "No notes added yet."}</p>
                              {item.transport ? (
                                <Badge className="mt-4 inline-flex gap-2 rounded-sm bg-slate-50">
                                  <Map size={13} />
                                  Transit Route
                                </Badge>
                              ) : null}
                            </div>
                            <Badge className={`h-fit gap-1 rounded-sm border-0 ${kind.className}`}>
                              <Icon size={14} />
                              {kind.label}
                            </Badge>
                            <Link href={`/trips/${tripId}/trip-plan`} aria-label="Edit itinerary item" className="text-slate-700 hover:text-slate-950">
                              <Edit2 size={18} />
                            </Link>
                          </article>
                        );
                      })
                    ) : (
                      <div className="rounded-md border border-dashed border-slate-300 p-6 text-sm font-medium text-slate-500">No planned items for this day yet.</div>
                    )}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="grid min-h-72 place-items-center rounded-md border border-dashed border-slate-300 text-center">
              <div>
                <p className="text-lg font-bold">No itinerary yet</p>
                <p className="mt-1 text-sm text-slate-500">Create the first trip day from Trip Plan.</p>
              </div>
            </div>
          )}

          <Link href={`/trips/${tripId}/trip-plan`} className="inline-flex min-h-16 items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <PlusCircle size={21} />
            Add Itinerary Item
          </Link>
        </main>
      </section>
    </div>
  );
}
