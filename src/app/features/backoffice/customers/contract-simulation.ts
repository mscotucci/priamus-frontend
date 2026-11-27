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
import { calculationLines, type CalculationInput, type CalculationLine } from './calculation-lines';
import {
  formatAmount,
  locationRateLabel,
  rowKey,
  sortLocationRates,
  sortVehicleRates,
} from './contract-labels';
import { rateMembers, type Minimum, type Rate } from './contract-rate';
import {
  LEVEL_KEY,
  locationRateRequestOf,
  locationRatesKey,
  type LocationRateAnswer,
} from './contract-location-rates';
import type { VehicleRateAnswer } from './contract-vehicle-rates';
import { vehicleRateRequestsOf } from './contract-vehicle-rate-places';
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

  /** The chosen vehicle; a vehicle without a rate on the chosen place falls back to "Un mezzo senza tariffa propria". */
  protected readonly vehicleId = computed(() =>
    this.vehicleOptions().some((option) => option.id === this.vehicle()) ? this.vehicle() : '',
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
      vehicleRates: this.vehicleRates().map(({ vehicleId, rate, minimum, places }) => ({
        vehicleId,
        rate,
        minimum,
        places: places.map(rowKey),
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

  protected readonly lines = computed<CalculationLine[] | null>(() => {
    const current = this.current();
    return current?.result
      ? calculationLines(this.inputOf(current.result, current.mode, current.start), this.translate)
      : null;
  });

  protected readonly total = computed(() => {
    const result = this.current()?.result;
    return result
      ? `${formatAmount(result.total)} ${this.translate.instant('contracts.form.unit.euro')}`
      : null;
  });

  /** The vehicles whose rate applies on the chosen place (all of them on a flat rate), once each, by plate. */
  protected readonly vehicleOptions = computed(() => {
    const flat = this.flat();
    const locationId = this.locationId();
    const options = new Map<string, { id: string; label: string }>();
    for (const entry of sortVehicleRates(this.vehicleRates())) {
      if (
        !options.has(entry.vehicleId) &&
        (flat || entry.places.some((own) => rowKey(own) === locationId))
      ) {
        options.set(entry.vehicleId, {
          id: entry.vehicleId,
          label: `${entry.licensePlate} · ${entry.description}`,
        });
      }
    }
    return [...options.values()];
  });

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
      vehicleRates: vehicleRateRequestsOf(this.vehicleRates()),
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

  private inputOf(result: PriceSimulation, mode: PricingMode, start: string): CalculationInput {
    const choice = this.flat() ? null : this.locationChoice();
    const vehicle =
      result.rateSource === 'Vehicle' && this.flat()
        ? this.vehicleRates().find((entry) => entry.vehicleId === result.vehicleId)
        : undefined;
    return {
      mode,
      start,
      nightBand: result.nightBand,
      isNight: result.band !== 'Day',
      nightSurcharge: result.nightSurcharge,
      rateSource: result.rateSource,
      rateVehiclePlate: vehicle?.licensePlate ?? null,
      ratePickup: choice?.pickup ?? null,
      rateDelivery: choice?.delivery ?? null,
      quantity: result.quantity,
      unitPrice: result.unitPrice,
      baseAmount: result.baseAmount,
      minimumKind: result.minimumRule ?? 'None',
      minimumAmount: result.minimumAmount,
      minimumThreshold: result.minimumThreshold,
      minimumOveragePrice: result.minimumOveragePrice,
      minimumApplied: result.minimumApplied,
      amountAfterMinimum: result.amountAfterMinimum,
      nightCallFee: result.nightCallFee,
      total: result.total,
    };
  }
}
