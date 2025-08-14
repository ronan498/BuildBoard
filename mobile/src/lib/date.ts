export function parseDate(value: string): Date {
  if (!value) return new Date(NaN);
  return new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
}
