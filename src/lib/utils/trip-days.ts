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

export function normalizeTripDaysForRange<
  T extends { date: string; day_number: number | null },
>(
  days: T[],
  startDate: string | null,
  endDate: string | null,
  createMissingDay: (date: string, dayNumber: number) => T,
): T[] {
  const dates = buildTripDateRange(startDate, endDate);
  const daysByDate = new Map(days.map((day) => [day.date, day]));

  return dates.map((date, index) => {
    const day = daysByDate.get(date);
    return day
      ? { ...day, day_number: index + 1 }
      : createMissingDay(date, index + 1);
  });
}

export function generatedTripDayId(date: string) {
  return `generated-trip-day:${date}`;
}

export function isGeneratedTripDayId(dayId: string) {
  return dayId.startsWith("generated-trip-day:");
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

export function getNextStopNumber(dayId: string, scheduleItems: Array<{ trip_day_id: string }>) {
  return scheduleItems.filter((item) => item.trip_day_id === dayId).length + 1;
}
