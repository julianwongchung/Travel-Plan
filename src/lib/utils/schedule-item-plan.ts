import { generateGoogleMapsLink } from "@/lib/utils/google-maps";

export type ScheduleItemCategory = "flight" | "lodging" | "activity" | "food" | "transport" | "other";

export type FlightPlanSegment = {
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
};

export type FlightPlan = {
  segments: FlightPlanSegment[];
  passengers: string[];
  notes: string | null;
};

type FlightPlanInput = {
  planType: "flight";
  segments: FlightPlanSegment[];
  passengers: string[];
  notes?: string | null;
};

type HotelPlanInput = {
  planType: "hotel";
  hotelName: string;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
};

type PlacePlanInput = {
  planType: "place";
  placeName: string;
  placeTime?: string | null;
  notes?: string | null;
};

export type SchedulePlanInput = FlightPlanInput | HotelPlanInput | PlacePlanInput;

export type SchedulePlanFields = {
  title: string;
  timeBlock: string | null;
  description: string | null;
  transport: "Flight" | "Lodging" | "Activity";
  notes: string | null;
};

const flightPlanPrefix = "__travel_os_flight_plan_v1__:";

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function joinDetails(details: Array<string | null>) {
  const value = details.filter((detail): detail is string => Boolean(detail)).join(" - ");
  return value || null;
}

function uniqueCleanValues(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const cleaned = clean(value);
    if (!cleaned || seen.has(cleaned.toLowerCase())) continue;
    seen.add(cleaned.toLowerCase());
    output.push(cleaned);
  }
  return output;
}

function uniqueRoutePoints(segments: FlightPlanSegment[]) {
  if (!segments.length) return [];
  return [
    segments[0].origin,
    ...segments.map((segment) => segment.destination),
  ].filter(Boolean);
}

function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time || "00:00"}:00`);
}

function dateOnlyUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return Number.NaN;
  return Date.UTC(year, month - 1, day);
}

function dayDifference(startDate: string, endDate: string) {
  const start = dateOnlyUtc(startDate);
  const end = dateOnlyUtc(endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function normalizeFlightSegment(segment: FlightPlanSegment): FlightPlanSegment {
  return {
    origin: clean(segment.origin) ?? "",
    destination: clean(segment.destination) ?? "",
    departureDate: clean(segment.departureDate) ?? "",
    departureTime: clean(segment.departureTime) ?? "",
    arrivalDate: clean(segment.arrivalDate) ?? "",
    arrivalTime: clean(segment.arrivalTime) ?? "",
  };
}

export function flightRouteSummary(segments: FlightPlanSegment[]) {
  return uniqueRoutePoints(segments).join(" \u2192 ");
}

export function flightStopoverSummary(segments: FlightPlanSegment[]) {
  const stops = segments.slice(0, -1).map((segment) => segment.destination).filter(Boolean);
  if (!stops.length) return "Direct flight";
  return `${stops.length} stop${stops.length === 1 ? "" : "s"} in ${stops.join(", ")}`;
}

export function flightArrivalDayOffset(segment: FlightPlanSegment) {
  const days = dayDifference(segment.departureDate, segment.arrivalDate);
  return days > 0 ? `+${days} day${days === 1 ? "" : "s"}` : null;
}

export function flightPlanTouchesDate(flightPlan: FlightPlan, date: string) {
  return flightPlan.segments.some((segment) => (
    segment.departureDate === date || segment.arrivalDate === date
  ));
}

export function flightPlanTimeForDate(flightPlan: FlightPlan, date: string) {
  const departingSegment = flightPlan.segments.find((segment) => segment.departureDate === date);
  if (departingSegment) return departingSegment.departureTime;

  const arrivingSegment = [...flightPlan.segments]
    .reverse()
    .find((segment) => segment.arrivalDate === date);
  return arrivingSegment?.arrivalTime ?? null;
}

export function serializeFlightPlan(segments: FlightPlanSegment[], passengers: string[], notes?: string | null) {
  return `${flightPlanPrefix}${JSON.stringify({
    segments,
    passengers: uniqueCleanValues(passengers),
    notes: clean(notes),
  })}`;
}

export function parseFlightPlanDescription(description: string | null | undefined) {
  if (!description?.startsWith(flightPlanPrefix)) return null;

  try {
    const parsed = JSON.parse(description.slice(flightPlanPrefix.length)) as {
      segments?: Array<FlightPlanSegment & {
        passengerName?: string | null;
        notes?: string | null;
      }>;
      passengers?: string[];
      notes?: string | null;
    };
    const segments = Array.isArray(parsed.segments)
      ? parsed.segments.map(normalizeFlightSegment).filter((segment) => (
        segment.origin &&
        segment.destination &&
        segment.departureDate &&
        segment.departureTime &&
        segment.arrivalDate &&
        segment.arrivalTime
      ))
      : [];
    if (!segments.length) return null;

    const passengers = uniqueCleanValues([
      ...(Array.isArray(parsed.passengers) ? parsed.passengers : []),
      ...(Array.isArray(parsed.segments) ? parsed.segments.map((segment) => segment.passengerName) : []),
    ]);
    const legacyNotes = Array.isArray(parsed.segments)
      ? uniqueCleanValues(parsed.segments.map((segment) => segment.notes)).join(" - ")
      : "";
    return {
      segments,
      passengers,
      notes: clean(parsed.notes) ?? clean(legacyNotes),
    } satisfies FlightPlan;
  } catch {
    return null;
  }
}

export function buildScheduleItemPlan(input: SchedulePlanInput): SchedulePlanFields {
  if (input.planType === "flight") {
    const segments = input.segments.map(normalizeFlightSegment);
    const passengers = uniqueCleanValues(input.passengers);
    if (!segments.length) throw new Error("Add at least one flight segment.");
    if (!passengers.length) throw new Error("Add at least one passenger.");

    for (const segment of segments) {
      if (
        !segment.origin ||
        !segment.destination ||
        !segment.departureDate ||
        !segment.departureTime ||
        !segment.arrivalDate ||
        !segment.arrivalTime
      ) {
        throw new Error("Complete all required flight segment fields.");
      }

      if (toDateTime(segment.arrivalDate, segment.arrivalTime) < toDateTime(segment.departureDate, segment.departureTime)) {
        throw new Error("Flight arrival must be after departure.");
      }
    }

    return {
      title: flightRouteSummary(segments),
      timeBlock: segments[0]?.departureTime ?? null,
      description: serializeFlightPlan(segments, passengers, input.notes),
      transport: "Flight",
      notes: null,
    };
  }

  if (input.planType === "hotel") {
    const hotelName = clean(input.hotelName);
    if (!hotelName) throw new Error("Hotel name is required.");

    const checkIn = clean(input.checkIn);
    const checkOut = clean(input.checkOut);
    return {
      title: hotelName,
      timeBlock: checkIn,
      description: joinDetails([
        checkIn ? `Check-in: ${checkIn}` : null,
        checkOut ? `Check-out: ${checkOut}` : null,
        clean(input.notes),
      ]),
      transport: "Lodging",
      notes: null,
    };
  }

  const placeName = clean(input.placeName);
  if (!placeName) throw new Error("Place name is required.");

  return {
    title: placeName,
    timeBlock: clean(input.placeTime),
    description: clean(input.notes),
    transport: "Activity",
    notes: generateGoogleMapsLink(placeName),
  };
}

function categoryFromText(value: string): ScheduleItemCategory | null {
  const text = value.toLowerCase();
  if (/\b(flight|plane|airline|airport|boarding)\b/.test(text)) return "flight";
  if (/\b(hotel|lodging|accommodation|hostel|resort|check-in)\b/.test(text)) return "lodging";
  if (/\b(food|restaurant|dining|breakfast|lunch|dinner|cafe|meal)\b/.test(text)) return "food";
  if (/\b(transport|transit|train|taxi|bus|ferry|shuttle|metro|car)\b/.test(text)) return "transport";
  if (/\b(activity|place|attraction|tour|museum|sightseeing|experience|walk)\b/.test(text)) return "activity";
  return null;
}

export function scheduleItemCategory(item: {
  title: string;
  category?: string | null;
  description?: string | null;
  transport?: string | null;
  food?: string | null;
  notes?: string | null;
}): ScheduleItemCategory {
  const explicitCategory = clean(item.category);
  if (explicitCategory) {
    const category = categoryFromText(explicitCategory);
    if (category) return category;
  }

  const transportMarker = clean(item.transport)?.toLowerCase();
  if (transportMarker === "flight") return "flight";
  if (transportMarker === "lodging" || transportMarker === "hotel") return "lodging";
  if (transportMarker === "activity" || transportMarker === "place") return "activity";
  if (item.food) return "food";
  if (item.transport) return "transport";

  return categoryFromText(
    `${item.title} ${item.description ?? ""} ${item.notes ?? ""}`,
  ) ?? "other";
}
