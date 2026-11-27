import { formatDate } from '@angular/common';

/** A day as `yyyy-MM-dd`, on the device clock. */
export const isoDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** The local midnight of a `yyyy-MM-dd` day. */
export const toDate = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** The month of a date with its year, capitalised in the locale: "Novembre 2026". */
export const monthName = (date: Date, locale: string): string => {
  const name = formatDate(date, 'LLLL y', locale);
  return name.charAt(0).toUpperCase() + name.slice(1);
};

/** The first and last day, as `yyyy-MM-dd`, of the month `offset` months from the date's own. */
export const monthDays = (date: Date, offset = 0): { from: string; to: string } => ({
  from: isoDay(new Date(date.getFullYear(), date.getMonth() + offset, 1)),
  to: isoDay(new Date(date.getFullYear(), date.getMonth() + offset + 1, 0)),
});
