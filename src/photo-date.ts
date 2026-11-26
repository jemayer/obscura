// Keep calendar dates sortable as Date objects while retaining their precision.
const calendarDates = new WeakSet<Date>();

export function parsePhotoDate(value: string): Date {
  const date = new Date(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime())) {
    calendarDates.add(date);
  }
  return date;
}

export function isCalendarDate(date: Date): boolean {
  return calendarDates.has(date);
}

export function photoDateParts(date: Date): [number, number, number] {
  return isCalendarDate(date)
    ? [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()]
    : [date.getFullYear(), date.getMonth(), date.getDate()];
}
