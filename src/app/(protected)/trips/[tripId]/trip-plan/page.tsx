import { getOverviewData, getTripContext } from "@/lib/db/queries";
import { canEdit } from "@/lib/utils/permissions";
import { summarizeByCurrency } from "@/lib/utils/expense-calculations";
import { TripPlanDayTabs } from "@/components/trip/trip-plan-day-tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { generatedTripDayId, normalizeTripDaysForRange } from "@/lib/utils/trip-days";

export default async function TripPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { tripId } = await params;
  const selectedDayDate = (await searchParams).day;
  const [{ trip, role }, data] = await Promise.all([getTripContext(tripId), getOverviewData(tripId)]);
  const editable = canEdit(role);
  const expenseSummary = summarizeByCurrency(data.expenses);
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
  const nextDay = currentDays.find((day) => new Date(`${day.date}T00:00:00`) >= new Date()) ?? currentDays[0];
  const initialSelectedDayId = currentDays.find((day) => day.date === selectedDayDate)?.id;

  return (
    <div className="grid min-w-0 gap-6 sm:gap-7">
      <IOSPageHeader
        eyebrow="Trip plan"
        title="Itinerary builder"
        description="Build the trip day by day, with routes, hotels, and saved stops."
      />

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="sm:col-span-2 xl:col-span-1">
          <CardHeader><h2 className="font-bold">Next route</h2></CardHeader>
          <CardContent><p className="text-sm text-[var(--muted-foreground)]">{nextDay?.route ?? "No route planned yet."}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="font-bold">Hotel</h2></CardHeader>
          <CardContent><p className="text-sm text-[var(--muted-foreground)]">{nextDay?.hotel_name ?? "No hotel saved yet."}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="font-bold">Expense summary</h2></CardHeader>
          <CardContent>
            {Object.entries(expenseSummary).length ? Object.entries(expenseSummary).map(([currency, total]) => <p key={currency} className="text-sm font-semibold">{currency} {total.toFixed(2)}</p>) : <p className="text-sm text-[var(--muted-foreground)]">No expenses yet.</p>}
          </CardContent>
        </Card>
      </div>

      {!editable ? (
        <p className="rounded-[18px] border border-[var(--border)] bg-[var(--muted)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">Read-only access. Mutation controls are hidden for viewers.</p>
      ) : null}

      <TripPlanDayTabs
        tripId={tripId}
        days={currentDays}
        scheduleItems={data.scheduleItems}
        editable={editable}
        initialSelectedDayId={initialSelectedDayId}
      />
    </div>
  );
}
