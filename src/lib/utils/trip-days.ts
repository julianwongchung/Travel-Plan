type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
    };

const oneDayMs = 24 * 60 * 60 * 1000;

export function validateNewTripDayDate(date: string, existingDates: string[]): ValidationResult {
  if (existingDates.includes(date)) {
    return {
      ok: false,
      message: "This date is already in your trip plan.",
    };
  }

  return { ok: true };
}

export function buildTripDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate) return [];

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = endDate ? new Date(`${endDate}T00:00:00Z`) : start;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [startDate];

  const dates: string[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += oneDayMs) {
    dates.push(new Date(time).toISOString().slice(0, 10));
  }

  return dates;
}

export function validateTripCreationDates(startDate: string | null, endDate: string | null): ValidationResult {
  if (!startDate || !endDate) {
    return {
      ok: false,
      message: "Trip start and end dates are required.",
    };
  }

  if (new Date(`${endDate}T00:00:00Z`) < new Date(`${startDate}T00:00:00Z`)) {
    return {
      ok: false,
      message: "Trip end date must be on or after start date.",
    };
  }

  return { ok: true };
}
