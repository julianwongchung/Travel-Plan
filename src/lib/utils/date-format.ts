function parseDateParts(date: string | null | undefined) {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
}

export function formatDisplayDate(date: string | null | undefined, fallback = "Not set") {
  const parts = parseDateParts(date);
  return parts ? `${parts.day}/${parts.month}/${parts.year}` : fallback;
}

export function formatDisplayDateTime(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  const [date = "", timeWithSeconds = ""] = value.split("T");
  const dateLabel = formatDisplayDate(date, "");
  if (!dateLabel) return fallback;
  const [hour = "", minute = ""] = timeWithSeconds.split(":");
  return hour && minute ? `${dateLabel} ${hour}:${minute}` : dateLabel;
}

export function formatDisplayDateAndTime(date: string | null | undefined, time: string | null | undefined, fallback = "Not set") {
  const dateLabel = formatDisplayDate(date, "");
  if (!dateLabel) return fallback;
  const [hour = "", minute = ""] = (time ?? "").split(":");
  return hour && minute ? `${dateLabel} ${hour}:${minute}` : dateLabel;
}

export function formatDisplayTimestamp(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}`;
}
