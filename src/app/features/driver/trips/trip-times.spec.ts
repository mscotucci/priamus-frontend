import {
  MeasureDraft,
  dayKind,
  dayOf,
  durationKey,
  durationMinutes,
  expiryText,
  isOverdue,
  isPickable,
  measureProblems,
  startedAt,
  yesterdayOf,
} from './trip-times';

describe('trip-times', () => {
  describe('days', () => {
    it('yesterday crosses a month and a year; today, yesterday and another day are told apart', () => {
      expect(yesterdayOf('2026-03-01')).toBe('2026-02-28');
      expect(yesterdayOf('2026-01-01')).toBe('2025-12-31');
      expect(dayOf(new Date(2026, 10, 3))).toBe('2026-11-03');
      expect(dayKind('2026-11-23', '2026-11-23')).toBe('today');
      expect(dayKind('2026-11-22', '2026-11-23')).toBe('yesterday');
      expect(dayKind('2026-11-01', '2026-11-23')).toBe('other');
    });

    it('a past day and today can be picked, a future day or a malformed one never', () => {
      expect(isPickable('2026-11-23', '2026-11-23')).toBe(true);
      expect(isPickable('2025-01-01', '2026-11-23')).toBe(true);
      expect(isPickable('2026-11-24', '2026-11-23')).toBe(false);
      expect(isPickable('', '2026-11-23')).toBe(false);
    });
  });

  describe('the start and the 24 hours', () => {
    it('the start is the day and the time cut to the minute, null before the trip starts', () => {
      expect(startedAt({ day: '2026-11-23', start: '07:30:45' })).toEqual(
        new Date(2026, 10, 23, 7, 30),
      );
      expect(startedAt({ day: null, start: null })).toBeNull();
    });

    it.each([
      [new Date(2026, 10, 24, 7, 29), false],
      [new Date(2026, 10, 24, 7, 30), true],
      [new Date(2026, 10, 25, 12, 0), true],
    ])('a trip started on 2026-11-23 at 07:30 is overdue at %s: %s', (now, overdue) => {
      expect(isOverdue({ day: '2026-11-23', start: '07:30:00' }, now)).toBe(overdue);
    });

    it('a trip that has not started is never overdue', () => {
      expect(isOverdue({ day: null, start: null }, new Date(2030, 0, 1))).toBe(false);
    });
  });

  describe('expiry', () => {
    it.each([
      [0, 'today'],
      [1, 'tomorrow'],
      [2, 'days'],
      [6, 'days'],
    ])('%i days to expiry is said by the key ending in %s', (days, key) => {
      expect(expiryText('driver.x.expires', days)).toEqual({
        key: `driver.x.expires.${key}`,
        params: { days },
      });
    });
  });

  describe('durations', () => {
    it.each([
      ['07:30', '10:45', 195],
      ['22:00', '02:30', 270],
      ['23:59', '00:00', 1],
      ['00:00', '23:59', 1439],
    ])(
      'the duration from %s to %s is %i minutes, an earlier end being the next day',
      (start, end, minutes) => {
        expect(durationMinutes(start, end)).toBe(minutes);
      },
    );

    it.each([
      [60, 'h1'],
      [120, 'hN'],
      [1, 'm1'],
      [45, 'mN'],
      [61, 'h1m1'],
      [90, 'h1mN'],
      [121, 'hNm1'],
      [195, 'hNmN'],
    ])(
      '%i minutes are said by driver.duration.%s, the part that is zero left out',
      (minutes, key) => {
        expect(durationKey(minutes)).toBe(`driver.duration.${key}`);
      },
    );
  });

  describe('measureProblems', () => {
    const draft = (fields: Partial<MeasureDraft>): MeasureDraft => ({
      start: '07:30',
      end: '',
      kilograms: '',
      kilometres: '',
      ...fields,
    });

    it.each<[string, 'Kilograms' | 'Kilometres', 'format' | 'max' | undefined]>([
      ['1', 'Kilograms', undefined],
      ['99999', 'Kilograms', undefined],
      ['100000', 'Kilograms', 'max'],
      ['0', 'Kilograms', 'format'],
      ['', 'Kilograms', 'format'],
      ['12,5', 'Kilograms', 'format'],
      ['12.5', 'Kilograms', 'format'],
      ['dodici', 'Kilograms', 'format'],
      ['1', 'Kilometres', undefined],
      ['9999', 'Kilometres', undefined],
      ['10000', 'Kilometres', 'max'],
      ['0', 'Kilometres', 'format'],
      ['85,5', 'Kilometres', 'format'],
    ])('"%s" by %s: %s', (value, asks, problem) => {
      const field = asks === 'Kilograms' ? 'kilograms' : 'kilometres';

      const problems = measureProblems(asks, draft({ [field]: value }));

      expect(problems[field]).toBe(problem);
    });

    it('an end equal to the start is a problem of the end, a missing one is not', () => {
      expect(measureProblems('Nothing', draft({ end: '07:30' })).end).toBe('equal');
      expect(measureProblems('Nothing', draft({ end: '' }))).toEqual({});
      expect(measureProblems('Nothing', draft({ end: '10:45' }))).toEqual({});
    });

    it('a measure the end does not ask is not checked', () => {
      expect(measureProblems('Nothing', draft({ kilograms: 'x', kilometres: '0' }))).toEqual({});
    });
  });
});
