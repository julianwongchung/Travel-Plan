import { CalendarDays, CheckCircle2, MapPin } from "lucide-react";
import { completeTrip } from "@/lib/actions/trips";
import { getOverviewData, getTripContext, getTripLogistics } from "@/lib/db/queries";
import { normalizeLegacyHotels, normalizePlanLogistics } from "@/lib/utils/trip-logistics";
import { generatedTripDayId, normalizeTripDaysForRange } from "@/lib/utils/trip-days";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { OverviewDayTabs } from "@/components/overview/overview-day-tabs";
import { TripLogisticsSummary } from "@/components/overview/trip-logistics-summary";

function shortDate(date: string | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(`${date}T00:00:00`));
}

export default async function OverviewPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ trip, role }, data, logistics] = await Promise.all([
    getTripContext(tripId),
    getOverviewData(tripId),
    getTripLogistics(tripId),
  ]);
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
  const now = new Date();

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
        actions={role === "owner" ? (
          <form action={completeTrip.bind(null, trip.id)}>
            <Button type="submit" className="w-full text-xs sm:w-auto"><CheckCircle2 size={15} />Complete Trip</Button>
          </form>
        ) : undefined}
      />

      <TripLogisticsSummary
        tripId={tripId}
        hotels={logistics.hotels}
        legacyHotels={normalizeLegacyHotels(data.places)}
        planHotels={planLogistics.hotels}
        flights={logistics.flights}
        planFlights={planLogistics.flights}
        today={now.toISOString().slice(0, 10)}
        now={now.toISOString()}
      />

      <OverviewDayTabs days={currentDays} scheduleItems={data.scheduleItems} />

      <section className="grid min-w-0 gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm font-semibold text-[var(--muted-foreground)]">Trip days</p><p className="mt-2 text-3xl font-extrabold">{currentDays.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm font-semibold text-[var(--muted-foreground)]">Planned items</p><p className="mt-2 text-3xl font-extrabold">{data.scheduleItems.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm font-semibold text-[var(--muted-foreground)]">Saved places</p><p className="mt-2 text-3xl font-extrabold">{data.places.length}</p></CardContent></Card>
      </section>
    </div>
  );
}
