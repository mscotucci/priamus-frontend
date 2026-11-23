import { TranslateService } from '@ngx-translate/core';
import { LANGUAGE } from '../../../core/i18n/i18n';
import { Minimum, Rate, rateOfContract, unitKey } from './contract-rate';
import { locationLabel } from '../locations/location-label';
import type { LocationRateAnswer } from './contract-location-rates';
import type { VehicleRateAnswer } from './contract-vehicle-rates';
import {
  BillingLevel,
  Contract,
  ContractLocationRate,
  ContractStatus,
  PricingMode,
  RequiredDocument,
} from './contracts-api';

export const CONTRACT_STATUS_PILL: Record<ContractStatus, string> = {
  Current: 'pt-pill--success',
  Upcoming: 'pt-pill--info',
  Expired: '',
};

/** The required documents as a sentence, first letter uppercase; "Nessuno" when there are none. */
export function documentsSentence(
  documents: readonly RequiredDocument[],
  translate: TranslateService,
): string {
  if (documents.length === 0) {
    return translate.instant('customers.contracts.document.none');
  }
  const names = documents
    .map((document) => translate.instant('customers.contracts.document.' + document.toLowerCase()))
    .join(', ');
  return names.charAt(0).toUpperCase() + names.slice(1);
}

const format = (value: number, decimals: { min: number; max: number }): string =>
  new Intl.NumberFormat(LANGUAGE, {
    minimumFractionDigits: decimals.min,
    maximumFractionDigits: decimals.max,
  }).format(value);

/** An amount with 2 decimals and the locale's separator, as in "30,00". */
export const formatAmount = (value: number): string => format(value, { min: 2, max: 2 });

/** A duration in whole minutes as hours and minutes: "2 h 20 min", "3 h", "50 min". */
export function formatDuration(minutes: number, translate: TranslateService): string {
  const hour = translate.instant('contracts.form.unit.symbol.hour');
  const minute = translate.instant('contracts.form.unit.symbol.minute');
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest} ${minute}`;
  }
  return rest === 0 ? `${hours} ${hour}` : `${hours} ${hour} ${rest} ${minute}`;
}

/** Kilograms as tons, up to 3 decimals and none when whole: "12,3 ton", "12 ton", "12,345 ton". */
export const formatTons = (kilograms: number, translate: TranslateService): string =>
  `${format(kilograms / 1000, { min: 0, max: 3 })} ${translate.instant('contracts.form.unit.threshold.byweight')}`;

/** A whole number of kilometres with the locale's grouping: "120 km". */
export const formatKilometres = (kilometres: number, translate: TranslateService): string =>
  `${format(kilometres, { min: 0, max: 0 })} ${translate.instant('contracts.form.unit.threshold.bydistance')}`;

/** The ISO date (yyyy-mm-dd) of the day before the given ISO date. */
export function dayBefore(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

/** A threshold or a quantity: up to 2 decimals, none when whole, as in "4" or "4,5". */
const formatQuantity = (value: number): string => format(value, { min: 0, max: 2 });

/** "30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 €"; the day price only without the night. */
export function rateSummary(rate: Rate, mode: PricingMode, translate: TranslateService): string {
  const unit = translate.instant(unitKey('price', mode));
  const day = formatAmount(rate.day);
  return rate.night === null || rate.callFee === null
    ? translate.instant('contracts.form.rate.answer.day', { day, unit })
    : translate.instant('contracts.form.rate.answer.night', {
        day,
        unit,
        night: formatAmount(rate.night),
        callFee: formatAmount(rate.callFee),
      });
}

/**
 * The "Tariffa" column: "30,00 €/h", the day price with the unit of the pricing mode, or "3 luoghi" /
 * "1 coppia" on a location contract; null when the contract has no rate at all.
 */
export function rateColumnSummary(contract: Contract, translate: TranslateService): string | null {
  const count = contract.locationRates.length;
  if (count > 0) {
    return translate.instant(
      `customers.contracts.rateCount.${contract.billingLevel === 'PerLocationPair' ? 'pair' : 'location'}.${count === 1 ? 'one' : 'other'}`,
      { count },
    );
  }
  const rate = rateOfContract(contract);
  return rate === null
    ? null
    : `${formatAmount(rate.day)} ${translate.instant(unitKey('price', contract.pricingMode))}`;
}

/** "Nessun minimo", "Minimo 30,00 €" or "Scaglione: 50,00 € fino a 4 ore, poi 12,00 €/h". */
export function minimumSummary(
  minimum: Minimum,
  mode: PricingMode,
  translate: TranslateService,
): string {
  if (minimum.kind === 'FixedMinimum') {
    return translate.instant('contracts.form.minimum.answer.fixed', {
      amount: formatAmount(minimum.amount!),
    });
  }
  return minimum.kind === 'TieredOverage'
    ? translate.instant('contracts.form.minimum.answer.tiered', {
        amount: formatAmount(minimum.amount!),
        threshold: formatQuantity(minimum.threshold!),
        thresholdUnit: translate.instant(unitKey('threshold', mode)),
        overage: formatAmount(minimum.overage!),
        unit: translate.instant(unitKey('price', mode)),
      })
    : translate.instant('contracts.form.minimum.answer.none');
}

/** The fixed minimum told on a trip: below M it is billed M, above it its own amount. */
export function fixedExample(amount: number, translate: TranslateService): string {
  return translate.instant('contracts.form.minimum.exampleFixed', { amount: formatAmount(amount) });
}

/** The tiered overage worked on a trip of the threshold plus two units: M, then Y for each unit over X. */
export function tieredExample(
  minimum: Minimum,
  mode: PricingMode,
  translate: TranslateService,
): string {
  const over = 2;
  const total = Math.round((minimum.amount! + over * minimum.overage!) * 100) / 100;
  return translate.instant('contracts.form.minimum.example', {
    amount: formatAmount(minimum.amount!),
    threshold: formatQuantity(minimum.threshold!),
    thresholdUnit: translate.instant(unitKey('threshold', mode)),
    single: translate.instant(`contracts.form.unit.single.${mode.toLowerCase()}`),
    overage: formatAmount(minimum.overage!),
    trip: formatQuantity(minimum.threshold! + over),
    total: formatAmount(total),
  });
}

/** "55,00 €/h di giorno · 70,00 €/h di notte · chiamata 40,00 € · minimo 120,00 €": the terms of a rate; no minimum under a trip price. */
export function rateTerms(
  answer: { rate: Rate; minimum: Minimum | null },
  mode: PricingMode,
  translate: TranslateService,
): string {
  const rate = rateSummary(answer.rate, mode, translate);
  if (answer.minimum === null) {
    return rate;
  }
  const minimum = minimumSummary(answer.minimum, mode, translate);
  return `${rate} · ${minimum.charAt(0).toLowerCase()}${minimum.slice(1)}`;
}

/** The location of a location rate, or "<pickup> → <delivery>" for a pair rate. */
export const locationRateLabel = (
  answer: Pick<LocationRateAnswer, 'pickup' | 'delivery'>,
): string =>
  [answer.pickup, answer.delivery]
    .filter((side) => side !== null)
    .map(locationLabel)
    .join(' → ');

type PlaceKey = Pick<LocationRateAnswer, 'pickup' | 'delivery'>;

/** Orders two places by pickup name and municipality, then delivery name and municipality, with Italian collation. */
export function compareLocationRates(a: PlaceKey, b: PlaceKey): number {
  const keys = (rate: PlaceKey) => [
    rate.pickup?.name ?? '',
    rate.pickup?.municipality ?? '',
    rate.delivery?.name ?? '',
    rate.delivery?.municipality ?? '',
  ];
  const left = keys(a);
  const right = keys(b);
  for (let at = 0; at < left.length; at++) {
    const order = left[at].localeCompare(right[at], 'it');
    if (order !== 0) {
      return order;
    }
  }
  return 0;
}

/** The rates by pickup name and municipality, then delivery name and municipality, with Italian collation. */
export const sortLocationRates = <T extends PlaceKey>(rates: readonly T[]): T[] =>
  [...rates].sort(compareLocationRates);

/** The vehicle rates by licence plate, then by their first place; the places of each sorted as the location rates are. */
export const sortVehicleRates = <T extends Pick<VehicleRateAnswer, 'licensePlate' | 'places'>>(
  rates: readonly T[],
): T[] =>
  rates
    .map((rate) => ({ ...rate, places: sortLocationRates(rate.places) }))
    .sort(
      (a, b) =>
        a.licensePlate.localeCompare(b.licensePlate, 'it') ||
        (a.places.length > 0 && b.places.length > 0
          ? compareLocationRates(a.places[0], b.places[0])
          : 0),
    );

/** The line of the rate dialog: "<level> · <mode> · <con/senza maggiorazione notturna>". */
export const rateDialogLine = (
  level: BillingLevel,
  mode: PricingMode,
  night: boolean,
  translate: TranslateService,
): string =>
  translate.instant('contracts.form.rateDialog.line', {
    level: translate.instant(`customers.contracts.billing.${level.toLowerCase()}`),
    mode: translate.instant(`customers.contracts.pricing.${mode.toLowerCase()}`).toLowerCase(),
    night: translate.instant(`contracts.form.rateDialog.night.${night ? 'yes' : 'no'}`),
  });

/** The key of a row: the ids of its locations. */
export const rowKey = (entry: Pick<LocationRateAnswer, 'pickup' | 'delivery'>): string =>
  `${entry.pickup?.id ?? ''}|${entry.delivery?.id ?? ''}`;

/** A location rate of a contract as the page holds it; no minimum under a trip price. */
export function locationRateAnswerOf(
  entry: ContractLocationRate,
  mode: PricingMode,
): LocationRateAnswer {
  const side = (location: ContractLocationRate['pickup']): LocationRateAnswer['pickup'] =>
    location === null
      ? null
      : {
          id: location.id,
          name: location.name,
          municipality: location.municipality,
          deactivated: location.status === 'Deactivated',
        };
  return {
    pickup: side(entry.pickup),
    delivery: side(entry.delivery),
    rate: { day: entry.dayPrice, night: entry.nightPrice, callFee: entry.nightCallFee },
    minimum:
      mode === 'ByTrip' || entry.minimumRule === null
        ? null
        : {
            kind: entry.minimumRule,
            amount: entry.minimumAmount,
            threshold: entry.minimumThreshold,
            overage: entry.minimumOveragePrice,
          },
  };
}
