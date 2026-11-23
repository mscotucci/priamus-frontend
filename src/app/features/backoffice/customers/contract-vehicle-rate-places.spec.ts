import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { sortVehicleRates } from './contract-labels';
import type { RatedLocation } from './contract-location-rates';
import type { Minimum, Rate } from './contract-rate';
import {
  joinPlace,
  leavePlace,
  mergeVehicleRates,
  movePlace,
  placesLine,
  vehicleCount,
  vehicleRateAnswersOf,
  vehicleRateRequestsOf,
} from './contract-vehicle-rate-places';
import type { RatedPlace, VehicleRateAnswer } from './contract-vehicle-rates';
import type { ContractVehicleRate } from './contracts-api';

const location = (id: string, name: string, deactivated = false): RatedLocation => ({
  id,
  name,
  municipality: 'Brescia',
  deactivated,
});

const A = location('a', 'Alfa');
const B = location('b', 'Beta');
const C = location('c', 'Gamma');
const D = location('d', 'Delta', true);

const at = (pickup: RatedLocation): RatedPlace => ({ pickup, delivery: null });
const pair = (pickup: RatedLocation, delivery: RatedLocation): RatedPlace => ({
  pickup,
  delivery,
});

const RATE: Rate = { day: 55, night: null, callFee: null };
const FIXED_120: Minimum = { kind: 'FixedMinimum', amount: 120, threshold: null, overage: null };

const answer = (
  vehicleId: string,
  places: RatedPlace[],
  overrides: Partial<VehicleRateAnswer> = {},
): VehicleRateAnswer => ({
  vehicleId,
  licensePlate: vehicleId.toUpperCase(),
  description: 'Autospurgo',
  decommissioned: false,
  rate: RATE,
  minimum: FIXED_120,
  places,
  ...overrides,
});

const item = (
  vehicleId: string,
  pickup: RatedLocation | null,
  delivery: RatedLocation | null,
  overrides: Partial<ContractVehicleRate> = {},
): ContractVehicleRate => {
  const side = (entry: RatedLocation | null) =>
    entry === null
      ? null
      : {
          id: entry.id,
          name: entry.name,
          municipality: entry.municipality,
          status: entry.deactivated ? ('Deactivated' as const) : ('Active' as const),
        };
  return {
    vehicleId,
    licensePlate: vehicleId.toUpperCase(),
    description: 'Autospurgo',
    vehicleStatus: 'Active',
    pickup: side(pickup),
    delivery: side(delivery),
    dayPrice: 55,
    nightPrice: null,
    nightCallFee: null,
    minimumRule: 'FixedMinimum',
    minimumAmount: 120,
    minimumThreshold: null,
    minimumOveragePrice: null,
    ...overrides,
  } as ContractVehicleRate;
};

const keys = (list: readonly VehicleRateAnswer[]) =>
  list.map((entry) => [entry.vehicleId, entry.places.map((place) => place.pickup?.id)]);

describe('contract vehicle rate places', () => {
  const translate = () => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    const service = TestBed.inject(TranslateService);
    service.use('it');
    return service;
  };

  describe('vehicleRateAnswersOf', () => {
    it('reads the items of a vehicle with equal prices and minimum as one answer with all their places', () => {
      const answers = vehicleRateAnswersOf(
        [item('v1', A, null), item('v1', B, null), item('v1', C, null, { dayPrice: 60 })],
        'PerPickupLocation',
        'ByDistance',
      );

      expect(keys(answers)).toEqual([
        ['v1', ['a', 'b']],
        ['v1', ['c']],
      ]);
      expect(answers[1].rate.day).toBe(60);
    });

    it('a minimum of 120 equals another of 120 by value, and null equals null', () => {
      const same = vehicleRateAnswersOf(
        [
          item('v1', A, null),
          item('v1', B, null),
          item('v2', A, null, { minimumRule: null, minimumAmount: null }),
          item('v2', B, null, { minimumRule: null, minimumAmount: null }),
        ],
        'PerPickupLocation',
        'ByDistance',
      );
      const different = vehicleRateAnswersOf(
        [item('v1', A, null), item('v1', B, null, { minimumAmount: 130 })],
        'PerPickupLocation',
        'ByDistance',
      );

      expect(keys(same)).toEqual([
        ['v1', ['a', 'b']],
        ['v2', ['a', 'b']],
      ]);
      expect(different).toHaveLength(2);
    });

    it('keeps one answer per item with no places on a flat-rate contract, and no minimum under a trip price', () => {
      const answers = vehicleRateAnswersOf(
        [item('v1', null, null), item('v2', null, null, { vehicleStatus: 'Decommissioned' })],
        'FlatRate',
        'ByTrip',
      );

      expect(answers.map((entry) => entry.places)).toEqual([[], []]);
      expect(answers.map((entry) => entry.minimum)).toEqual([null, null]);
      expect(answers[1].decommissioned).toBe(true);
    });

    it('carries the deactivated mark of each side of a pair', () => {
      const [read] = vehicleRateAnswersOf([item('v1', A, D)], 'PerLocationPair', 'ByDistance');

      expect(read.places[0].pickup?.deactivated).toBe(false);
      expect(read.places[0].delivery?.deactivated).toBe(true);
    });
  });

  describe('vehicleRateRequestsOf', () => {
    it('writes one item per place with its location ids', () => {
      const requests = vehicleRateRequestsOf([answer('v1', [pair(A, B), pair(A, C)])]);

      expect(
        requests.map((request) => [request.pickupLocationId, request.deliveryLocationId]),
      ).toEqual([
        ['a', 'b'],
        ['a', 'c'],
      ]);
      expect(requests[0]).toMatchObject({ vehicleId: 'v1', dayPrice: 55, minimumAmount: 120 });
    });

    it('writes one item with null locations for an answer without places', () => {
      const requests = vehicleRateRequestsOf([answer('v1', [])]);

      expect(requests).toHaveLength(1);
      expect(requests[0]).toMatchObject({ pickupLocationId: null, deliveryLocationId: null });
    });
  });

  describe('mergeVehicleRates', () => {
    it('merges the answers of a vehicle with equal rates into one with the places of both', () => {
      const merged = mergeVehicleRates([
        answer('v1', [at(A)]),
        answer('v2', [at(A)]),
        answer('v1', [at(B)], { minimum: { ...FIXED_120 } }),
        answer('v1', [at(C)], { rate: { ...RATE, day: 60 } }),
      ]);

      expect(keys(merged)).toEqual([
        ['v1', ['a', 'b']],
        ['v2', ['a']],
        ['v1', ['c']],
      ]);
    });
  });

  it('counts the distinct vehicles, not the rows', () => {
    expect(
      vehicleCount([answer('v1', [at(A)]), answer('v1', [at(B)]), answer('v2', [at(A)])]),
    ).toBe(2);
  });

  describe('joinPlace, leavePlace and movePlace', () => {
    const list = () => [
      answer('v1', [at(A), at(B)]),
      answer('v2', [at(B)]),
      answer('v3', [at(A)]),
    ];

    it('joining copies the membership of the duplicated place, once', () => {
      const joined = joinPlace(joinPlace(list(), at(A), at(C)), at(A), at(C));

      expect(keys(joined)).toEqual([
        ['v1', ['a', 'b', 'c']],
        ['v2', ['b']],
        ['v3', ['a', 'c']],
      ]);
    });

    it('leaving drops the place from every answer and the answers left without places', () => {
      expect(keys(leavePlace(list(), at(A)))).toEqual([
        ['v1', ['b']],
        ['v2', ['b']],
      ]);
      expect(keys(leavePlace(list(), at(B)))).toEqual([
        ['v1', ['a']],
        ['v3', ['a']],
      ]);
    });

    it('moving carries the vehicle rates of the old place to the new one', () => {
      expect(keys(movePlace(list(), at(A), at(C)))).toEqual([
        ['v1', ['c', 'b']],
        ['v2', ['b']],
        ['v3', ['c']],
      ]);
    });

    it('a pair is told by both of its locations', () => {
      const pairs = [answer('v1', [pair(A, B), pair(B, A)])];

      expect(leavePlace(pairs, pair(A, B))[0].places).toEqual([pair(B, A)]);
    });

    it('does not change the list it is given', () => {
      const given = list();
      joinPlace(given, at(A), at(C));
      leavePlace(given, at(A));
      movePlace(given, at(A), at(C));

      expect(keys(given)).toEqual(keys(list()));
    });
  });

  describe('placesLine', () => {
    it('tells the places of an answer given unsorted, sorted, with the count and the total', () => {
      const line = placesLine(
        answer('v1', [at(C), at(A), at(B)]),
        4,
        'PerPickupLocation',
        translate(),
      );

      expect(line.lead).toBe('Vale in 3 luoghi su 4:');
      expect(line.parts.map((part) => part.label)).toEqual([
        'Alfa, Brescia',
        'Beta, Brescia',
        'Gamma, Brescia',
      ]);
    });

    it('tells one place as "1 luogo su <m>"', () => {
      const line = placesLine(answer('v1', [at(A)]), 4, 'PerDeliveryLocation', translate());

      expect(line.lead).toBe('Vale in 1 luogo su 4:');
      expect(line.parts).toHaveLength(1);
    });

    it('tells every place as "tutti i <m> luoghi", listing none', () => {
      const line = placesLine(answer('v1', [at(A), at(B)]), 2, 'PerPickupLocation', translate());

      expect(line).toEqual({ lead: 'Vale in tutti i 2 luoghi', parts: [] });
    });

    it('tells the pair forms', () => {
      const service = translate();

      expect(
        placesLine(answer('v1', [pair(A, B), pair(B, C)]), 3, 'PerLocationPair', service).lead,
      ).toBe('Vale in 2 coppie su 3:');
      expect(placesLine(answer('v1', [pair(A, B)]), 3, 'PerLocationPair', service).lead).toBe(
        'Vale in 1 coppia su 3:',
      );
      expect(
        placesLine(
          answer('v1', [pair(A, B), pair(B, C), pair(C, A)]),
          3,
          'PerLocationPair',
          service,
        ),
      ).toEqual({ lead: 'Vale in tutte le 3 coppie', parts: [] });
    });

    it('a contract with one place tells "1 luogo su 1" and its name, not "tutti i 1 luoghi"', () => {
      const line = placesLine(answer('v1', [at(A)]), 1, 'PerPickupLocation', translate());

      expect(line.lead).toBe('Vale in 1 luogo su 1:');
      expect(line.parts.map((part) => part.label)).toEqual(['Alfa, Brescia']);
    });

    it('a pair with one location deactivated shows the pill "Disattivato"', () => {
      const line = placesLine(
        answer('v1', [pair(A, B), pair(A, D)]),
        3,
        'PerLocationPair',
        translate(),
      );

      expect(line.parts.map((part) => [part.label, part.pill?.key ?? null])).toEqual([
        ['Alfa, Brescia → Beta, Brescia', null],
        ['Alfa, Brescia → Delta, Brescia', 'contracts.form.locationRates.deactivated'],
      ]);
    });

    it('starts the lead in lower case for the answer box', () => {
      const line = placesLine(answer('v1', [at(A)]), 4, 'PerPickupLocation', translate(), true);

      expect(line.lead).toBe('vale in 1 luogo su 4:');
    });
  });

  describe('sortVehicleRates', () => {
    it('sorts by plate, then by the first place, and sorts the places of each answer', () => {
      const sorted = sortVehicleRates([
        answer('v2', [at(A)]),
        answer('v1', [at(C), at(B)]),
        answer('v1', [at(A)], { rate: { ...RATE, day: 60 } }),
      ]);

      expect(keys(sorted)).toEqual([
        ['v1', ['a']],
        ['v1', ['b', 'c']],
        ['v2', ['a']],
      ]);
    });
  });
});
