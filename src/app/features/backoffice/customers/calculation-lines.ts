import type { TranslateService } from '@ngx-translate/core';
import { locationLabel } from '../locations/location-label';
import {
  formatAmount,
  formatDuration,
  formatKilometres,
  formatTons,
  minimumSummary,
} from './contract-labels';
import { unitKey } from './contract-rate';
import type { MinimumRuleKind, PriceSimulation, PricingMode } from './contracts-api';

/** A place of the rate the trip was priced with. */
export interface CalculationPlace {
  name: string;
  municipality: string;
}

/** What the calculation lines are written from: a simulation and a saved trip both map into it. */
export interface CalculationInput {
  mode: PricingMode;
  /** The start time, `HH:mm`. */
  start: string;
  /** The night band the trip was classified with, `HH:mm`. */
  nightBand: { start: string; end: string };
  isNight: boolean;
  nightSurcharge: boolean;
  rateSource: PriceSimulation['rateSource'];
  /** The plate of the vehicle whose own rate was used, when no place narrows it. */
  rateVehiclePlate: string | null;
  ratePickup: CalculationPlace | null;
  rateDelivery: CalculationPlace | null;
  /** Minutes, kilograms or kilometres; `null` for a trip priced by trip. */
  quantity: number | null;
  unitPrice: number;
  baseAmount: number;
  minimumKind: NonNullable<MinimumRuleKind>;
  minimumAmount: number | null;
  minimumThreshold: number | null;
  minimumOveragePrice: number | null;
  minimumApplied: boolean;
  amountAfterMinimum: number;
  /** The night call fee added after the minimum rule; `null` when none is added. */
  nightCallFee: number | null;
  total: number;
}

export interface CalculationLine {
  label: string;
  text: string;
  plate?: string;
  /** The value is a figure: shown in the monospaced font, as in the mockup. */
  mono?: boolean;
}

const placesLabel = (pickup: CalculationPlace | null, delivery: CalculationPlace | null): string =>
  [pickup, delivery]
    .filter((place) => place !== null)
    .map(locationLabel)
    .join(' → ');

function rateText(input: CalculationInput, t: (name: string, params?: object) => string): string {
  const { rateSource: source, ratePickup: pickup, rateDelivery: delivery } = input;
  if (source === 'Contract' || (pickup === null && delivery === null)) {
    return t('contractRate');
  }
  const single = locationLabel((pickup ?? delivery)!);
  const pair = placesLabel(pickup, delivery);
  if (source === 'Vehicle') {
    return pickup !== null && delivery !== null
      ? t('vehiclePairRate', { pair })
      : t('vehicleLocationRate', { location: single });
  }
  return source === 'Location' ? t('locationRate', { location: single }) : t('pairRate', { pair });
}

/** The rows of a price calculation, in the words of "Prova la configurazione". */
export function calculationLines(
  input: CalculationInput,
  translate: TranslateService,
): CalculationLine[] {
  const t = (name: string, params?: object): string =>
    translate.instant(`contracts.form.simulation.result.${name}`, params);
  const { mode, start } = input;
  const { start: from, end: to } = input.nightBand;
  const band = !input.isNight
    ? t('day', { start, from, to })
    : input.nightSurcharge
      ? t('night', { start, from, to })
      : t('nightNoSurcharge');
  const quantity = input.quantity;
  const price = formatAmount(input.unitPrice);
  const base =
    quantity === null
      ? t('formulaTrip', { price })
      : t('formula', {
          quantity:
            mode === 'ByHour'
              ? formatDuration(quantity, translate)
              : mode === 'ByWeight'
                ? formatTons(quantity, translate)
                : formatKilometres(quantity, translate),
          price,
          unit: translate.instant(unitKey('price', mode)),
          amount: formatAmount(input.baseAmount),
        });
  const noPlace = input.ratePickup === null && input.rateDelivery === null;
  const plate = input.rateSource === 'Vehicle' && noPlace ? input.rateVehiclePlate : null;
  const lines: CalculationLine[] = [
    { label: t('band'), text: band },
    plate !== null
      ? { label: t('rate'), text: t('vehicleRate'), plate }
      : { label: t('rate'), text: rateText(input, t) },
    { label: t('base'), text: base, mono: true },
  ];
  const kind = input.minimumKind;
  const rule = minimumSummary(
    {
      kind,
      amount: input.minimumAmount,
      threshold: input.minimumThreshold,
      overage: input.minimumOveragePrice,
    },
    mode,
    translate,
  );
  lines.push({
    label: t('minimum'),
    mono: true,
    text:
      kind === 'None'
        ? rule
        : input.minimumApplied
          ? t('minimumRaised', { rule, amount: formatAmount(input.amountAfterMinimum) })
          : t(kind === 'FixedMinimum' ? 'minimumUnused' : 'minimumUnchanged', { rule }),
  });
  // the rows follow the calculation: the night call fee is added after the minimum rule
  if (input.nightCallFee !== null) {
    lines.push({
      label: t('callFee'),
      mono: true,
      text: t('callFeeAdded', {
        fee: formatAmount(input.nightCallFee),
        amount: formatAmount(input.total),
      }),
    });
  }
  return lines;
}
