import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Icon } from '../../../shared/components/icon/icon';
import { locationLabel } from '../locations/location-label';
import type { RateableLocation } from '../locations/locations-api';
import type { SavedLocation } from '../locations/locations-facade';
import {
  locationRateLabel,
  rateDialogLine,
  rateTerms,
  rowKey,
  sortLocationRates,
} from './contract-labels';
import { forNight, rateMembers, type Minimum, type Rate } from './contract-rate';
import {
  ContractRateDialog,
  type ConfirmedRate,
  type RateSubject,
  type RateSubjectOption,
} from './contract-rate-dialog';
import { ContractRateRows, type RateRow } from './contract-rate-rows';
import { joinPlace, leavePlace, movePlace } from './contract-vehicle-rate-places';
import type { VehicleRateAnswer } from './contract-vehicle-rates';
import type {
  BillingLevel,
  ContractLocationRateRequest,
  PricingMode,
} from './contracts-api';

/** A location a rate is written for; `deactivated` once the location was deactivated after the rate. */
export interface RatedLocation {
  id: string;
  name: string;
  municipality: string;
  deactivated: boolean;
}

/** A location or pair rate, as the contract page holds it once question 6 is answered. */
export interface LocationRateAnswer {
  /** Null on a rate per delivery location. */
  pickup: RatedLocation | null;
  /** Null on a rate per pickup location. */
  delivery: RatedLocation | null;
  rate: Rate;
  /** Null when the contract is priced `ByTrip`: no minimum applies. */
  minimum: Minimum | null;
}

export type LocationRateLevel = Exclude<BillingLevel, 'FlatRate'>;

/** The item of a save request for a location rate: the ids of its locations and the seven rate members. */
export const locationRateRequestOf = (answer: LocationRateAnswer): ContractLocationRateRequest => ({
  pickupLocationId: answer.pickup?.id ?? null,
  deliveryLocationId: answer.delivery?.id ?? null,
  ...rateMembers(true, answer.rate, answer.minimum),
});

/** The location rates as the contract holds them: the displayed names and status are left out. */
export const locationRatesKey = (rates: readonly LocationRateAnswer[]) =>
  rates.map(({ pickup, delivery, rate, minimum }) => ({
    pickup: pickup?.id ?? null,
    delivery: delivery?.id ?? null,
    rate,
    minimum,
  }));

type Side = 'pickup' | 'delivery';

const SIDES: Record<LocationRateLevel, Side[]> = {
  PerPickupLocation: ['pickup'],
  PerDeliveryLocation: ['delivery'],
  PerLocationPair: ['pickup', 'delivery'],
};

/** The question and the answer of the page name a location level by this key. */
export const LEVEL_KEY: Record<LocationRateLevel, 'pickup' | 'delivery' | 'both'> = {
  PerPickupLocation: 'pickup',
  PerDeliveryLocation: 'delivery',
  PerLocationPair: 'both',
};

/** What "Conferma" hands to the page: the location rates and the vehicle rates as the rows left them. */
export interface ConfirmedLocationRates {
  locationRates: LocationRateAnswer[];
  vehicleRates: VehicleRateAnswer[];
}

interface Notice {
  key: string;
  params?: Record<string, string>;
}

const KEYS = 'contracts.form.locationRates';

/** The body of question 6 of a location contract while it is open: one row per rate, and the dialog that writes them. */
@Component({
  selector: 'app-contract-location-rates',
  imports: [TranslatePipe, Icon, ContractRateRows, ContractRateDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contract-location-rates.html',
  host: { class: 'flex flex-col gap-3' },
})
export class ContractLocationRates {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly translate = inject(TranslateService);

  readonly level = input.required<LocationRateLevel>();
  /** The contract has the night surcharge: each rate has a night price and a night call fee. */
  readonly night = input.required<boolean>();
  readonly mode = input.required<PricingMode>();
  /** The active locations; null until they are read. */
  readonly rateable = input.required<RateableLocation[] | null>();
  readonly failed = input(false);
  /** The page's answer: null while unanswered. */
  readonly answer = input.required<LocationRateAnswer[] | null>();
  /** The question was reopened with "Modifica": it offers "Annulla modifica". */
  readonly cancellable = input(false);
  /** The page's vehicle rates: empty while question 8 is unanswered or answered "No". */
  readonly vehicleRates = input<VehicleRateAnswer[]>([]);
  readonly confirmed = output<ConfirmedLocationRates>();
  readonly cancelled = output();
  /** The dialog opens after a failed read of the locations: they are read again. */
  readonly retry = output();

  /** The rates being written; nothing reaches the page before "Conferma". They start again when the level or the pricing mode changes. */
  protected readonly draft = linkedSignal<
    { answer: LocationRateAnswer[] | null; level: LocationRateLevel; mode: PricingMode },
    LocationRateAnswer[]
  >({
    source: () => ({ answer: this.answer(), level: this.level(), mode: this.mode() }),
    computation: (source, previous) => {
      if (previous === undefined) {
        return source.answer ?? [];
      }
      if (previous.source.level !== source.level || previous.source.mode !== source.mode) {
        return [];
      }
      // an empty answer replacing an empty one is no new answer: what was written stays
      return (previous.source.answer?.length ?? 0) === 0 && (source.answer?.length ?? 0) === 0
        ? previous.value
        : (source.answer ?? []);
    },
  });

  private readonly vehicleRatesKey = computed(() => JSON.stringify(this.vehicleRates()));

  /** The vehicle rates being written beside the location rates; they start again when the location rates do. */
  protected readonly vehicleDraft = linkedSignal<
    {
      answer: LocationRateAnswer[] | null;
      content: string;
      level: LocationRateLevel;
      mode: PricingMode;
    },
    VehicleRateAnswer[]
  >({
    source: () => ({
      answer: this.answer(),
      content: this.vehicleRatesKey(),
      level: this.level(),
      mode: this.mode(),
    }),
    computation: (source, previous) => {
      if (previous === undefined) {
        return untracked(this.vehicleRates);
      }
      if (previous.source.level !== source.level || previous.source.mode !== source.mode) {
        return [];
      }
      // an empty answer replacing an empty one is no new answer: what was written stays
      return (previous.source.answer?.length ?? 0) === 0 &&
        (source.answer?.length ?? 0) === 0 &&
        previous.source.content === source.content
        ? previous.value
        : untracked(this.vehicleRates);
    },
  });

  /**
   * The rate the dialog is open on: `entry` is null for a new one, `key` is the key it had when the dialog
   * opened; `copy` is the row a new one is a copy of.
   */
  protected readonly dialog = signal<{
    entry: LocationRateAnswer | null;
    key: string | null;
    copy: LocationRateAnswer | null;
  } | null>(null);
  /** The message under the rows; it goes away when the night surcharge, the level or the pricing mode changes. */
  protected readonly notice = linkedSignal<
    { night: boolean; level: LocationRateLevel; mode: PricingMode },
    Notice | null
  >({
    source: () => ({ night: this.night(), level: this.level(), mode: this.mode() }),
    computation: () => null,
  });
  /** Locations created from the dialog, offered until the list read contains them. */
  private readonly created = signal<SavedLocation[]>([]);

  protected readonly key = computed(() => LEVEL_KEY[this.level()]);

  protected readonly rows = computed<RateRow[]>(() =>
    sortLocationRates(this.draft()).map((entry) => ({
      key: rowKey(entry),
      parts: [entry.pickup, entry.delivery]
        .filter((side) => side !== null)
        .map((side) => ({
          label: locationLabel(side),
          pill: side.deactivated ? { key: `${KEYS}.deactivated`, tone: 'danger' as const } : null,
        })),
      summary: rateTerms(forNight(entry, this.night()), this.mode(), this.translate),
    })),
  );

  /** Every active location, the ones created here included. */
  private readonly available = computed<RateableLocation[]>(() => {
    const list = this.rateable() ?? [];
    return [...list, ...this.created().filter((c) => !list.some((l) => l.id === c.id))];
  });

  /** The locations the draft names, kept with their deactivated mark; a location read as active wins. */
  private readonly known = computed(() => {
    const known = new Map<string, RatedLocation>();
    for (const entry of this.draft()) {
      for (const side of [entry.pickup, entry.delivery]) {
        if (side !== null) {
          known.set(side.id, side);
        }
      }
    }
    for (const location of this.available()) {
      known.set(location.id, { ...location, deactivated: false });
    }
    return known;
  });

  protected readonly line = computed(() =>
    rateDialogLine(this.level(), this.mode(), this.night(), this.translate),
  );

  protected readonly subjects = computed<RateSubject[]>(() => {
    const state = this.dialog();
    if (state === null) {
      return [];
    }
    const loading = this.rateable() === null && !this.failed();
    return SIDES[this.level()].map((side) => ({
      label: `${KEYS}.location.${side}`,
      placeholder: `${KEYS}.location.placeholder`,
      required: `${KEYS}.location.required`,
      loadFailed: `${KEYS}.location.loadFailed`,
      options: this.optionsOf(side, state.entry, state.key),
      chosen: state.entry?.[side]?.id ?? '',
      loading,
      failed: this.failed(),
      canCreate: true,
    }));
  });

  /** The notice of a copy: its source and the vehicles whose rate applies there. */
  protected readonly copyNotice = computed(() => {
    const copy = this.dialog()?.copy ?? null;
    if (copy === null) {
      return null;
    }
    const plates = [
      ...new Set(
        this.vehicleDraft()
          .filter((answer) => answer.places.some((place) => rowKey(place) === rowKey(copy)))
          .map((answer) => answer.licensePlate),
      ),
    ];
    const places = this.level() === 'PerLocationPair' ? 'pair' : 'location';
    return this.translate.instant(
      `${KEYS}.duplicate.${places}.${plates.length === 0 ? 'alone' : 'withVehicles'}`,
      { label: locationRateLabel(copy), plates: plates.join(', ') },
    );
  });

  /** A pair already in the list is refused under the second select. */
  protected readonly check = computed(() => {
    const editedKey = this.dialog()?.key ?? null;
    return this.level() !== 'PerLocationPair'
      ? () => null
      : (ids: string[]) =>
          this.draft().some(
            (other) =>
              (editedKey === null || rowKey(other) !== editedKey) &&
              other.pickup?.id === ids[0] &&
              other.delivery?.id === ids[1],
          )
            ? `${KEYS}.duplicatePair`
            : null;
  });

  protected add(): void {
    this.open(null, null, null);
  }

  protected edit(key: string): void {
    const entry = this.draft().find((candidate) => rowKey(candidate) === key);
    if (entry !== undefined) {
      this.open(entry, key, null);
    }
  }

  protected duplicate(key: string): void {
    const copy = this.draft().find((candidate) => rowKey(candidate) === key);
    if (copy !== undefined) {
      this.open(null, null, copy);
    }
  }

  private open(
    entry: LocationRateAnswer | null,
    key: string | null,
    copy: LocationRateAnswer | null,
  ): void {
    this.dialog.set({ entry, key, copy });
    if (this.failed()) {
      this.retry.emit();
    }
  }

  protected remove(key: string): void {
    this.notice.set(null);
    const removed = this.draft().find((entry) => rowKey(entry) === key);
    if (removed !== undefined) {
      this.vehicleDraft.update((list) => leavePlace(list, removed));
    }
    this.draft.update((list) => list.filter((entry) => rowKey(entry) !== key));
  }

  protected onCreated(location: SavedLocation): void {
    this.created.update((created) => [...created, location]);
  }

  protected onConfirmed(confirmed: ConfirmedRate): void {
    const editedKey = this.dialog()?.key ?? null;
    const copy = this.dialog()?.copy ?? null;
    const known = this.known();
    const chosen = Object.fromEntries(
      SIDES[this.level()].map((side, index) => [side, known.get(confirmed.ids[index]) ?? null]),
    ) as Partial<Record<Side, RatedLocation | null>>;
    const built: LocationRateAnswer = {
      pickup: chosen.pickup ?? null,
      delivery: chosen.delivery ?? null,
      rate: confirmed.rate,
      minimum: confirmed.minimum,
    };
    this.notice.set(null);
    const old = editedKey === null ? undefined : this.draft().find((o) => rowKey(o) === editedKey);
    if (old !== undefined && rowKey(old) !== rowKey(built)) {
      this.vehicleDraft.update((list) => movePlace(list, old, built));
    } else if (old === undefined && copy !== null) {
      this.vehicleDraft.update((list) => joinPlace(list, copy, built));
    }
    this.draft.update((list) =>
      editedKey !== null && list.some((other) => rowKey(other) === editedKey)
        ? list.map((other) => (rowKey(other) === editedKey ? built : other))
        : [...list, built],
    );
    this.dialog.set(null);
    if (editedKey !== null) {
      this.focusRow(rowKey(built));
    }
  }

  /** "Conferma": at least one rate, and a night price and call fee on each exactly when the contract has the surcharge. */
  protected confirm(): void {
    const sorted = sortLocationRates(this.draft());
    if (sorted.length === 0) {
      this.notice.set({ key: `${KEYS}.required` });
      this.focusLater('[data-add]');
      return;
    }
    const night = this.night();
    const incomplete = night
      ? sorted.findIndex((entry) => entry.rate.night === null || entry.rate.callFee === null)
      : -1;
    if (incomplete >= 0) {
      this.notice.set({
        key: `${KEYS}.nightIncomplete`,
        params: { label: locationRateLabel(sorted[incomplete]) },
      });
      this.focusRow(rowKey(sorted[incomplete]));
      return;
    }
    this.confirmed.emit({
      locationRates: sorted.map((entry) => forNight(entry, night)),
      vehicleRates: this.vehicleDraft(),
    });
  }

  protected focusAdd(): void {
    this.focusLater('[data-add]');
  }

  /** Single levels: the active locations without a rate; a pair: every active location. Plus the row's own, even deactivated. */
  private optionsOf(
    side: Side,
    entry: LocationRateAnswer | null,
    editedKey: string | null,
  ): RateSubjectOption[] {
    const taken =
      this.level() === 'PerLocationPair'
        ? new Set<string>()
        : new Set(
            this.draft()
              .filter((other) => editedKey === null || rowKey(other) !== editedKey)
              .map((other) => other[side]?.id),
          );
    const available = this.available();
    const own = entry?.[side] ?? null;
    return [
      ...(own !== null && !available.some((location) => location.id === own.id)
        ? [{ id: own.id, label: locationLabel(own) }]
        : []),
      ...available
        .filter((location) => !taken.has(location.id))
        .map((location) => ({ id: location.id, label: locationLabel(location) })),
    ];
  }

  /** The "Modifica" of the row with that key: an edit that changes the key makes a new row, the old control is gone. */
  private focusRow(key: string): void {
    const index = this.rows().findIndex((row) => row.key === key);
    this.focusLater(`li:nth-child(${index + 1}) [data-edit]`);
  }

  private focusLater(selector: string): void {
    afterNextRender(
      { read: () => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus() },
      { injector: this.injector },
    );
  }
}
