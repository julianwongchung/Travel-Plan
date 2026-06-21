import { ExpensesClient } from "@/components/expenses/expenses-client";
import { getExpenseData, getTripContext } from "@/lib/db/queries";
import { canEditTrip } from "@/lib/utils/permissions";

export default async function ExpensesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ trip, role }, data] = await Promise.all([
    getTripContext(tripId),
    getExpenseData(tripId),
  ]);

  return (
    <ExpensesClient
      trip={trip}
      tripId={tripId}
      editable={canEditTrip(role, trip)}
      initialData={data}
    />
  );
}
