import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { isoDay, monthDays, monthName, toDate } from './day';

registerLocaleData(localeIt);

describe('day', () => {
  it('isoDay writes the local day as yyyy-MM-dd, zero-padded', () => {
    expect(isoDay(new Date(2026, 1, 5, 23, 59))).toBe('2026-02-05');
  });

  it('toDate reads a yyyy-MM-dd day as its local midnight', () => {
    expect(toDate('2026-02-05')).toEqual(new Date(2026, 1, 5));
  });

  it('monthName names the month and year, capitalised', () => {
    expect(monthName(new Date(2026, 10, 27), 'it')).toBe('Novembre 2026');
  });

  it('monthDays gives the first and last day of the month at the offset, across years', () => {
    expect(monthDays(new Date(2026, 1, 14))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthDays(new Date(2026, 0, 31), -1)).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });
});
