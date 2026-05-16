export function parseTravelerNames(input: string) {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const rawName of input.split(/[\n,]+/)) {
    const name = rawName.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}
