export function todayIsoLocal(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateToIso(date: Date | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isoToDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  return new Date(year, month - 1, day);
}

export function nightsBetweenIso(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = isoToDate(checkIn);
  const end = isoToDate(checkOut);
  if (!start || !end) return 0;
  return Math.max(
    0,
    Math.floor(
      (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        86400000,
    ),
  );
}

export function addDaysIso(value: string, days: number): string {
  const date = isoToDate(value);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return dateToIso(date);
}

export function rangeIntersectsDates(blockedDates: string[], checkIn: string, checkOut: string): boolean {
  if (!checkIn || !checkOut) return false;
  return blockedDates.some((date) => date >= checkIn && date < checkOut);
}

export function isDateInIsoList(date: Date, dates: Set<string>): boolean {
  return dates.has(dateToIso(date));
}

export function formatDisplayDate(iso: string): string {
  const date = isoToDate(iso);
  if (!date) return "Select date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
