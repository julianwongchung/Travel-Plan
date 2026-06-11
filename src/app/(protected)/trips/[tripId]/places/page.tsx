import { ExternalLink, MapPin, Plus, RotateCcw, Star, Trash2 } from "lucide-react";
import { createPlace, restorePlace, softDeletePlace } from "@/lib/actions/places";
import { getPlaces, getTripContext } from "@/lib/db/queries";
import { canEdit } from "@/lib/utils/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { IOSPageHeader } from "@/components/ui/ios-page-header";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function PlacesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const [{ role }, places] = await Promise.all([getTripContext(tripId), getPlaces(tripId, true)]);
  const editable = canEdit(role);

  return (
    <div className="page-enter grid min-w-0 gap-6 sm:gap-7">
      <IOSPageHeader
        eyebrow="Map notebook"
        title="Places"
        description="Keep restaurants, hotels, attractions, shopping, and transport ideas together."
        actions={<StatusBadge status={`${places.filter((place) => !place.deleted_at).length} saved`} />}
      />

      {editable ? (
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-3 text-lg font-bold tracking-[-0.02em]">
              <span className="grid size-9 place-items-center rounded-[13px] bg-[var(--primary-soft)] text-[var(--primary)]"><Plus size={18} /></span>
              Add place
            </h2>
          </CardHeader>
          <CardContent>
            <form action={createPlace.bind(null, tripId)} className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Name" className="sm:col-span-2 lg:col-span-1"><Input name="name" required placeholder="Marble Mountain" /></Field>
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
              <Field label="Area"><Input name="area" placeholder="Ngu Hanh Son" /></Field>
              <Field label="Google Maps link"><Input name="google_map_link" type="url" placeholder="Generated if left empty" /></Field>
              <Field label="Rating"><Input name="rating" type="number" min="0" max="5" step="0.1" /></Field>
              <Field label="Notes" className="sm:col-span-2 lg:col-span-3"><Textarea name="notes" /></Field>
              <Button className="w-full sm:col-span-2 sm:w-auto sm:justify-self-start lg:col-span-3" type="submit">
                <Plus size={17} />
                Add place
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--muted)] p-4 text-sm font-semibold text-[var(--muted-foreground)]">
          Read-only access. Mutation controls are hidden for viewers.
        </div>
      )}

      {places.length ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {places.map((place) => (
            <Card key={place.id} className={place.deleted_at ? "opacity-60" : undefined}>
              <CardContent className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-[var(--primary-soft)] text-[var(--primary)]">
                    <MapPin size={20} />
                  </span>
                  <StatusBadge status={place.type} />
                </div>
                <div className="mt-5 min-w-0">
                  <h2 className="break-words text-xl font-bold tracking-[-0.025em]">{place.name}</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{place.area || "Area not set"}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {place.priority ? <StatusBadge status={place.priority} /> : null}
                  {place.rating ? <StatusBadge status={`${place.rating.toFixed(1)} / 5`} tone="warning" /> : null}
                  {place.deleted_at ? <StatusBadge status="deleted" /> : null}
                </div>
                {place.notes ? <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">{place.notes}</p> : null}
                <div className="mt-auto flex min-w-0 flex-wrap gap-2 pt-5">
                  {place.google_map_link ? (
                    <a className="ios-pressable inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 whitespace-normal rounded-full border border-[var(--border)] bg-[var(--card-strong)] px-4 text-center text-sm font-semibold" href={place.google_map_link} target="_blank">
                      <ExternalLink size={16} />
                      Open map
                    </a>
                  ) : null}
                  {place.rating ? <span className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-[var(--warning)]"><Star size={16} />{place.rating.toFixed(1)}</span> : null}
                  {editable && !place.deleted_at ? (
                    <form action={softDeletePlace.bind(null, tripId, place.id)}>
                      <Button variant="ghost" type="submit" className="text-[var(--danger)]">
                        <Trash2 size={16} />
                        Delete
                      </Button>
                    </form>
                  ) : null}
                  {editable && place.deleted_at ? (
                    <form action={restorePlace.bind(null, tripId, place.id)}>
                      <Button variant="secondary" type="submit">
                        <RotateCcw size={16} />
                        Restore
                      </Button>
                    </form>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-transparent shadow-none">
          <CardContent className="grid min-h-44 place-items-center text-center">
            <div>
              <MapPin className="mx-auto text-[var(--primary)]" size={26} />
              <h2 className="mt-3 font-bold">No places saved yet</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Add the first stop to begin your map notebook.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
