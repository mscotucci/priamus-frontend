import type { TranslateService } from '@ngx-translate/core';
import {
  compareLocationRates,
  locationRateAnswerOf,
  locationRateLabel,
  rowKey,
  sortLocationRates,
} from './contract-labels';
import type { LocationRateLevel } from './contract-location-rates';
import { rateMembers, type Minimum, type Rate } from './contract-rate';
import type { RateRowPart } from './contract-rate-rows';
import type { RatedPlace, VehicleRateAnswer } from './contract-vehicle-rates';
import type {
  BillingLevel,
  ContractVehicleRate,
  ContractVehicleRateRequest,
  PricingMode,
} from './contracts-api';

const KEYS = 'contracts.form.vehicleRates.places';

/** The vehicle rates of a contract as answers: on a location level the items of a vehicle with equal prices and minimum are one answer. */
export function vehicleRateAnswersOf(
  items: readonly ContractVehicleRate[],
  level: BillingLevel,
  mode: PricingMode,
): VehicleRateAnswer[] {
  const answers = items.map((item) => {
    const { pickup, delivery, rate, minimum } = locationRateAnswerOf(item, mode);
    return {
      vehicleId: item.vehicleId,
      licensePlate: item.licensePlate,
      description: item.description,
      decommissioned: item.vehicleStatus === 'Decommissioned',
      rate,
      minimum,
      places: level === 'FlatRate' ? [] : [{ pickup, delivery }],
    };
  });
  return level === 'FlatRate' ? answers : mergeVehicleRates(answers);
}

/** The key of a row of question 8: the vehicle on a flat-rate contract, the vehicle and its first place on a location level. */
export const vehicleRateKey = (answer: VehicleRateAnswer): string =>
  answer.places.length === 0
    ? answer.vehicleId
    : `${answer.vehicleId}#${rowKey(sortLocationRates(answer.places)[0])}`;

/** The pill of a place with a deactivated location, else null. */
export const placePill = (place: RatedPlace) =>
  [place.pickup, place.delivery].some((side) => side?.deactivated)
    ? { key: 'contracts.form.locationRates.deactivated', tone: 'danger' as const }
    : null;

/** The items of a save request: one per place, with its location ids; one with no location for an answer without places. */
export const vehicleRateRequestsOf = (
  answers: readonly VehicleRateAnswer[],
): ContractVehicleRateRequest[] =>
  answers.flatMap((answer) =>
    (answer.places.length === 0 ? [{ pickup: null, delivery: null }] : answer.places).map(
      (place) => ({
        vehicleId: answer.vehicleId,
        pickupLocationId: place.pickup?.id ?? null,
        deliveryLocationId: place.delivery?.id ?? null,
        ...rateMembers(true, answer.rate, answer.minimum),
      }),
    ),
  );

const sameRate = (a: Rate, b: Rate) =>
  a.day === b.day && a.night === b.night && a.callFee === b.callFee;

const sameMinimum = (a: Minimum | null, b: Minimum | null) =>
  a === null || b === null
    ? a === b
    : a.kind === b.kind &&
      a.amount === b.amount &&
      a.threshold === b.threshold &&
      a.overage === b.overage;

/** Answers of one vehicle with the same prices and minimum become one, with the places of all; the first one's position is kept. */
export function mergeVehicleRates(answers: readonly VehicleRateAnswer[]): VehicleRateAnswer[] {
  const merged: VehicleRateAnswer[] = [];
  for (const answer of answers) {
    const at = merged.findIndex(
      (kept) =>
        kept.vehicleId === answer.vehicleId &&
        sameRate(kept.rate, answer.rate) &&
        sameMinimum(kept.minimum, answer.minimum),
    );
    if (at < 0) {
      merged.push({ ...answer, places: [...answer.places] });
    } else {
      merged[at] = { ...merged[at], places: [...merged[at].places, ...answer.places] };
    }
  }
  return merged;
}

/** The distinct vehicles of a list of answers. */
export const vehicleCount = (answers: readonly VehicleRateAnswer[]): number =>
  new Set(answers.map((answer) => answer.vehicleId)).size;

const hasPlace = (answer: VehicleRateAnswer, place: RatedPlace) =>
  answer.places.some((own) => rowKey(own) === rowKey(place));

/** Every answer that has `from` also gets `to`. */
export const joinPlace = (
  answers: readonly VehicleRateAnswer[],
  from: RatedPlace,
  to: RatedPlace,
): VehicleRateAnswer[] =>
  answers.map((answer) =>
    hasPlace(answer, from) && !hasPlace(answer, to)
      ? { ...answer, places: [...answer.places, to] }
      : answer,
  );

/** `place` leaves every answer; an answer left without places is dropped. */
export const leavePlace = (
  answers: readonly VehicleRateAnswer[],
  place: RatedPlace,
): VehicleRateAnswer[] =>
  answers.flatMap((answer) => {
    if (!hasPlace(answer, place)) {
      return [answer];
    }
    const places = answer.places.filter((own) => rowKey(own) !== rowKey(place));
    return places.length === 0 ? [] : [{ ...answer, places }];
  });

/** Every answer that has `from` has `to` in its stead. */
export const movePlace = (
  answers: readonly VehicleRateAnswer[],
  from: RatedPlace,
  to: RatedPlace,
): VehicleRateAnswer[] =>
  answers.map((answer) =>
    hasPlace(answer, from)
      ? {
          ...answer,
          places: answer.places.map((own) => (rowKey(own) === rowKey(from) ? to : own)),
        }
      : answer,
  );

/** The line of an answer among the `total` places of the contract: a lead and the places, none listed when it applies on all of them. */
export function placesLine(
  answer: Pick<VehicleRateAnswer, 'places'>,
  total: number,
  level: LocationRateLevel,
  translate: TranslateService,
  lowercase = false,
): { lead: string; parts: RateRowPart[] } {
  const kind = level === 'PerLocationPair' ? 'pair' : 'location';
  const count = answer.places.length;
  const all = count === total && total > 1;
  const lead = translate.instant(`${KEYS}.${kind}.${all ? 'all' : count === 1 ? 'one' : 'many'}`, {
    count,
    total,
  });
  const parts: RateRowPart[] = all
    ? []
    : [...answer.places].sort(compareLocationRates).map((place) => ({
        label: locationRateLabel(place),
        pill: placePill(place),
      }));
  return { lead: lowercase ? lead.charAt(0).toLowerCase() + lead.slice(1) : lead, parts };
}
