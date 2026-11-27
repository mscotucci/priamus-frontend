import type { components } from '../../../core/api/generated/api-types';

/** What the end of a trip asks besides the time: nothing, the kilograms or the kilometres. */
export type TripEndAsks = components['schemas']['TripEndAsks'];

/** `yyyy-MM-dd` of a date in the device's time zone. */
export function dayOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function yesterdayOf(today: string): string {
  const [year, month, day] = today.split('-').map(Number);
  return dayOf(new Date(year, month - 1, day - 1));
}

/** A day the driver may pick: today or before; never a future one. */
export function isPickable(day: string, today: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= today;
}

export type DayKind = 'today' | 'yesterday' | 'other';

export function dayKind(day: string, today: string): DayKind {
  return day === today ? 'today' : day === yesterdayOf(today) ? 'yesterday' : 'other';
}

/** What the time and measure fields hold as typed: native times and whole-number text. */
export interface MeasureDraft {
  /** The trip's start time, read from the trip (not typed on the end page), for the "end equal to start" check. */
  start: string;
  end: string;
  kilograms: string;
  kilometres: string;
}

const MAX_KILOGRAMS = 99_999;
const MAX_KILOMETRES = 9_999;

/** The fields that show a message when they are wrong. */
export type MeasureField = 'end' | 'kilograms' | 'kilometres';
export type MeasureProblem = 'equal' | 'format' | 'max';

export const isTime = (value: string) => /^\d{2}:\d{2}$/.test(value);

function wholeNumber(value: string, max: number): number | 'format' | 'max' {
  const number = /^\d+$/.test(value) ? Number(value) : 0;
  return number < 1 ? 'format' : number > max ? 'max' : number;
}

/** The fields of the draft that are wrong, with what is wrong; a field left empty is only missing. */
export function measureProblems(
  asks: TripEndAsks,
  draft: MeasureDraft,
): Partial<Record<MeasureField, MeasureProblem>> {
  const problems: Partial<Record<MeasureField, MeasureProblem>> = {};
  if (isTime(draft.end) && draft.end === draft.start) {
    problems.end = 'equal';
  }
  if (asks === 'Kilograms') {
    const kilograms = wholeNumber(draft.kilograms, MAX_KILOGRAMS);
    if (typeof kilograms === 'string') {
      problems.kilograms = kilograms;
    }
  }
  if (asks === 'Kilometres') {
    const kilometres = wholeNumber(draft.kilometres, MAX_KILOMETRES);
    if (typeof kilometres === 'string') {
      problems.kilometres = kilometres;
    }
  }
  return problems;
}

/**
 * The text key, under `driver.duration.`, that says a duration of `minutes` in hours and minutes: one
 * or more of each, the part that is zero left out ("1 ora", "45 minuti", "2 ore e 1 minuto").
 */
export function durationKey(minutes: number): string {
  const part = (count: number, unit: 'h' | 'm') =>
    count === 0 ? '' : `${unit}${count === 1 ? '1' : 'N'}`;
  return `driver.duration.${part(Math.floor(minutes / 60), 'h')}${part(minutes % 60, 'm')}`;
}

/** Minutes from `start` to `end`, both `HH:mm`; an end earlier than the start is the next day. */
export function durationMinutes(start: string, end: string): number {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return (minutes(end) - minutes(start) + 24 * 60) % (24 * 60);
}

/** A trip that has started: its day and start time. */
interface StartedTrip {
  day: string | null;
  start: string | null;
}

/** The start of a trip on the device's clock, for display and the 24 hours only; null before it starts. */
export function startedAt(trip: StartedTrip): Date | null {
  return trip.day && trip.start ? new Date(`${trip.day}T${trip.start.slice(0, 5)}:00`) : null;
}

const HOURS_24 = 24 * 60 * 60 * 1000;

/** The trip started 24 hours ago or more: it can only be ended at a typed time. */
export function isOverdue(trip: StartedTrip, now: Date): boolean {
  const start = startedAt(trip);
  return start !== null && now.getTime() - start.getTime() >= HOURS_24;
}

/** The text and its parameter that say when a planned trip expires, under `prefix` (`driver.…expires`). */
export function expiryText(
  prefix: string,
  days: number,
): { key: string; params: { days: number } } {
  const key = days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'days';
  return { key: `${prefix}.${key}`, params: { days } };
}

/** "<pickup> → <delivery>", "→ <delivery>" or "<pickup> →"; null with no location. */
export function placesOf(trip: {
  pickup: { name: string } | null;
  delivery: { name: string } | null;
}): string | null {
  const pickup = trip.pickup?.name;
  const delivery = trip.delivery?.name;
  if (pickup && delivery) {
    return `${pickup} → ${delivery}`;
  }
  return delivery ? `→ ${delivery}` : pickup ? `${pickup} →` : null;
}
