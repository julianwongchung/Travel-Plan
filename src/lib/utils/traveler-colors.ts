export type TravelerColorInput = {
  id: string;
  name: string;
  created_at?: string | null;
};

export type TravelerColor = {
  name: string;
  accent: string;
  soft: string;
  border: string;
  text: string;
};

export type PassengerColor = {
  name: string;
  color: TravelerColor;
  knownTraveler: boolean;
};

const palette: TravelerColor[] = [
  { name: "blue", accent: "#0A84FF", soft: "rgba(10, 132, 255, 0.12)", border: "rgba(10, 132, 255, 0.28)", text: "#0757B8" },
  { name: "purple", accent: "#8B5CF6", soft: "rgba(139, 92, 246, 0.13)", border: "rgba(139, 92, 246, 0.3)", text: "#5B21B6" },
  { name: "green", accent: "#22C55E", soft: "rgba(34, 197, 94, 0.13)", border: "rgba(34, 197, 94, 0.3)", text: "#166534" },
  { name: "orange", accent: "#F97316", soft: "rgba(249, 115, 22, 0.14)", border: "rgba(249, 115, 22, 0.3)", text: "#9A3412" },
  { name: "pink", accent: "#EC4899", soft: "rgba(236, 72, 153, 0.13)", border: "rgba(236, 72, 153, 0.3)", text: "#9D174D" },
  { name: "cyan", accent: "#06B6D4", soft: "rgba(6, 182, 212, 0.13)", border: "rgba(6, 182, 212, 0.3)", text: "#0E7490" },
  { name: "amber", accent: "#F59E0B", soft: "rgba(245, 158, 11, 0.14)", border: "rgba(245, 158, 11, 0.3)", text: "#92400E" },
  { name: "indigo", accent: "#6366F1", soft: "rgba(99, 102, 241, 0.13)", border: "rgba(99, 102, 241, 0.3)", text: "#3730A3" },
];

export function normalizeTravelerName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function orderedTravelers(travelers: TravelerColorInput[]) {
  return [...travelers].sort((a, b) => {
    const createdA = a.created_at ? Date.parse(a.created_at) : Number.NaN;
    const createdB = b.created_at ? Date.parse(b.created_at) : Number.NaN;
    if (!Number.isNaN(createdA) && !Number.isNaN(createdB) && createdA !== createdB) {
      return createdA - createdB;
    }
    if (!Number.isNaN(createdA) && Number.isNaN(createdB)) return -1;
    if (Number.isNaN(createdA) && !Number.isNaN(createdB)) return 1;
    return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}

export function travelerColorForIndex(index: number) {
  return palette[index % palette.length];
}

export function travelerColorMap(travelers: TravelerColorInput[]) {
  const colors = new Map<string, TravelerColor>();
  orderedTravelers(travelers).forEach((traveler, index) => {
    const key = normalizeTravelerName(traveler.name);
    if (key && !colors.has(key)) {
      colors.set(key, travelerColorForIndex(index));
    }
  });
  return colors;
}

export function fallbackPassengerColor(passengerName: string) {
  return travelerColorForIndex(stableHash(normalizeTravelerName(passengerName)) % palette.length);
}

export function passengerColors(passengers: string[], travelers: TravelerColorInput[]): PassengerColor[] {
  const colorsByName = travelerColorMap(travelers);
  const seen = new Set<string>();

  return passengers
    .map((passenger) => passenger.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .filter((passenger) => {
      const key = normalizeTravelerName(passenger);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((passenger) => {
      const key = normalizeTravelerName(passenger);
      const knownColor = colorsByName.get(key);
      return {
        name: passenger,
        color: knownColor ?? fallbackPassengerColor(passenger),
        knownTraveler: Boolean(knownColor),
      };
    });
}
