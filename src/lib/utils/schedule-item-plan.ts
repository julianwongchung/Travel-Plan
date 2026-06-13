import { generateGoogleMapsLink } from "@/lib/utils/google-maps";

export type ScheduleItemCategory = "flight" | "lodging" | "activity" | "food" | "transport" | "other";

type FlightPlanInput = {
  planType: "flight";
  flightNumber: string;
  flightTime?: string | null;
  passengerName: string;
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

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function joinDetails(details: Array<string | null>) {
  const value = details.filter((detail): detail is string => Boolean(detail)).join(" - ");
  return value || null;
}

export function buildScheduleItemPlan(input: SchedulePlanInput): SchedulePlanFields {
  if (input.planType === "flight") {
    const flightNumber = clean(input.flightNumber);
    const passengerName = clean(input.passengerName);
    if (!flightNumber || !passengerName) {
      throw new Error("Flight number and passenger name are required.");
    }

    return {
      title: `Flight ${flightNumber}`,
      timeBlock: clean(input.flightTime),
      description: joinDetails([
        `Passenger: ${passengerName}`,
        clean(input.notes),
      ]),
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
