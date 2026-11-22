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
import { rateDialogLine, rateTerms, sortVehicleRates } from './contract-labels';
import { forNight, type Minimum, type Rate } from './contract-rate';
import {
  ContractRateDialog,
  type ConfirmedRate,
  type RateSubject,
  type RateSubjectOption,
} from './contract-rate-dialog';
import { ContractRateRows, type RateRow } from './contract-rate-rows';
import type { PricingMode } from './contracts-api';

/** A vehicle with a rate of its own, as the contract page holds it once question 8 is answered. */
export interface VehicleRateAnswer {
  vehicleId: string;
  licensePlate: string;
  description: string;
  decommissioned: boolean;
  rate: Rate;
  /** Null when the contract is priced `ByTrip`: no minimum applies. */
  minimum: Minimum | null;
}

type Choice = 'no' | 'yes';

const KEYS = 'contracts.form.vehicleRates';

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

  /** The rate the dialog is open on: `entry` is null for a new one, `key` is the vehicle it had when the dialog opened. */
  protected readonly dialog = signal<{
    entry: VehicleRateAnswer | null;
    key: string | null;
  } | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly keys = new ChoiceKeys();

  protected readonly rows = computed<RateRow[]>(() =>
    sortVehicleRates(this.draft()).map((entry) => ({
      key: entry.vehicleId,
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
    })),
  );

  protected readonly line = computed(() =>
    rateDialogLine('FlatRate', this.mode(), this.night(), this.translate),
  );

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
    const entry = this.draft().find((candidate) => candidate.vehicleId === key);
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
    this.draft.update((list) => list.filter((entry) => entry.vehicleId !== key));
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
    };
    this.notice.set(null);
    this.draft.update((list) =>
      editedKey !== null && list.some((other) => other.vehicleId === editedKey)
        ? list.map((other) => (other.vehicleId === editedKey ? built : other))
        : [...list, built],
    );
    this.dialog.set(null);
    if (editedKey !== null) {
      this.focusRow(built.vehicleId);
    }
  }

  /** "Conferma": at least one vehicle rate, with a night price and call fee only under the night surcharge. */
  protected confirm(): void {
    if (this.draft().length === 0) {
      this.notice.set(`${KEYS}.required`);
      this.focusLater('[data-add]');
      return;
    }
    this.confirmed.emit(
      sortVehicleRates(
        this.draft().map((entry) => ({
          ...forNight(entry, this.night()),
          ...this.vehicleOf(entry.vehicleId),
        })),
      ),
    );
  }

  protected focusAdd(): void {
    this.focusLater('[data-add]');
  }

  /** The rateable vehicles without a rate, plus the row's own, even when it is not rateable any more. */
  private optionsOf(
    entry: VehicleRateAnswer | null,
    editedKey: string | null,
  ): RateSubjectOption[] {
    const taken = new Set(
      this.draft()
        .filter((other) => editedKey === null || other.vehicleId !== editedKey)
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
    return this.draft().find((entry) => entry.vehicleId === id) ?? null;
  }

  /** The "Modifica" of the row of that vehicle: an edit that changes the vehicle makes a new row, the old control is gone. */
  private focusRow(vehicleId: string): void {
    const index = this.rows().findIndex((row) => row.key === vehicleId);
    this.focusLater(`li:nth-child(${index + 1}) [data-edit]`);
  }

  private focusLater(selector: string): void {
    afterNextRender(
      { read: () => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus() },
      { injector: this.injector },
    );
  }
}
