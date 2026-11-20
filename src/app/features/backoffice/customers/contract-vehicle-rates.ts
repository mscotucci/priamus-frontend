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
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ContractKeys } from './contract-keys';
import { ChoiceKeys } from './choice-keys';
import { Icon } from '../../../shared/components/icon/icon';
import type { RateableVehicle } from '../vehicles/vehicles-api';
import type { MinimumRuleKind, PricingMode } from './contracts-api';
import {
  draftsOf,
  EMPTY_DRAFTS,
  type AmountField,
  type Drafts,
  type Errors,
  type FieldSpec,
  type Minimum,
  MINIMUM_KINDS,
  minimumFields,
  type Rate,
  rateFields,
  readFields,
  toMinimum,
  toRate,
  unitKey,
} from './contract-rate';

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

/** A vehicle of the answer, kept so that it stays selectable in its own block even when it is not rateable any more. */
type Retained = Pick<
  VehicleRateAnswer,
  'vehicleId' | 'licensePlate' | 'description' | 'decommissioned'
>;

interface Block {
  key: number;
  vehicleId: string;
  retained: Retained | null;
  drafts: Drafts;
  kind: MinimumRuleKind;
  errors: Errors;
  vehicleError: boolean;
}

interface VehicleOption {
  id: string;
  label: string;
}

type Choice = 'no' | 'yes';

/** The body of question 8 while it is open: "No", or "Sì" with one block per vehicle that has a rate of its own. */
@Component({
  selector: 'app-contract-vehicle-rates',
  imports: [TranslatePipe, Icon, NgTemplateOutlet, ContractKeys],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contract-vehicle-rates.html',
  host: { class: 'flex flex-col gap-3' },
})
export class ContractVehicleRates {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** The contract has the night surcharge: each vehicle rate has a night price and a night call fee. */
  readonly night = input.required<boolean>();
  readonly mode = input.required<PricingMode>();
  /** The vehicles that can receive a rate; null until read. */
  readonly rateable = input.required<RateableVehicle[] | null>();
  readonly loading = input(false);
  readonly failed = input(false);
  /** The page's answer: null while unanswered, an empty list for "No". */
  readonly answer = input.required<VehicleRateAnswer[] | null>();
  /** The confirmed answer: an empty list for "No". */
  /** The question was reopened with "Modifica": it offers "Annulla modifica". */
  readonly cancellable = input(false);
  readonly confirmed = output<VehicleRateAnswer[]>();
  readonly cancelled = output();

  private nextKey = 0;

  protected readonly choice = linkedSignal<VehicleRateAnswer[] | null, Choice | null>({
    source: this.answer,
    computation: (answer) => (answer === null ? null : answer.length === 0 ? 'no' : 'yes'),
  });

  protected readonly blocks = linkedSignal<VehicleRateAnswer[] | null, Block[]>({
    source: this.answer,
    computation: (answer) =>
      (answer ?? []).map((entry) => ({
        key: this.nextKey++,
        vehicleId: entry.vehicleId,
        retained: entry,
        drafts: draftsOf(entry.rate, entry.minimum),
        kind: entry.minimum?.kind ?? 'None',
        errors: {},
        vehicleError: false,
      })),
  });

  protected readonly minimumKinds = MINIMUM_KINDS;
  protected readonly withMinimum = computed(() => this.mode() !== 'ByTrip');

  protected readonly keys = new ChoiceKeys();

  /** "No" is a single choice: it confirms an empty answer and clears what was entered. */
  /** An arrow key selects "No" and closes the blocks without confirming; a click or Space/Enter confirms it. */
  protected pickNo(): void {
    const confirm = !this.keys.ignoreClick();
    this.choice.set('no');
    this.blocks.set([]);
    if (confirm) {
      this.confirmed.emit([]);
    }
  }

  /** "Sì" opens the blocks and is confirmed only by "Conferma", so an arrow key selects it too. */
  protected pickYes(): void {
    this.keys.reset();
    if (this.choice() === 'yes') {
      return;
    }
    this.choice.set('yes');
    this.blocks.set([this.newBlock()]);
  }

  protected addBlock(): void {
    const block = this.newBlock();
    this.blocks.update((blocks) => [...blocks, block]);
    this.focusLater(`#vr${block.key}-vehicle`);
  }

  /** Removing the last block leaves the question unanswered. */
  protected removeBlock(key: number): void {
    const blocks = this.blocks().filter((block) => block.key !== key);
    this.blocks.set(blocks);
    if (blocks.length === 0) {
      this.choice.set(null);
      this.focusLater('input[name="vehicle-rates"]');
    } else {
      this.focusLater('[data-add]');
    }
  }

  protected setVehicle(key: number, vehicleId: string): void {
    this.patch(key, { vehicleId, vehicleError: false });
  }

  protected setDraft(key: number, field: AmountField, value: string): void {
    this.blocks.update((blocks) =>
      blocks.map((block) =>
        block.key === key ? { ...block, drafts: { ...block.drafts, [field]: value } } : block,
      ),
    );
  }

  /** Picking a kind only selects it ("Conferma" confirms the question), so an arrow key picks it too. */
  protected pickKind(key: number, kind: MinimumRuleKind): void {
    this.keys.reset();
    const current = this.blocks().find((block) => block.key === key)!.errors;
    const errors: Errors = {};
    for (const field of ['day', 'night', 'callFee'] as const) {
      const error = current[field];
      if (error) {
        errors[field] = error;
      }
    }
    this.patch(key, { kind, errors });
  }

  protected rateFieldsOf(): FieldSpec[] {
    return rateFields(this.night());
  }

  protected minimumFieldsOf(block: Block): FieldSpec[] {
    return minimumFields(block.kind);
  }

  protected unit(spec: FieldSpec): string {
    return unitKey(spec.unit, this.mode());
  }

  /** The night call fee keeps its hint under the field, and an error is read after it. */
  protected describedBy(block: Block, spec: FieldSpec): string | null {
    const id = `vr${block.key}-${spec.field}`;
    const ids = [
      ...(spec.field === 'callFee' ? [`${id}-hint`] : []),
      ...(block.errors[spec.field] ? [`${id}-error`] : []),
    ];
    return ids.length > 0 ? ids.join(' ') : null;
  }

  /** The rateable vehicles not chosen in another block, plus the block's own when it is no longer rateable. */
  protected options(block: Block): VehicleOption[] {
    const chosenElsewhere = new Set(
      this.blocks()
        .filter((other) => other.key !== block.key)
        .map((other) => other.vehicleId),
    );
    const rateable = this.rateable() ?? [];
    const own =
      block.retained !== null &&
      block.retained.vehicleId === block.vehicleId &&
      !rateable.some((vehicle) => vehicle.id === block.vehicleId)
        ? [{ id: block.retained.vehicleId, label: this.label(block.retained) }]
        : [];
    return [
      ...own,
      ...rateable
        .filter((vehicle) => !chosenElsewhere.has(vehicle.id))
        .map((vehicle) => ({ id: vehicle.id, label: this.label(vehicle) })),
    ];
  }

  protected decommissioned(block: Block): boolean {
    return (
      block.retained !== null &&
      block.retained.vehicleId === block.vehicleId &&
      block.retained.decommissioned
    );
  }

  protected confirm(): void {
    const answers: VehicleRateAnswer[] = [];
    const checked = this.blocks().map((block) => {
      const specs = [
        ...rateFields(this.night()),
        ...(this.withMinimum() ? minimumFields(block.kind) : []),
      ];
      const { values, errors } = readFields(specs, block.drafts);
      const vehicle = this.vehicleOf(block);
      if (vehicle !== null && Object.keys(errors).length === 0) {
        answers.push({
          ...vehicle,
          rate: toRate(values),
          minimum: this.withMinimum() ? toMinimum(block.kind, values) : null,
        });
      }
      return { ...block, errors, vehicleError: vehicle === null };
    });
    this.blocks.set(checked);
    if (answers.length < checked.length) {
      this.focusLater('[aria-invalid="true"]');
      return;
    }
    this.confirmed.emit(answers);
  }

  private vehicleOf(block: Block): Retained | null {
    const rateable = this.rateable()?.find((vehicle) => vehicle.id === block.vehicleId);
    if (rateable !== undefined) {
      return {
        vehicleId: rateable.id,
        licensePlate: rateable.licensePlate,
        description: rateable.description,
        decommissioned: false,
      };
    }
    return block.retained !== null && block.retained.vehicleId === block.vehicleId
      ? block.retained
      : null;
  }

  private label(vehicle: { licensePlate: string; description: string }): string {
    return `${vehicle.licensePlate} · ${vehicle.description}`;
  }

  private newBlock(): Block {
    return {
      key: this.nextKey++,
      vehicleId: '',
      retained: null,
      drafts: EMPTY_DRAFTS,
      kind: 'None',
      errors: {},
      vehicleError: false,
    };
  }

  private patch(key: number, change: Partial<Block>): void {
    this.blocks.update((blocks) =>
      blocks.map((block) => (block.key === key ? { ...block, ...change } : block)),
    );
  }

  private focusLater(selector: string): void {
    afterNextRender(
      { read: () => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus() },
      { injector: this.injector },
    );
  }
}
