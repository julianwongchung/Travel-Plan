import Link from "next/link";
import { Archive, Bed, CalendarDays, Map, MapPin, Plane, Users } from "lucide-react";
import { inviteTripMember } from "@/lib/actions/invitations";
import { archiveTrip, completeTrip } from "@/lib/actions/trips";
import { getOverviewData, getTripContext, getTripMembers } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-fields";
import { GlassButtonLink } from "@/components/ui/glass-button";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { OverviewDayTabs } from "@/components/overview/overview-day-tabs";
import { generatedTripDayId, normalizeTripDaysForRange } from "@/lib/utils/trip-days";

function shortDate(date: string | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function dayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
}

export default async function OverviewPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ trip, role }, memberData, data] = await Promise.all([getTripContext(tripId), getTripMembers(tripId), getOverviewData(tripId)]);
  const isOwner = role === "owner";
  const sortedDays = normalizeTripDaysForRange(
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
  const firstDay = sortedDays[0];
  const nextHotel = sortedDays.find((day) => day.hotel_name)?.hotel_name ?? "Add base hotel in Trip Plan";
  const destination = firstDay?.route ?? data.places[0]?.area ?? "Destination not set";
  const dateRange = [shortDate(trip.start_date), shortDate(trip.end_date)].filter(Boolean).join(" - ") || "Dates not set";

  return (
    <div className="grid gap-6">
      <section>
        <IOSPageHeader
          title={trip.name}
          description={
            <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
              <span className="inline-flex min-w-0 items-center gap-2">
                <CalendarDays size={16} />
                {dateRange}
              </span>
              <span className="inline-flex min-w-0 items-center gap-2">
                <MapPin size={16} />
                {destination}
              </span>
            </div>
          }
          actions={isOwner ? (
            <>
              <GlassButtonLink href="#invite-member" variant="glass" className="flex-1 text-xs sm:flex-none">
                <Users size={15} />
                Invite Member
              </GlassButtonLink>
              <form action={archiveTrip.bind(null, trip.id)}>
                <Button variant="secondary" type="submit" className="w-full text-xs sm:w-auto">
                  <Archive size={15} />
                  Archive
                </Button>
              </form>
              <form action={completeTrip.bind(null, trip.id)}>
                <Button type="submit" className="w-full text-xs sm:w-auto">
                  Complete Trip
                </Button>
              </form>
            </>
          ) : undefined}
        />
      </section>

      <OverviewDayTabs
        tripId={tripId}
        days={sortedDays}
        scheduleItems={data.scheduleItems}
        logistics={
          <aside className="grid min-w-0 content-start gap-5">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.025em]">Logistics Overview</h2>
            <div className="mt-4 h-px bg-[var(--border)]" />
          </div>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 text-blue-600">
                <Plane size={20} />
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Inbound Flight</p>
              </div>
              <h3 className="mt-5 break-words text-xl font-bold tracking-[-0.02em]">{firstDay?.route ?? "Arrival route not set"}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{firstDay ? `${dayDate(firstDay.date)} arrival plan` : "Add the first trip day to populate this card."}</p>
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <Link href={`/trips/${tripId}/trip-plan`} className="text-sm font-semibold text-[var(--primary)]">
                  Edit Arrival
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 text-violet-600">
                <Bed size={20} />
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Base Camp</p>
              </div>
              <h3 className="mt-5 break-words text-xl font-bold tracking-[-0.02em]">{nextHotel}</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{dateRange}</p>
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <Link href={`/trips/${tripId}/trip-plan`} className="text-sm font-semibold text-[var(--primary)]">
                  Details
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid min-h-64 place-items-center overflow-hidden rounded-[24px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(10,132,255,0.14),rgba(48,209,88,0.08)),repeating-linear-gradient(90deg,rgba(148,163,184,0.16)_0_1px,transparent_1px_24px),repeating-linear-gradient(0deg,rgba(148,163,184,0.14)_0_1px,transparent_1px_24px)] shadow-[var(--shadow-card)]">
            <GlassButtonLink href={`/trips/${tripId}/places`} variant="glass">
              <Map size={16} />
              Explore Map View
            </GlassButtonLink>
          </div>

          {isOwner ? (
            <Card id="invite-member">
              <CardContent className="p-5">
                <h2 className="text-lg font-bold">Invite Member</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{memberData.members.length} member(s), {memberData.invitations.length} pending invitation(s)</p>
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
                  <Button className="w-full sm:w-auto" type="submit">Send Invite</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
          </aside>
        }
      />
    </div>
  );
}
