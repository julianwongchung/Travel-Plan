import { createPlace, restorePlace, softDeletePlace } from "@/lib/actions/places";
import { getPlaces, getTripContext } from "@/lib/db/queries";
import { canEdit } from "@/lib/utils/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";

export default async function PlacesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ role }, places] = await Promise.all([getTripContext(tripId), getPlaces(tripId, true)]);
  const editable = canEdit(role);

  return (
    <div className="grid gap-5">
      {editable ? (
        <Card>
          <CardHeader><h1 className="text-lg font-bold">Add place</h1></CardHeader>
          <CardContent>
            <form action={createPlace.bind(null, tripId)} className="grid gap-3 md:grid-cols-3">
              <Field label="Name"><Input name="name" required /></Field>
              <Field label="Type">
                <Select name="type" defaultValue="food">
                  {["food", "hotel", "attraction", "shopping", "transport"].map((type) => <option key={type} value={type}>{type}</option>)}
                </Select>
              </Field>
              <Field label="Priority">
                <Select name="priority" defaultValue="nice-to-have">
                  <option value="must-go">must-go</option>
                  <option value="nice-to-have">nice-to-have</option>
                  <option value="skip">skip</option>
                </Select>
              </Field>
              <Field label="Area"><Input name="area" /></Field>
              <Field label="Google Maps link"><Input name="google_map_link" type="url" /></Field>
              <Field label="Rating"><Input name="rating" type="number" min="0" max="5" step="0.1" /></Field>
              <div className="md:col-span-3">
                <Field label="Notes"><Textarea name="notes" /></Field>
              </div>
              <Button className="md:col-span-3" type="submit">Add place</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm font-semibold text-slate-600">Read-only access. Mutation controls are hidden for viewers.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {places.map((place) => (
          <Card key={place.id} className={place.deleted_at ? "opacity-60" : undefined}>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{place.name}</h2>
                  <p className="text-sm text-slate-500">{place.area}</p>
                </div>
                <Badge>{place.type}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {place.priority ? <Badge>{place.priority}</Badge> : null}
                {place.rating ? <Badge>{place.rating.toFixed(1)} / 5</Badge> : null}
                {place.deleted_at ? <Badge>Deleted</Badge> : null}
              </div>
              <p className="mt-3 text-sm text-slate-600">{place.notes}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {place.google_map_link ? <a className="inline-flex min-h-11 items-center rounded-md bg-[var(--muted)] px-4 text-sm font-bold" href={place.google_map_link} target="_blank">Open map</a> : null}
                {editable && !place.deleted_at ? (
                  <form action={softDeletePlace.bind(null, tripId, place.id)}>
                    <Button variant="secondary" type="submit">Delete</Button>
                  </form>
                ) : null}
                {editable && place.deleted_at ? (
                  <form action={restorePlace.bind(null, tripId, place.id)}>
                    <Button variant="secondary" type="submit">Restore</Button>
                  </form>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
