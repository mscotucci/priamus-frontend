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
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ContractKeys } from './contract-keys';
import { ChoiceKeys } from './choice-keys';
import { Icon } from '../../../shared/components/icon/icon';
import type { RateableVehicle } from '../vehicles/vehicles-api';
import {
  locationRateLabel,
  rateDialogLine,
  rateSummary,
  rateTerms,
  rowKey,
  sortLocationRates,
  sortVehicleRates,
} from './contract-labels';
import { forNight, type Minimum, type Rate } from './contract-rate';
import {
  ContractRateDialog,
  type ConfirmedRate,
  type RateDialogTitles,
  type RatePlaces,
  type RateSubject,
  type RateSubjectOption,
} from './contract-rate-dialog';
import { ContractRateRows, type RateRow } from './contract-rate-rows';
import type { LocationRateAnswer, LocationRateLevel } from './contract-location-rates';
import {
  mergeVehicleRates,
  placePill,
  placesLine,
  vehicleRateKey,
} from './contract-vehicle-rate-places';
import type { BillingLevel, PricingMode } from './contracts-api';

/** A location or pair a contract has a rate for, as a vehicle rate applies on it. */
export type RatedPlace = Pick<LocationRateAnswer, 'pickup' | 'delivery'>;

/** A vehicle with a rate of its own, as the contract page holds it once question 8 is answered. */
export interface VehicleRateAnswer {
  vehicleId: string;
  licensePlate: string;
  description: string;
  decommissioned: boolean;
  rate: Rate;
  /** Null when the contract is priced `ByTrip`: no minimum applies. */
  minimum: Minimum | null;
  /** The places the rate applies on; empty on a flat-rate contract. */
  places: RatedPlace[];
}

type Choice = 'no' | 'yes';

const KEYS = 'contracts.form.vehicleRates';

interface Notice {
  key: string;
  params?: Record<string, string>;
}

const label = (vehicle: { licensePlate: string; description: string }): string =>
  `${vehicle.licensePlate} · ${vehicle.description}`;

/** The body of question 8 while it is open: "No", or "Sì" with one row per vehicle that has a rate of its own. */
@Component({
  selector: 'app-contract-vehicle-rates',
  imports: [TranslatePipe, Icon, ContractKeys, ContractRateRows, ContractRateDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contract-vehicle-rates.html',
  host: { class: 'flex flex-col gap-3' },
})
export class ContractVehicleRates {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly translate = inject(TranslateService);

  /** The contract has the night surcharge: each vehicle rate has a night price and a night call fee. */
  readonly night = input.required<boolean>();
  readonly mode = input.required<PricingMode>();
  /** The billing level of the contract; without it the question is the flat-rate one. */
  readonly level = input<BillingLevel>('FlatRate');
  /** The locations or pairs the contract has a rate for, as the page writes them; empty on a flat-rate contract. */
  readonly places = input<RatedPlace[]>([]);
  /** The vehicles that can receive a rate; null until read. */
  readonly rateable = input.required<RateableVehicle[] | null>();
  readonly failed = input(false);
  /** The page's answer: null while unanswered, an empty list for "No". */
  readonly answer = input.required<VehicleRateAnswer[] | null>();
  /** The question was reopened with "Modifica": it offers "Annulla modifica". */
  readonly cancellable = input(false);
  /** The confirmed answer: an empty list for "No". */
  readonly confirmed = output<VehicleRateAnswer[]>();
  readonly cancelled = output();
  /** The dialog opens after a failed read of the vehicles: they are read again. */
  readonly retry = output();

  protected readonly choice = linkedSignal<VehicleRateAnswer[] | null, Choice | null>({
    source: this.answer,
    computation: (answer) => (answer === null ? null : answer.length === 0 ? 'no' : 'yes'),
  });

  /** The rates being written; nothing reaches the page before "Conferma". */
  protected readonly draft = linkedSignal<VehicleRateAnswer[] | null, VehicleRateAnswer[]>({
    source: this.answer,
    computation: (answer) => answer ?? [],
  });

  /** The rate the dialog is open on: `entry` is null for a new one, `key` is the key it had when the dialog opened. */
  protected readonly dialog = signal<{
    entry: VehicleRateAnswer | null;
    key: string | null;
  } | null>(null);
  /** The message under the rows; it goes away when the night surcharge changes. */
  protected readonly notice = linkedSignal<boolean, Notice | null>({
    source: this.night,
    computation: () => null,
  });

  protected readonly keys = new ChoiceKeys();

  /** The level when it prices per location or pair, else null. */
  private readonly placeLevel = computed<LocationRateLevel | null>(() => {
    const level = this.level();
    return level === 'FlatRate' ? null : level;
  });

  protected readonly rows = computed<RateRow[]>(() => {
    const level = this.placeLevel();
    return sortVehicleRates(this.draft()).map((entry) => ({
      key: vehicleRateKey(entry),
      parts: [
        {
          mono: entry.licensePlate,
          label: entry.description,
          pill: entry.decommissioned
            ? { key: `${KEYS}.decommissioned`, tone: 'warn' as const }
            : null,
        },
      ],
      summary: rateTerms(forNight(entry, this.night()), this.mode(), this.translate),
      detail:
        level === null
          ? undefined
          : placesLine(entry, this.places().length, level, this.translate),
    }));
  });

  protected readonly line = computed(() =>
    rateDialogLine(this.level(), this.mode(), this.night(), this.translate),
  );

  protected readonly titles = computed<RateDialogTitles>(() =>
    this.placeLevel() === null
      ? { new: 'contracts.form.rateDialog.new', edit: 'contracts.form.rateDialog.edit' }
      : {
          new: 'contracts.form.rateDialog.newVehicle',
          edit: 'contracts.form.rateDialog.editVehicle',
        },
  );

  /** The fieldset of the contract's places of the open dialog; null on a flat-rate contract. */
  protected readonly placesOf = computed<RatePlaces | null>(() => {
    const level = this.placeLevel();
    const state = this.dialog();
    if (level === null || state === null) {
      return null;
    }
    const keys = `contracts.form.rateDialog.places.${level === 'PerLocationPair' ? 'pair' : 'location'}`;
    return {
      legend: `${keys}.legend`,
      hint: `${keys}.hint`,
      all: `${keys}.all`,
      required: `${keys}.required`,
      options: sortLocationRates(this.places()).map((place) => ({
        key: rowKey(place),
        label: locationRateLabel(place),
        pill: placePill(place),
      })),
      ticked: (state.entry?.places ?? []).map(rowKey),
      blocked: (ids) =>
        this.draft()
          .filter((other) => other.vehicleId === ids[0] && vehicleRateKey(other) !== state.key)
          .flatMap((other) =>
            other.places.map((place) => ({
              key: rowKey(place),
              text: this.translate.instant(`${KEYS}.places.otherRate`, {
                price: rateSummary(
                  { day: other.rate.day, night: null, callFee: null },
                  this.mode(),
                  this.translate,
                ),
              }),
            })),
          ),
    };
  });

  protected readonly subjects = computed<RateSubject[]>(() => {
    const state = this.dialog();
    if (state === null) {
      return [];
    }
    return [
      {
        label: `${KEYS}.vehicle.label`,
        placeholder: `${KEYS}.vehicle.placeholder`,
        required: `${KEYS}.vehicle.required`,
        loadFailed: `${KEYS}.vehicle.loadFailed`,
        options: this.optionsOf(state.entry, state.key),
        chosen: state.entry?.vehicleId ?? '',
        loading: this.rateable() === null && !this.failed(),
        failed: this.failed(),
        canCreate: false,
      },
    ];
  });

  /**
   * "No" is a single choice: it confirms an empty answer and clears what was entered. An arrow key
   * selects "No" and closes the rows without confirming; a click or Space/Enter confirms it.
   */
  protected pickNo(): void {
    const confirm = !this.keys.ignoreClick();
    this.choice.set('no');
    this.draft.set([]);
    this.notice.set(null);
    if (confirm) {
      this.confirmed.emit([]);
    }
  }

  /** "Sì" opens the rows and is confirmed only by "Conferma", so an arrow key selects it too. */
  protected pickYes(): void {
    this.keys.reset();
    this.choice.set('yes');
  }

  protected add(): void {
    this.open(null, null);
  }

  protected edit(key: string): void {
    const entry = this.draft().find((candidate) => vehicleRateKey(candidate) === key);
    if (entry !== undefined) {
      this.open(entry, key);
    }
  }

  private open(entry: VehicleRateAnswer | null, key: string | null): void {
    this.dialog.set({ entry, key });
    if (this.failed()) {
      this.retry.emit();
    }
  }

  /** Removing the last row leaves "Sì" chosen and the list empty. */
  protected remove(key: string): void {
    this.notice.set(null);
    this.draft.update((list) => list.filter((entry) => vehicleRateKey(entry) !== key));
  }

  protected onConfirmed(confirmed: ConfirmedRate): void {
    const editedKey = this.dialog()?.key ?? null;
    const vehicle = this.vehicleOf(confirmed.ids[0]);
    if (vehicle === null) {
      return;
    }
    const built: VehicleRateAnswer = {
      ...vehicle,
      rate: confirmed.rate,
      minimum: confirmed.minimum,
      places: confirmed.places.flatMap((key) =>
        this.places().filter((place) => rowKey(place) === key),
      ),
    };
    this.notice.set(null);
    this.draft.update((list) =>
      editedKey !== null && list.some((other) => vehicleRateKey(other) === editedKey)
        ? list.map((other) => (vehicleRateKey(other) === editedKey ? built : other))
        : [...list, built],
    );
    this.dialog.set(null);
    if (editedKey !== null) {
      this.focusRow(vehicleRateKey(built));
    }
  }

  /**
   * "Conferma": at least one vehicle rate, with a night price and call fee exactly under the night
   * surcharge. On a location level the rates of a vehicle that are equal become one.
   */
  protected confirm(): void {
    const sorted = sortVehicleRates(this.draft());
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
        key: 'contracts.form.locationRates.nightIncomplete',
        params: { label: label(sorted[incomplete]) },
      });
      this.focusRow(vehicleRateKey(sorted[incomplete]));
      return;
    }
    const answers = sorted.map((entry) => ({
      ...forNight(entry, night),
      ...this.vehicleOf(entry.vehicleId),
    }));
    this.confirmed.emit(
      sortVehicleRates(this.placeLevel() === null ? answers : mergeVehicleRates(answers)),
    );
  }

  protected focusAdd(): void {
    this.focusLater('[data-add]');
  }

  /**
   * Flat rate: the rateable vehicles without a rate. A location level: every rateable vehicle, which
   * may have several rates. Plus the row's own, even when it is not rateable any more.
   */
  private optionsOf(
    entry: VehicleRateAnswer | null,
    editedKey: string | null,
  ): RateSubjectOption[] {
    const taken = new Set(
      this.placeLevel() !== null
        ? []
        : this.draft()
            .filter((other) => editedKey === null || vehicleRateKey(other) !== editedKey)
            .map((other) => other.vehicleId),
    );
    const rateable = this.rateable() ?? [];
    return [
      ...(entry !== null && !rateable.some((vehicle) => vehicle.id === entry.vehicleId)
        ? [{ id: entry.vehicleId, label: label(entry) }]
        : []),
      ...rateable
        .filter((vehicle) => !taken.has(vehicle.id))
        .map((vehicle) => ({ id: vehicle.id, label: label(vehicle) })),
    ];
  }

  /** The vehicle as the answer holds it: a rateable one is active, one only in the draft keeps its mark. */
  private vehicleOf(
    id: string,
  ): Pick<
    VehicleRateAnswer,
    'vehicleId' | 'licensePlate' | 'description' | 'decommissioned'
  > | null {
    const rateable = this.rateable()?.find((vehicle) => vehicle.id === id);
    if (rateable !== undefined) {
      return {
        vehicleId: rateable.id,
        licensePlate: rateable.licensePlate,
        description: rateable.description,
        decommissioned: false,
      };
    }
    const own = this.draft().find((entry) => entry.vehicleId === id);
    return own === undefined
      ? null
      : {
          vehicleId: own.vehicleId,
          licensePlate: own.licensePlate,
          description: own.description,
          decommissioned: own.decommissioned,
        };
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
