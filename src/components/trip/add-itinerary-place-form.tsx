"use client";

import { useMemo, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { addScheduleItem } from "@/lib/actions/trips";
import { generateGoogleMapsLink } from "@/lib/utils/google-maps";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-fields";

export function AddItineraryPlaceForm({
  tripId,
  dayId,
  dayDate,
  dayNumber,
  nextStopNumber,
}: {
  tripId: string;
  dayId: string | null;
  dayDate: string;
  dayNumber: number;
  nextStopNumber: number;
}) {
  const [placeName, setPlaceName] = useState("");
  const googleMapsLink = useMemo(
    () => (placeName.trim() ? generateGoogleMapsLink(placeName) : ""),
    [placeName],
  );

  return (
    <form
      action={addScheduleItem.bind(null, tripId)}
      className="mt-4 grid min-w-0 gap-3 rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--muted)] p-3 sm:p-4"
    >
      <input type="hidden" name="trip_day_id" value={dayId ?? ""} />
      <input type="hidden" name="trip_day_date" value={dayDate} />
      <input type="hidden" name="trip_day_number" value={dayNumber} />
      <input type="hidden" name="google_map_link" value={googleMapsLink} />
      <input type="hidden" name="sort_order" value={nextStopNumber} />

      <Field label={`Stop ${nextStopNumber}`}>
        <Input
          name="place_name"
          required
          placeholder="Type a place name"
          value={placeName}
          onChange={(event) => setPlaceName(event.target.value)}
        />
      </Field>
      <p className="text-xs font-semibold text-[var(--muted-foreground)]">
        Enter a place name. A Google Maps search link will be created automatically.
      </p>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button className="w-full sm:w-auto" type="submit" disabled={!placeName.trim()}>
          <Plus size={16} />
          Add place
        </Button>
        {googleMapsLink ? (
          <a
            className="ios-pressable inline-flex min-h-11 w-full min-w-0 max-w-full items-center justify-center gap-2 whitespace-normal rounded-full bg-[var(--primary-soft)] px-4 text-center text-sm font-semibold text-[var(--primary)] sm:w-auto"
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin size={16} />
            Open in Google Maps
          </a>
        ) : null}
      </div>
    </form>
  );
}
