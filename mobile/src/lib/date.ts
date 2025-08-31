export function parseDate(value: string): Date {
  if (!value) return new Date(NaN);
  return new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
}

export function parseWhenToDates(when?: string): { start: string; end: string } {
  if (!when) return { start: "", end: "" };
  const months: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const [a, b] = when.split(" - ").map((s) => s.trim());
  const parse = (part?: string) => {
    if (!part) return "";
    const m = part.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/);
    if (!m) return "";
    const d = parseInt(m[1], 10);
    const mon = months[m[2].slice(0, 3).toLowerCase()];
    if (isNaN(d) || mon == null) return "";
    const dt = new Date(Date.UTC(2025, mon, d));
    return dt.toISOString().slice(0, 10);
  };
  return { start: parse(a), end: parse(b) };
}

export function parseWhenToDates(when?: string): { start: string; end: string } {
  if (!when) return { start: "", end: "" };
  const months: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const [a, b] = when.split(" - ").map((s) => s.trim());
  const parse = (part?: string) => {
    if (!part) return "";
    const m = part.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/);
    if (!m) return "";
    const d = parseInt(m[1], 10);
    const mon = months[m[2].slice(0, 3).toLowerCase()];
    if (isNaN(d) || mon == null) return "";
    const dt = new Date(Date.UTC(2025, mon, d));
    return dt.toISOString().slice(0, 10);
  };
  return { start: parse(a), end: parse(b) };
}