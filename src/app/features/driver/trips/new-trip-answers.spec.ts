import {
  EMPTY_ANSWERS,
  LocationsAnswer,
  NewTripAnswers,
  TripCustomer,
  TripLocation,
  TripQuestions,
  TripVehicle,
  QUESTIONS,
  QuestionNumber,
  RepeatableTrip,
  applyAnswer,
  applyCheck,
  addRequest,
  applyRepeat,
  isAnswered,
  isComplete,
  locationLines,
  locationsOptional,
  openQuestion,
  tractorAwaitingTrailer,
  vehicleLines,
} from './new-trip-answers';

const vehicle = (id: string, kind: TripVehicle['kind'], requiresTrailer = false): TripVehicle => ({
  id,
  kind,
  requiresTrailer,
  licensePlate: id.toUpperCase(),
  description: `Mezzo ${id}`,
});
const location = (id: string): TripLocation => ({ id, name: `Luogo ${id}`, municipality: 'Penne' });
const customer = (id: string): TripCustomer => ({
  id,
  companyName: `Cliente ${id}`,
  vatNumber: null,
});

const TRACTOR = vehicle('t1', 'Tractor', true);
const TRAILER = vehicle('r1', 'Trailer');
const STANDALONE = vehicle('s1', 'StandaloneVehicle');
const A = location('a');
const B = location('b');
const C = location('c');

const pair = (pickup: TripLocation, delivery: TripLocation): TripQuestions => ({
  locationsAsked: 'Both',
  places: [{ pickup, delivery }],
  lastPlace: null,
});
const full = (questions: TripQuestions): NewTripAnswers => ({
  vehicle: STANDALONE,
  trailer: null,
  customer: customer('c1'),
  locations: { pickup: A, delivery: B },
  questions,
});

describe('new-trip-answers', () => {
  describe('applyAnswer', () => {
    it.each<[string, TripQuestions, boolean]>([
      ['are kept when the new places still hold the pair', pair(A, B), true],
      ['are emptied when the pair is no longer offered', pair(A, C), false],
      [
        'are emptied when another side is asked',
        { ...pair(A, B), locationsAsked: 'Delivery', places: [{ pickup: null, delivery: B }] },
        false,
      ],
      [
        'are emptied when the contract asks for none',
        { ...pair(A, B), locationsAsked: 'None', places: [] },
        false,
      ],
    ])('another customer: the locations %s', (_name, after, kept) => {
      const before = full(pair(A, B));

      const next = applyAnswer(before, {
        kind: 'customer',
        customer: customer('c2'),
        questions: after,
      });

      expect(next.customer?.id).toBe('c2');
      expect(next.locations).toEqual(kept ? before.locations : null);
    });

    it('a pickup-only contract keeps a pickup that is still offered, with its optional delivery', () => {
      const questions: TripQuestions = {
        locationsAsked: 'Pickup',
        places: [{ pickup: A, delivery: null }],
        lastPlace: null,
      };
      const before: NewTripAnswers = {
        ...full(questions),
        locations: { pickup: A, delivery: C },
      };

      const kept = applyAnswer(before, { kind: 'customer', customer: customer('c2'), questions });
      const lost = applyAnswer(before, {
        kind: 'customer',
        customer: customer('c2'),
        questions: { ...questions, places: [{ pickup: B, delivery: null }] },
      });

      expect(kept.locations).toEqual({ pickup: A, delivery: C });
      expect(lost.locations).toBeNull();
    });

    it('a customer whose contract is not known empties what depends on the contract', () => {
      const before = full(pair(A, B));

      const next = applyAnswer(before, {
        kind: 'customer',
        customer: customer('c2'),
        questions: null,
      });

      expect(next.customer?.id).toBe('c2');
      expect(next.locations).toBeNull();
    });

    it('another customer whose contract asks other locations empties them and keeps the vehicle', () => {
      const before = full(pair(A, B));

      const next = applyAnswer(before, {
        kind: 'customer',
        customer: customer('c2'),
        questions: {
          ...pair(A, B),
          locationsAsked: 'Delivery',
          places: [{ pickup: null, delivery: B }],
        },
      });

      expect(next.locations).toBeNull();
      expect(next.vehicle).toBe(before.vehicle);
    });

    it('a customer without a contract today is emptied with the locations, and the vehicle stays', () => {
      const before = full(pair(A, B));

      const next = applyAnswer(before, { kind: 'noContract' });

      expect(next.customer).toBeNull();
      expect(next.locations).toBeNull();
      expect(next.questions).toBeNull();
      expect(next.vehicle).toBe(before.vehicle);
      expect(isAnswered(next, 2)).toBe(false);
    });

    it('a tractor in place of a standalone vehicle asks the trailer and touches nothing else', () => {
      const before = full(pair(A, B));

      const next = applyAnswer(before, { kind: 'vehicle', vehicle: TRACTOR, trailer: null });

      expect(next.vehicle).toBe(TRACTOR);
      expect(isAnswered(next, 1)).toBe(false);
      expect({ ...next, vehicle: null }).toEqual({ ...before, vehicle: null });
    });

    it('a standalone vehicle in place of a tractor drops the trailer; a tractor keeps the one it is given', () => {
      const tractor = applyAnswer(EMPTY_ANSWERS, {
        kind: 'vehicle',
        vehicle: TRACTOR,
        trailer: TRAILER,
      });
      const standalone = applyAnswer(tractor, {
        kind: 'vehicle',
        vehicle: STANDALONE,
        trailer: TRAILER,
      });

      expect(tractor.trailer).toBe(TRAILER);
      expect(standalone.trailer).toBeNull();
      expect(isAnswered(standalone, 1)).toBe(true);
    });
  });

  describe('openQuestion', () => {
    it('the three questions are vehicle, customer, locations: the first unanswered is open, the one being modified when there is one, none when all are answered', () => {
      const withVehicle = applyAnswer(EMPTY_ANSWERS, {
        kind: 'vehicle',
        vehicle: STANDALONE,
        trailer: null,
      });
      const withCustomer = applyAnswer(withVehicle, {
        kind: 'customer',
        customer: customer('c1'),
        questions: pair(A, B),
      });

      expect(QUESTIONS).toEqual([1, 2, 3]);
      expect(openQuestion(EMPTY_ANSWERS, null)).toBe(1);
      expect(openQuestion(EMPTY_ANSWERS, 3)).toBe(3);
      expect(openQuestion(withVehicle, null)).toBe(2);
      expect(openQuestion(withCustomer, null)).toBe(3);
      expect(openQuestion(full(pair(A, B)), null)).toBeNull();
      expect(isComplete(full(pair(A, B)))).toBe(true);
      expect(isComplete(withCustomer)).toBe(false);
    });

    it('a tractor that requires a trailer with none keeps question 1 open; one that does not is answered', () => {
      const without = applyAnswer(EMPTY_ANSWERS, {
        kind: 'vehicle',
        vehicle: TRACTOR,
        trailer: null,
      });
      const optional = applyAnswer(EMPTY_ANSWERS, {
        kind: 'vehicle',
        vehicle: vehicle('t2', 'Tractor'),
        trailer: null,
      });

      expect(openQuestion(without, null)).toBe(1);
      expect(openQuestion(optional, null)).toBe(2);
    });
  });

  describe('vehicleLines', () => {
    it('lists the leading vehicle, then the trailer', () => {
      const answers = applyAnswer(EMPTY_ANSWERS, {
        kind: 'vehicle',
        vehicle: TRACTOR,
        trailer: TRAILER,
      });

      expect(vehicleLines(answers)).toEqual([
        { plate: 'T1', description: 'Mezzo t1' },
        { plate: 'R1', description: 'Mezzo r1' },
      ]);
    });
  });

  describe('locationLines', () => {
    it.each<[string, LocationsAnswer | null, { prefix: string | null; place: string }[]]>([
      [
        'a pair is "<name>, <municipality>" then "-> <name>, <municipality>"',
        { pickup: A, delivery: B },
        [
          { prefix: null, place: 'Luogo a, Penne' },
          { prefix: 'arrow', place: 'Luogo b, Penne' },
        ],
      ],
      [
        'a delivery alone is told as the delivery',
        { pickup: null, delivery: B },
        [{ prefix: 'delivery', place: 'Luogo b, Penne' }],
      ],
      [
        'a pickup alone is told as the pickup',
        { pickup: A, delivery: null },
        [{ prefix: 'pickup', place: 'Luogo a, Penne' }],
      ],
      ['skipped places have no line', { pickup: null, delivery: null }, []],
      ['no answer has no line', null, []],
    ])('%s', (_name, locations, lines) => {
      expect(locationLines(locations)).toEqual(lines);
    });

    it('the locations are optional unless the contract asks for both', () => {
      expect(locationsOptional(full(pair(A, B)))).toBe(false);
      expect(locationsOptional(full({ ...pair(A, B), locationsAsked: 'Delivery' }))).toBe(true);
      expect(locationsOptional(full({ ...pair(A, B), locationsAsked: 'None' }))).toBe(true);
    });
  });

  describe('tractorAwaitingTrailer', () => {
    const answered = (vehicle: TripVehicle, trailer: TripVehicle | null) =>
      applyAnswer(EMPTY_ANSWERS, { kind: 'vehicle', vehicle, trailer });

    it('names a tractor that requires a trailer and has none, and nothing else', () => {
      expect(tractorAwaitingTrailer(answered(TRACTOR, null))).toBe(TRACTOR);
      expect(tractorAwaitingTrailer(answered(TRACTOR, TRAILER))).toBeNull();
      expect(tractorAwaitingTrailer(answered(vehicle('t2', 'Tractor'), null))).toBeNull();
      expect(tractorAwaitingTrailer(answered(STANDALONE, null))).toBeNull();
      expect(tractorAwaitingTrailer(EMPTY_ANSWERS)).toBeNull();
    });
  });

  describe('addRequest', () => {
    it('sends the ids of the answers, with no driver, no day and no amount', () => {
      const request = addRequest(full(pair(A, B)));

      expect(request).toEqual({
        vehicleId: 's1',
        trailerId: null,
        customerId: 'c1',
        pickupLocationId: 'a',
        deliveryLocationId: 'b',
      });
      expect(Object.keys(request!).join(' ')).not.toMatch(/driver|day|amount|price|total|start/i);
    });

    it('sends the trailer, and no location the driver skipped', () => {
      const request = addRequest({
        ...full(pair(A, B)),
        vehicle: TRACTOR,
        trailer: TRAILER,
        locations: { pickup: null, delivery: null },
      });

      expect(request).toMatchObject({
        vehicleId: 't1',
        trailerId: 'r1',
        pickupLocationId: null,
        deliveryLocationId: null,
      });
    });

    it('is nothing while a question is not answered', () => {
      expect(addRequest({ ...full(pair(A, B)), locations: null })).toBeNull();
      expect(addRequest({ ...full(pair(A, B)), vehicle: TRACTOR })).toBeNull();
    });
  });

  describe('applyCheck', () => {
    const ALL = { vehicle: true, trailer: true, customer: true, pickup: true, delivery: true };
    const before = (): NewTripAnswers => ({
      ...full(pair(A, B)),
      vehicle: TRACTOR,
      trailer: TRAILER,
    });

    it('when everything holds nothing is emptied and none is first', () => {
      const answers = before();

      const result = applyCheck(answers, ALL, pair(A, B));

      expect(result.answers).toEqual(answers);
      expect(result.first).toBeNull();
    });

    it('a vehicle that no longer holds is emptied with its trailer, and is the first', () => {
      const result = applyCheck(before(), { ...ALL, vehicle: false }, pair(A, B));

      expect(result.answers.vehicle).toBeNull();
      expect(result.answers.trailer).toBeNull();
      expect(result.answers.customer?.id).toBe('c1');
      expect(result.answers.locations).not.toBeNull();
      expect(result.first).toBe(1);
    });

    it('a trailer that no longer holds is emptied alone and question 1 is the first', () => {
      const result = applyCheck(before(), { ...ALL, trailer: false }, pair(A, B));

      expect(result.answers.vehicle).toEqual(TRACTOR);
      expect(result.answers.trailer).toBeNull();
      expect(result.first).toBe(1);
    });

    it('a customer without a contract is emptied with the locations, and is the first', () => {
      const result = applyCheck(before(), { ...ALL, customer: false }, null);

      expect(result.answers.customer).toBeNull();
      expect(result.answers.locations).toBeNull();
      expect(result.answers.questions).toBeNull();
      expect(result.answers.vehicle).toEqual(TRACTOR);
      expect(result.first).toBe(2);
    });

    it('a customer that holds but whose contract can no longer be read counts as without a contract', () => {
      const result = applyCheck(before(), ALL, null);

      expect(result.answers.customer).toBeNull();
      expect(result.first).toBe(2);
    });

    it.each<[string, Partial<typeof ALL>]>([
      ['pickup', { pickup: false }],
      ['delivery', { delivery: false }],
    ])(
      'a %s that no longer holds empties the locations alone and question 3 is the first',
      (_name, check) => {
        const result = applyCheck(before(), { ...ALL, ...check }, pair(A, B));

        expect(result.answers.locations).toBeNull();
        expect(result.answers.customer?.id).toBe('c1');
        expect(result.first).toBe(3);
      },
    );

    it.each<[string, TripQuestions]>([
      ['asks both sides now', pair(A, B)],
      ['no longer offers the pair', { ...pair(A, B), places: [{ pickup: A, delivery: C }] }],
      [
        'asks the pickup alone and no longer rates it',
        { ...pair(A, B), locationsAsked: 'Pickup', places: [{ pickup: C, delivery: null }] },
      ],
    ])(
      'locations that do not hold under a contract that %s are emptied and question 3 is the first',
      (_name, contract) => {
        const delivery: TripQuestions = {
          ...pair(A, B),
          locationsAsked: 'Delivery',
          places: [{ pickup: null, delivery: B }],
        };
        const answers = {
          ...before(),
          locations: { pickup: null, delivery: B },
          questions: delivery,
        };

        const result = applyCheck(answers, ALL, contract);

        expect(result.answers.locations).toBeNull();
        expect(result.first).toBe(3);
      },
    );

    it('of several answers emptied, the first by question is reported', () => {
      const result = applyCheck(before(), { ...ALL, pickup: false, customer: false }, null);

      expect(result.first).toBe(2);
      expect(result.answers.locations).toBeNull();
    });
  });

  describe('repeating a trip', () => {
    const ALL = { vehicle: true, trailer: true, customer: true, pickup: true, delivery: true };
    const TRIP = {
      vehicle: TRACTOR,
      trailer: TRAILER,
      customer: customer('c1'),
      pickup: A,
      delivery: B,
    };
    it('everything that holds is answered, so the three answers are filled', () => {
      const answers = applyRepeat(TRIP, ALL, pair(A, B));

      expect(answers).toEqual({
        vehicle: TRACTOR,
        trailer: TRAILER,
        customer: TRIP.customer,
        locations: { pickup: A, delivery: B },
        questions: pair(A, B),
      });
      expect(openQuestion(answers, null)).toBeNull();
    });

    it.each<[string, Partial<typeof ALL>, TripQuestions | null, QuestionNumber]>([
      ['a vehicle', { vehicle: false }, pair(A, B), 1],
      ['a trailer', { trailer: false }, pair(A, B), 1],
      ['a customer', { customer: false }, null, 2],
      ['a customer whose contract cannot be read', {}, null, 2],
      ['a pickup', { pickup: false }, pair(A, B), 3],
      ['a delivery', { delivery: false }, pair(A, B), 3],
      ['a pair the contract no longer offers', {}, pair(A, C), 3],
    ])(
      '%s that no longer holds is emptied and its question is the open one',
      (_name, check, questions, open) => {
        const answers = applyRepeat(TRIP, { ...ALL, ...check }, questions);

        expect(openQuestion(answers, null)).toBe(open);
      },
    );

    it('a vehicle that fails takes its trailer, a customer that fails takes the locations', () => {
      const vehicleGone = applyRepeat(TRIP, { ...ALL, vehicle: false }, pair(A, B));
      const customerGone = applyRepeat(TRIP, { ...ALL, customer: false }, null);

      expect([vehicleGone.vehicle, vehicleGone.trailer]).toEqual([null, null]);
      expect(vehicleGone.customer).toEqual(TRIP.customer);
      expect(customerGone.customer).toBeNull();
      expect(customerGone.locations).toBeNull();
      expect(customerGone.vehicle).toEqual(TRACTOR);
    });

    it('a tractor that requires a trailer, repeated without one, keeps question 1 open', () => {
      const answers = applyRepeat({ ...TRIP, trailer: null }, ALL, pair(A, B));

      expect(answers.vehicle).toEqual(TRACTOR);
      expect(tractorAwaitingTrailer(answers)).toEqual(TRACTOR);
      expect(openQuestion(answers, null)).toBe(1);
    });

    it('a trip without locations on a flat-rate contract keeps them as none', () => {
      const flat: TripQuestions = { ...pair(A, B), locationsAsked: 'None', places: [] };

      const answers = applyRepeat(
        { ...TRIP, vehicle: STANDALONE, trailer: null, pickup: null, delivery: null },
        ALL,
        flat,
      );

      expect(answers.locations).toEqual({ pickup: null, delivery: null });
      expect(openQuestion(answers, null)).toBeNull();
    });

    const asks = (
      locationsAsked: TripQuestions['locationsAsked'],
      places: TripQuestions['places'],
    ) => ({ ...pair(A, B), locationsAsked, places }) as TripQuestions;

    it.each<[string, Partial<RepeatableTrip>, TripQuestions, unknown]>([
      ['a delivery-only trip on a contract per pair', { pickup: null }, pair(A, B), null],
      [
        'a pair on a contract per pickup that rates its pickup',
        {},
        asks('Pickup', [{ pickup: A, delivery: null }]),
        { pickup: A, delivery: B },
      ],
      [
        'a pair on a contract per pickup that no longer rates its pickup',
        {},
        asks('Pickup', [{ pickup: C, delivery: null }]),
        null,
      ],
      [
        'a pair on a contract per delivery that rates its delivery',
        {},
        asks('Delivery', [{ pickup: null, delivery: B }]),
        { pickup: A, delivery: B },
      ],
      ['a pair that is no longer among the places', {}, pair(A, C), null],
      ['a pair on a contract that asks none', {}, asks('None', []), { pickup: A, delivery: B }],
      [
        'a pickup-only trip on a contract per delivery',
        { delivery: null },
        asks('Delivery', [{ pickup: null, delivery: B }]),
        null,
      ],
    ])(
      '%s keeps the locations only when they hold under what the contract asks',
      (_name, change, questions, expected) => {
        const answers = applyRepeat({ ...TRIP, ...change }, ALL, questions);

        expect(answers.locations).toEqual(expected);
        if (expected === null) {
          expect(openQuestion(answers, null)).toBe(3);
        }
      },
    );
  });
});
