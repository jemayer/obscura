// Date objects keep photo dates compatible with the existing sorting code.
// They represent calendar days, so rendering uses their UTC fields as stored.
const photoDates = new WeakSet<Date>();

export function parsePhotoDate(day: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day === '1970-01-01') {
    return undefined;
  }
  const date = new Date(day);
  if (!Number.isFinite(date.getTime()) || formatPhotoDate(date) !== day) {
    return undefined;
  }
  photoDates.add(date);
  return date;
}

export function readPhotoDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    if (isPhotoDate(value)) return value;
    return Number.isFinite(value.getTime())
      ? parsePhotoDate(formatPhotoDate(value))
      : undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const text = value.trim();
  const day = /^\d{4}-\d{2}-\d{2}(?=$|[ T])/.exec(text)?.[0];
  if (day === text) return parsePhotoDate(day);
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  return parsePhotoDate(day ?? formatPhotoDate(parsed));
}

export function isPhotoDate(date: Date): boolean {
  return photoDates.has(date);
}

export function formatPhotoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dateParts(date: Date): [number, number, number] {
  return isPhotoDate(date)
    ? [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()]
    : [date.getFullYear(), date.getMonth(), date.getDate()];
}
