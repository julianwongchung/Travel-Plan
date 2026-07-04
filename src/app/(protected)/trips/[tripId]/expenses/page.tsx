import { ExpensesClient } from "@/components/expenses/expenses-client";
import { getExpenseData, getTripContext } from "@/lib/db/queries";
import { canAddExpense, canEditTrip } from "@/lib/utils/permissions";

export default async function ExpensesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ trip, appRole }, data] = await Promise.all([
    getTripContext(tripId),
    getExpenseData(tripId),
  ]);

  return (
    <ExpensesClient
      trip={trip}
      tripId={tripId}
      canAddExpense={canAddExpense(appRole) && trip.deleted_at === null}
      canManageExpenses={canEditTrip(trip, appRole)}
      initialData={data}
    />
  );
}
