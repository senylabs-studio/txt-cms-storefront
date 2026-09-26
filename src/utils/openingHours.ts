import type { OpeningHoursDay, OpeningHoursRange } from '../services/siteSettingsService';

/** Display order: Monday first, Sunday last (day numbers are JavaScript's getDay(): 0 = Sunday). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** The shop's local weekday and minutes since midnight — the hours are Madrid time wherever the shopper is. */
export const madridNow = (date: Date): { day: number; minutes: number } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
};

export type OpeningStatus =
  | { open: true; closesAt: string }
  /** `inDays`: 0 = later today, 1 = tomorrow, 2+ = on `day`. */
  | { open: false; opensAt: string; inDays: number; day: number }
  | { open: false; opensAt: null };

const rangesFor = (hours: OpeningHoursDay[], day: number): OpeningHoursRange[] =>
  [...(hours.find(h => h.day === day)?.ranges ?? [])].sort((a, b) => toMinutes(a.open) - toMinutes(b.open));

export const getOpeningStatus = (hours: OpeningHoursDay[], now: Date): OpeningStatus => {
  const { day, minutes } = madridNow(now);
  const today = rangesFor(hours, day);

  const current = today.find(r => minutes >= toMinutes(r.open) && minutes < toMinutes(r.close));
  if (current) return { open: true, closesAt: current.close };

  const laterToday = today.find(r => toMinutes(r.open) > minutes);
  if (laterToday) return { open: false, opensAt: laterToday.open, inDays: 0, day };

  for (let inDays = 1; inDays <= 7; inDays++) {
    const nextDay = (day + inDays) % 7;
    const first = rangesFor(hours, nextDay)[0];
    if (first) return { open: false, opensAt: first.open, inDays, day: nextDay };
  }
  return { open: false, opensAt: null };
};

export interface OpeningHoursRow {
  /** Consecutive weekdays (in WEEK_ORDER) sharing the same hours. */
  days: number[];
  ranges: OpeningHoursRange[];
}

/** Collapses consecutive days with identical hours into one row ("Lunes – sábado"); closed days get empty ranges. */
export const groupOpeningHours = (hours: OpeningHoursDay[]): OpeningHoursRow[] => {
  const rows: OpeningHoursRow[] = [];
  for (const day of WEEK_ORDER) {
    const ranges = rangesFor(hours, day);
    const key = JSON.stringify(ranges);
    const last = rows[rows.length - 1];
    if (last && JSON.stringify(last.ranges) === key) last.days.push(day);
    else rows.push({ days: [day], ranges });
  }
  return rows;
};

/** Localized weekday name, e.g. dayName(1, 'es') → "lunes". 2024-01-07 was a Sunday. */
export const dayName = (day: number, locale: string): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + day)));

export const rowLabel = (row: OpeningHoursRow, locale: string): string => {
  const first = dayName(row.days[0], locale);
  const label = row.days.length === 1 ? first : `${first} – ${dayName(row.days[row.days.length - 1], locale)}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
};
