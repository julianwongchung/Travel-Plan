export function generateGoogleMapsLink(name: string, area?: string | null): string {
  const query = encodeURIComponent(`${name} ${area ?? ""}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
