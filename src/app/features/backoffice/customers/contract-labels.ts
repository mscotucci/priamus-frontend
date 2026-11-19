import { TranslateService } from '@ngx-translate/core';
import { LANGUAGE } from '../../../core/i18n/i18n';
import { Minimum, Rate, rateOfContract, unitKey } from './contract-rate';
import { Contract, ContractStatus, PricingMode, RequiredDocument } from './contracts-api';

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

/** "30,00 €/h": the day price with the unit of the pricing mode; null when the contract has no rate. */
export function dayPriceSummary(contract: Contract, translate: TranslateService): string | null {
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
