import { describe, it, expect } from 'vitest';
import { getOpeningStatus, groupOpeningHours, madridNow, rowLabel } from './openingHours';
import type { OpeningHoursDay } from '../services/siteSettingsService';

// Tejidos Pulido: Monday–Saturday 9:30–13:15 and 17:00–20:15, closed Sunday.
const SHOP: OpeningHoursDay[] = [1, 2, 3, 4, 5, 6].map(day => ({
  day,
  ranges: [{ open: '09:30', close: '13:15' }, { open: '17:00', close: '20:15' }],
}));

// 2026-09-28 is a Monday. Madrid is UTC+2 in summer time, so 10:00 UTC = 12:00 Madrid.
const madrid = (isoLocal: string) => new Date(`${isoLocal}+02:00`);

describe('madridNow', () => {
  it('uses Madrid local time, not the browser zone', () => {
    expect(madridNow(new Date('2026-09-28T10:00:00Z'))).toEqual({ day: 1, minutes: 12 * 60 });
    // 23:30 UTC on Saturday is already 01:30 on Sunday in Madrid.
    expect(madridNow(new Date('2026-10-03T23:30:00Z'))).toEqual({ day: 0, minutes: 90 });
  });
});

describe('getOpeningStatus', () => {
  it('is open inside a slot and reports when it closes', () => {
    expect(getOpeningStatus(SHOP, madrid('2026-09-28T12:00:00'))).toEqual({ open: true, closesAt: '13:15' });
  });

  it('treats the closing minute as closed', () => {
    expect(getOpeningStatus(SHOP, madrid('2026-09-28T13:15:00'))).toEqual({ open: false, opensAt: '17:00', inDays: 0, day: 1 });
  });

  it('before opening, opens later today', () => {
    expect(getOpeningStatus(SHOP, madrid('2026-09-28T08:00:00'))).toMatchObject({ open: false, opensAt: '09:30', inDays: 0 });
  });

  it('after closing on a weekday, opens tomorrow', () => {
    expect(getOpeningStatus(SHOP, madrid('2026-09-28T21:00:00'))).toMatchObject({ open: false, opensAt: '09:30', inDays: 1, day: 2 });
  });

  it('on Saturday evening skips the closed Sunday and opens Monday', () => {
    expect(getOpeningStatus(SHOP, madrid('2026-10-03T21:00:00'))).toMatchObject({ open: false, opensAt: '09:30', inDays: 2, day: 1 });
  });

  it('with no hours at all there is nothing to open', () => {
    expect(getOpeningStatus([], madrid('2026-09-28T12:00:00'))).toEqual({ open: false, opensAt: null });
  });
});

describe('groupOpeningHours', () => {
  it('collapses Monday–Saturday into one row and keeps Sunday as closed', () => {
    const rows = groupOpeningHours(SHOP);
    expect(rows).toHaveLength(2);
    expect(rows[0].days).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rows[1]).toEqual({ days: [0], ranges: [] });
    expect(rowLabel(rows[0], 'es')).toBe('Lunes – sábado');
    expect(rowLabel(rows[1], 'en')).toBe('Sunday');
  });

  it('splits days whose hours differ', () => {
    const hours: OpeningHoursDay[] = [
      ...SHOP.filter(d => d.day !== 6),
      { day: 6, ranges: [{ open: '10:00', close: '14:00' }] },
    ];
    expect(groupOpeningHours(hours).map(r => r.days)).toEqual([[1, 2, 3, 4, 5], [6], [0]]);
  });
});
