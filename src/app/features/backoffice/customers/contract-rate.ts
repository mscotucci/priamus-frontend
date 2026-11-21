import type { Contract, MinimumRuleKind, PricingMode } from './contracts-api';

/** The amount fields of questions 6 (rate) and 7 (minimum). */
export type AmountField = 'day' | 'night' | 'callFee' | 'amount' | 'threshold' | 'overage';

export type Drafts = Record<AmountField, string>;
export type Errors = Partial<Record<AmountField, string>>;

export interface Rate {
  day: number;
  night: number | null;
  callFee: number | null;
}

export interface Minimum {
  kind: MinimumRuleKind;
  amount: number | null;
  threshold: number | null;
  overage: number | null;
}

/** The unit an add-on shows: the price of the pricing mode, euro, or the threshold of the mode. */
export type UnitKind = 'price' | 'euro' | 'threshold';

export interface FieldSpec {
  field: AmountField;
  unit: UnitKind;
}

export const EMPTY_DRAFTS: Drafts = {
  day: '',
  night: '',
  callFee: '',
  amount: '',
  threshold: '',
  overage: '',
};

export const MINIMUM_KINDS: { kind: MinimumRuleKind; key: string }[] = [
  { kind: 'None', key: 'none' },
  { kind: 'FixedMinimum', key: 'fixed' },
  { kind: 'TieredOverage', key: 'tiered' },
];

export function rateFields(night: boolean): FieldSpec[] {
  return [
    { field: 'day', unit: 'price' },
    ...(night
      ? [
          { field: 'night', unit: 'price' } as FieldSpec,
          { field: 'callFee', unit: 'euro' } as FieldSpec,
        ]
      : []),
  ];
}

export function minimumFields(kind: MinimumRuleKind | null): FieldSpec[] {
  if (kind === 'FixedMinimum') {
    return [{ field: 'amount', unit: 'euro' }];
  }
  return kind === 'TieredOverage'
    ? [
        { field: 'amount', unit: 'euro' },
        { field: 'threshold', unit: 'threshold' },
        { field: 'overage', unit: 'price' },
      ]
    : [];
}

/** Key of a unit add-on: `€/h`, `€/ton`, `€/km` or `€` for a price, `ore`, `ton` or `km` for a threshold. */
export function unitKey(unit: UnitKind, mode: PricingMode): string {
  return unit === 'euro'
    ? 'contracts.form.unit.euro'
    : `contracts.form.unit.${unit}.${mode.toLowerCase()}`;
}

/** The largest amount or threshold a field accepts. */
const MAX_AMOUNT = 9999999999.99;

/** A typed amount: a comma or a dot as decimal separator, at most 2 decimals, no thousands separator. */
function parseAmount(field: AmountField, text: string): { value: number } | { error: string } {
  const typed = text.trim().replace(',', '.');
  if (typed === '') {
    return { error: `contracts.form.field.${field}.required` };
  }
  if (!/^-?\d+(\.\d+)?$/.test(typed)) {
    return { error: 'contracts.form.error.invalid' };
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(typed)) {
    return { error: 'contracts.form.error.decimals' };
  }
  const value = Number(typed);
  if (value > MAX_AMOUNT) {
    return { error: 'contracts.form.error.toohigh' };
  }
  if (field === 'callFee') {
    return value < 0 ? { error: 'contracts.form.error.negative' } : { value };
  }
  if (value <= 0) {
    return {
      error:
        field === 'threshold' ? 'contracts.form.error.threshold' : 'contracts.form.error.positive',
    };
  }
  return { value };
}

/** The numbers of the given fields, or the message of each one that does not hold. */
export function readFields(
  fields: readonly FieldSpec[],
  drafts: Drafts,
): { values: Partial<Record<AmountField, number>>; errors: Errors } {
  const values: Partial<Record<AmountField, number>> = {};
  const errors: Errors = {};
  for (const { field } of fields) {
    const parsed = parseAmount(field, drafts[field]);
    if ('value' in parsed) {
      values[field] = parsed.value;
    } else {
      errors[field] = parsed.error;
    }
  }
  if (
    errors.night === undefined &&
    values.night !== undefined &&
    values.day !== undefined &&
    values.night < values.day
  ) {
    errors.night = 'contracts.form.error.nightBelowDay';
  }
  return { values, errors };
}

export function toRate(values: Partial<Record<AmountField, number>>): Rate {
  return { day: values.day!, night: values.night ?? null, callFee: values.callFee ?? null };
}

export function toMinimum(
  kind: MinimumRuleKind,
  values: Partial<Record<AmountField, number>>,
): Minimum {
  return {
    kind,
    amount: values.amount ?? null,
    threshold: values.threshold ?? null,
    overage: values.overage ?? null,
  };
}

/** A number as the text of its draft field: decimal comma, no trailing zeros. */
const draftText = (value: number | null): string =>
  value === null ? '' : String(value).replace('.', ',');

export function draftsOf(rate: Rate | null, minimum: Minimum | null): Drafts {
  return {
    day: draftText(rate?.day ?? null),
    night: draftText(rate?.night ?? null),
    callFee: draftText(rate?.callFee ?? null),
    amount: draftText(minimum?.amount ?? null),
    threshold: draftText(minimum?.threshold ?? null),
    overage: draftText(minimum?.overage ?? null),
  };
}

/** The rate a stored contract carries; null when it has none. */
export function rateOfContract(contract: Contract): Rate | null {
  return contract.dayPrice === null
    ? null
    : { day: contract.dayPrice, night: contract.nightPrice, callFee: contract.nightCallFee };
}

/** The minimum a stored contract carries; null when it has none to show (no rule stored). */
export function minimumOfContract(contract: Contract): Minimum | null {
  return contract.minimumRule === null
    ? null
    : {
        kind: contract.minimumRule,
        amount: contract.minimumAmount,
        threshold: contract.minimumThreshold,
        overage: contract.minimumOveragePrice,
      };
}

/** The seven request members of the rate and the minimum; all null for a contract that is not flat rate. */
export function rateMembers(flat: boolean, rate: Rate | null, minimum: Minimum | null) {
  return {
    dayPrice: flat ? (rate?.day ?? null) : null,
    nightPrice: flat ? (rate?.night ?? null) : null,
    nightCallFee: flat ? (rate?.callFee ?? null) : null,
    minimumRule: flat ? (minimum?.kind ?? null) : null,
    minimumAmount: flat ? (minimum?.amount ?? null) : null,
    minimumThreshold: flat ? (minimum?.threshold ?? null) : null,
    minimumOveragePrice: flat ? (minimum?.overage ?? null) : null,
  };
}
