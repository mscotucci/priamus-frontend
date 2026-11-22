import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { fieldErrors, noticeOf, type NoticeContent } from '../../../core/api/api-error';
import { Notice } from '../../../shared/components/notice/notice';
import { CustomersFacade } from './customers-facade';
import { locationLabel } from '../locations/location-label';
import {
  formatAmount,
  formatDuration,
  formatKilometres,
  formatTons,
  locationRateLabel,
  minimumSummary,
  sortLocationRates,
  sortVehicleRates,
} from './contract-labels';
import { rateMembers, unitKey, type Minimum, type Rate } from './contract-rate';
import {
  LEVEL_KEY,
  locationRateRequestOf,
  locationRatesKey,
  rowKey,
  type LocationRateAnswer,
} from './contract-location-rates';
import type { VehicleRateAnswer } from './contract-vehicle-rates';
import {
  type BillingLevel,
  type PriceSimulation,
  type PricingMode,
  type SimulatePriceRequest,
} from './contracts-api';

/** The fields of the sample trip, as the back office typed them. */
interface Trip {
  start: string;
  end: string;
  kilograms: string;
  kilometres: string;
}

type TripField = keyof Trip;
type TripErrors = Partial<Record<TripField, string>>;

const EMPTY_TRIP: Trip = { start: '', end: '', kilograms: '', kilometres: '' };

const MAX_KILOGRAMS = 99999;
const MAX_KILOMETRES = 9999;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The server's name of each field of the sample trip. */
const SERVER_FIELD: Record<TripField, string> = {
  start: 'startTime',
  end: 'endTime',
  kilograms: 'kilograms',
  kilometres: 'kilometres',
};

interface Line {
  label: string;
  text: string;
  plate?: string;
  /** The value is a figure: shown in the monospaced font, as in the mockup. */
  mono?: boolean;
}

/** What "Calcola" last produced, with the key of the inputs it was computed from. */
interface Outcome {
  key: string;
  mode: PricingMode;
  start: string;
  result: PriceSimulation | null;
  refusal: NoticeContent | null;
}

/** The "Prova la configurazione" card: a sample trip priced with the contract as written on the page. */
@Component({
  selector: 'app-contract-simulation',
  imports: [TranslatePipe, Notice, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contract-simulation.html',
})
export class ContractSimulation {
  private readonly facade = inject(CustomersFacade);
  private readonly translate = inject(TranslateService);

  readonly mode = input.required<PricingMode>();
  /** The contract has the night surcharge. */
  readonly night = input.required<boolean>();
  /** Null on a location contract: its rates are the location rates. */
  readonly rate = input.required<Rate | null>();
  /** Null when the contract is priced `ByTrip`. */
  readonly minimum = input.required<Minimum | null>();
  readonly vehicleRates = input.required<VehicleRateAnswer[]>();
  readonly level = input.required<BillingLevel>();
  /** The rates of a location contract as written on the page; empty for a flat rate. */
  readonly locationRates = input.required<LocationRateAnswer[]>();
  /** A question is still open: the contract cannot be tried until it is confirmed. */
  readonly blocked = input.required<boolean>();

  private readonly vehicle = signal('');
  private readonly location = signal('');
  /** The typed fields start empty again when the pricing mode changes: the fields shown are not the same. */
  protected readonly trip = linkedSignal<PricingMode, Trip>({
    source: this.mode,
    computation: () => EMPTY_TRIP,
  });
  protected readonly errors = linkedSignal<PricingMode, TripErrors>({
    source: this.mode,
    computation: () => ({}),
  });
  protected readonly running = signal(false);
  private readonly outcome = signal<Outcome | null>(null);

  /** The chosen vehicle; a vehicle that lost its rate on the page falls back to the contract's rate. */
  protected readonly vehicleId = computed(() =>
    this.vehicleRates().some((entry) => entry.vehicleId === this.vehicle()) ? this.vehicle() : '',
  );

  protected readonly flat = computed(() => this.level() === 'FlatRate');

  /** The label of the location select: the location's own text, or the pair's. */
  protected readonly locationLabelKey = computed(() => {
    const level = this.level();
    const key = level === 'FlatRate' ? 'both' : LEVEL_KEY[level];
    return key === 'both'
      ? 'contracts.form.simulation.location.both'
      : `contracts.form.locationRates.location.${key}`;
  });

  protected readonly locationOptions = computed(() =>
    sortLocationRates(this.locationRates()).map((entry) => ({
      id: rowKey(entry),
      label: locationRateLabel(entry),
    })),
  );

  /** The chosen location rate; one removed on the page falls back to the first. */
  private readonly locationChoice = computed(() => {
    const rates = sortLocationRates(this.locationRates());
    return rates.find((entry) => rowKey(entry) === this.location()) ?? rates[0] ?? null;
  });

  protected readonly locationId = computed(() => {
    const choice = this.locationChoice();
    return choice === null ? '' : rowKey(choice);
  });

  /** Everything the amount depends on: a result is shown only while this equals the key it was computed from. */
  private readonly key = computed(() => {
    const trip = this.trip();
    const mode = this.mode();
    return JSON.stringify({
      mode,
      night: this.night(),
      level: this.level(),
      rate: this.rate(),
      minimum: this.minimum(),
      vehicleRates: this.vehicleRates().map(({ vehicleId, rate, minimum }) => ({
        vehicleId,
        rate,
        minimum,
      })),
      vehicle: this.vehicleId(),
      locationRates: locationRatesKey(this.locationRates()),
      location: this.locationId(),
      start: trip.start,
      end: mode === 'ByHour' ? trip.end : null,
      kilograms: mode === 'ByWeight' ? trip.kilograms.trim() : null,
      kilometres: mode === 'ByDistance' ? trip.kilometres.trim() : null,
    });
  });

  private readonly current = computed(() => {
    const outcome = this.outcome();
    return outcome !== null && outcome.key === this.key() ? outcome : null;
  });

  protected readonly refusal = computed(() => this.current()?.refusal ?? null);

  /** A result computed from other inputs than the current ones is never shown. */
  protected readonly stale = computed(() => {
    const outcome = this.outcome();
    return outcome !== null && outcome.result !== null && outcome.key !== this.key();
  });

  protected readonly lines = computed<Line[] | null>(() => {
    const current = this.current();
    return current?.result ? this.linesOf(current.result, current.mode, current.start) : null;
  });

  protected readonly total = computed(() => {
    const result = this.current()?.result;
    return result
      ? `${formatAmount(result.total)} ${this.translate.instant('contracts.form.unit.euro')}`
      : null;
  });

  protected readonly vehicleOptions = computed(() =>
    sortVehicleRates(this.vehicleRates()).map((entry) => ({
      id: entry.vehicleId,
      label: `${entry.licensePlate} · ${entry.description}`,
    })),
  );

  protected pickLocation(id: string): void {
    this.location.set(id);
  }

  protected pickVehicle(vehicleId: string): void {
    this.vehicle.set(vehicleId);
  }

  protected edit(field: TripField, value: string): void {
    this.trip.update((trip) => ({ ...trip, [field]: value }));
    this.errors.update((errors) => ({
      ...errors,
      [field]: undefined,
      // "End equals start" depends on both times: editing either one clears it.
      ...(field === 'start' && errors.end === this.endEqualsStartText() ? { end: undefined } : {}),
    }));
  }

  private endEqualsStartText(): string {
    return this.translate.instant('contracts.form.simulation.error.endEqualsStart');
  }

  protected async calculate(): Promise<void> {
    const errors = this.validate();
    this.errors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    const key = this.key();
    const mode = this.mode();
    const start = this.trip().start;
    this.running.set(true);
    try {
      const answer = await this.facade.simulate(this.request());
      if (!('kind' in answer)) {
        this.outcome.set({ key, mode, start, result: answer, refusal: null });
        return;
      }
      const server: TripErrors = {};
      for (const field of Object.keys(SERVER_FIELD) as TripField[]) {
        const messages = fieldErrors(answer, SERVER_FIELD[field]);
        if (messages.length > 0) {
          server[field] = messages.join(' ');
        }
      }
      if (Object.keys(server).length > 0) {
        this.errors.set(server);
        this.outcome.set(null);
      } else {
        // a validation refusal that names no field of the sample trip is about the contract's
        // answers (a night price saved below the day price): the backend's messages are shown
        const messages =
          answer.kind === 'validation' ? [...new Set(Object.values(answer.errors).flat())] : [];
        const refusal = messages.length > 0 ? { detail: messages.join(' ') } : noticeOf(answer);
        this.outcome.set({ key, mode, start, result: null, refusal });
      }
    } finally {
      this.running.set(false);
    }
  }

  private validate(): TripErrors {
    const trip = this.trip();
    const mode = this.mode();
    const errors: TripErrors = {};
    const text = (name: string) =>
      this.translate.instant(`contracts.form.simulation.error.${name}`);
    if (!TIME.test(trip.start)) {
      errors.start = text('time');
    }
    if (mode === 'ByHour') {
      if (!TIME.test(trip.end)) {
        errors.end = text('time');
      } else if (trip.end === trip.start) {
        errors.end = this.endEqualsStartText();
      }
    }
    const quantity =
      mode === 'ByWeight' ? 'kilograms' : mode === 'ByDistance' ? 'kilometres' : null;
    if (quantity !== null) {
      const typed = trip[quantity].trim();
      if (!/^\d+$/.test(typed) || Number(typed) === 0) {
        errors[quantity] = text('quantity');
      } else if (quantity === 'kilograms' && Number(typed) > MAX_KILOGRAMS) {
        errors[quantity] = text('maxKilograms');
      } else if (quantity === 'kilometres' && Number(typed) > MAX_KILOMETRES) {
        errors[quantity] = text('maxKilometres');
      }
    }
    return errors;
  }

  private request(): SimulatePriceRequest {
    const trip = this.trip();
    const mode = this.mode();
    const flat = this.flat();
    const choice = this.locationChoice();
    return {
      pricingMode: mode,
      nightSurcharge: this.night(),
      ...rateMembers(flat, this.rate(), this.minimum()),
      vehicleRates: flat
        ? this.vehicleRates().map(({ vehicleId, rate, minimum }) => ({
            vehicleId,
            ...rateMembers(true, rate, minimum),
          }))
        : [],
      vehicleId: this.vehicleId() === '' ? null : this.vehicleId(),
      billingLevel: this.level(),
      locationRates: flat ? [] : this.locationRates().map(locationRateRequestOf),
      pickupLocationId: flat ? null : (choice?.pickup?.id ?? null),
      deliveryLocationId: flat ? null : (choice?.delivery?.id ?? null),
      startTime: trip.start,
      endTime: mode === 'ByHour' ? trip.end : null,
      kilograms: mode === 'ByWeight' ? Number(trip.kilograms.trim()) : null,
      kilometres: mode === 'ByDistance' ? Number(trip.kilometres.trim()) : null,
    };
  }

  private rateSourceText(source: PriceSimulation['rateSource']): string {
    const t = (name: string, params?: object): string =>
      this.translate.instant(`contracts.form.simulation.result.${name}`, params);
    const choice = this.locationChoice();
    if (choice === null || source === 'Contract' || source === 'Vehicle') {
      return t('contractRate');
    }
    return source === 'Location'
      ? t('locationRate', { location: locationLabel((choice.pickup ?? choice.delivery)!) })
      : t('pairRate', { pair: locationRateLabel(choice) });
  }

  private linesOf(result: PriceSimulation, mode: PricingMode, start: string): Line[] {
    const t = (name: string, params?: object): string =>
      this.translate.instant(`contracts.form.simulation.result.${name}`, params);
    const { start: from, end: to } = result.nightBand;
    const band =
      result.band === 'Day'
        ? t('day', { start, from, to })
        : result.nightSurcharge
          ? t('night', { start, from, to })
          : t('nightNoSurcharge');
    const vehicle =
      result.rateSource !== 'Vehicle'
        ? undefined
        : this.vehicleRates().find((entry) => entry.vehicleId === result.vehicleId);
    const quantity = result.quantity;
    const price = formatAmount(result.unitPrice);
    const base =
      quantity === null
        ? t('formulaTrip', { price })
        : t('formula', {
            quantity:
              mode === 'ByHour'
                ? formatDuration(quantity, this.translate)
                : mode === 'ByWeight'
                  ? formatTons(quantity, this.translate)
                  : formatKilometres(quantity, this.translate),
            price,
            unit: this.translate.instant(unitKey('price', mode)),
            amount: formatAmount(result.baseAmount),
          });
    const lines: Line[] = [
      { label: t('band'), text: band },
      vehicle
        ? { label: t('rate'), text: t('vehicleRate'), plate: vehicle.licensePlate }
        : { label: t('rate'), text: this.rateSourceText(result.rateSource) },
      { label: t('base'), text: base, mono: true },
    ];
    const kind = result.minimumRule ?? 'None';
    const rule = minimumSummary(
      {
        kind,
        amount: result.minimumAmount,
        threshold: result.minimumThreshold,
        overage: result.minimumOveragePrice,
      },
      mode,
      this.translate,
    );
    lines.push({
      label: t('minimum'),
      mono: true,
      text:
        kind === 'None'
          ? rule
          : result.minimumApplied
            ? t('minimumRaised', { rule, amount: formatAmount(result.amountAfterMinimum) })
            : t(kind === 'FixedMinimum' ? 'minimumUnused' : 'minimumUnchanged', {
                rule,
              }),
    });
    // the rows follow the calculation: the night call fee is added after the minimum rule
    if (result.nightCallFee !== null) {
      lines.push({
        label: t('callFee'),
        mono: true,
        text: t('callFeeAdded', {
          fee: formatAmount(result.nightCallFee),
          amount: formatAmount(result.total),
        }),
      });
    }
    return lines;
  }
}
