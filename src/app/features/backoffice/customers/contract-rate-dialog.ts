import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { Icon, type IconName } from '../../../shared/components/icon/icon';
import { LocationFormDialog } from '../locations/location-form-dialog';
import { locationLabel } from '../locations/location-label';
import type { SavedLocation } from '../locations/locations-facade';
import type { MinimumRuleKind, PricingMode } from './contracts-api';
import {
  draftsOf,
  EMPTY_DRAFTS,
  type Drafts,
  type AmountField,
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

export interface RateSubjectOption {
  id: string;
  label: string;
}

/** One select of the dialog: the location (or vehicle) the rate is for. Texts are keys of `it.json`. */
export interface RateSubject {
  label: string;
  placeholder: string;
  required: string;
  loadFailed: string;
  options: RateSubjectOption[];
  /** The id chosen when the dialog opens; empty for none. */
  chosen: string;
  loading: boolean;
  failed: boolean;
  /** Offers "Nuovo luogo" beside the select. */
  canCreate: boolean;
}

export interface ConfirmedRate {
  /** The chosen id of each subject, in order. */
  ids: string[];
  rate: Rate;
  /** Null when the contract is priced `ByTrip`: no minimum applies. */
  minimum: Minimum | null;
}

let nextDialogId = 0;

/** The dialog of one rate: the subject select(s), the prices and the minimum, shared by the location rates and the vehicle rates. */
@Component({
  selector: 'app-contract-rate-dialog',
  imports: [TranslatePipe, Icon, Dialog, NgTemplateOutlet, LocationFormDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contract-rate-dialog.html',
  // Esc closes the dialogs themselves: it must not reach the question card the dialog sits in.
  host: { '(keydown.escape)': '$event.stopPropagation()' },
})
export class ContractRateDialog implements OnInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** The dialog edits a rate: "Modifica tariffa" and "Salva" instead of "Nuova tariffa" and "Aggiungi". */
  readonly editing = input(false);
  /** The text under the title: "<level> · <mode> · <con/senza maggiorazione notturna>". */
  readonly line = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly night = input.required<boolean>();
  readonly mode = input.required<PricingMode>();
  readonly subjects = input.required<RateSubject[]>();
  readonly rate = input<Rate | null>(null);
  readonly minimum = input<Minimum | null>(null);
  /** Refuses a combination of chosen ids: the key of the message shown under the last select, or null. */
  readonly check = input<(ids: string[]) => string | null>(() => null);
  readonly confirmed = output<ConfirmedRate>();
  readonly cancelled = output();
  /** A location created from a "Nuovo luogo" button; it is already chosen in its select. */
  readonly locationCreated = output<SavedLocation>();

  protected readonly formId = `rate-dialog-${nextDialogId++}`;
  protected readonly minimumKinds = MINIMUM_KINDS;
  protected readonly withMinimum = computed(() => this.mode() !== 'ByTrip');

  // read once from the inputs when the dialog opens: the caller's later changes do not reset them
  protected readonly chosen = signal<string[]>([]);
  protected readonly drafts = signal<Drafts>(EMPTY_DRAFTS);
  protected readonly kind = signal<MinimumRuleKind>('None');
  protected readonly errors = signal<Errors>({});
  protected readonly subjectErrors = signal<boolean[]>([]);
  protected readonly combinationError = signal<string | null>(null);
  /** The location select a "Nuovo luogo" was pressed for, while its dialog is open. */
  protected readonly creating = signal<number | null>(null);
  /** Locations created here, kept as options before the list is read again. */
  private readonly created = signal<RateSubjectOption[]>([]);

  ngOnInit(): void {
    this.chosen.set(this.subjects().map((subject) => subject.chosen));
    this.drafts.set(draftsOf(this.rate(), this.minimum()));
    this.kind.set(this.minimum()?.kind ?? 'None');
  }

  protected options(index: number): RateSubjectOption[] {
    const options = this.subjects()[index].options;
    return [...options, ...this.created().filter((c) => !options.some((o) => o.id === c.id))];
  }

  protected draft(field: AmountField): string {
    return this.drafts()[field];
  }

  protected error(field: AmountField): string | undefined {
    return this.errors()[field];
  }

  protected rateFieldsOf(): FieldSpec[] {
    return rateFields(this.night());
  }

  protected minimumFieldsOf(): FieldSpec[] {
    return minimumFields(this.kind());
  }

  protected unit(spec: FieldSpec): string {
    return unitKey(spec.unit, this.mode());
  }

  /** The night call fee keeps its hint under the field, and an error is read after it. */
  protected describedBy(spec: FieldSpec): string | null {
    const id = `${this.formId}-${spec.field}`;
    const ids = [
      ...(spec.field === 'callFee' ? [`${id}-hint`] : []),
      ...(this.error(spec.field) ? [`${id}-error`] : []),
    ];
    return ids.length > 0 ? ids.join(' ') : null;
  }

  protected isLast(index: number): boolean {
    return index === this.subjects().length - 1;
  }

  /** The message under a select: a failed read, a missing choice, or the refused combination under the last. */
  protected note(index: number): string | null {
    const subject = this.subjects()[index];
    if (subject.failed) {
      return subject.loadFailed;
    }
    if (this.subjectErrors()[index]) {
      return subject.required;
    }
    return this.isLast(index) ? this.combinationError() : null;
  }

  protected invalid(index: number): boolean {
    return (
      this.subjects()[index].failed ||
      !!this.subjectErrors()[index] ||
      (this.isLast(index) && this.combinationError() !== null)
    );
  }

  protected choose(index: number, id: string): void {
    this.chosen.update((chosen) => chosen.map((value, at) => (at === index ? id : value)));
    this.subjectErrors.update((flags) => flags.map((flag, at) => (at === index ? false : flag)));
    this.combinationError.set(null);
  }

  protected setDraft(field: AmountField, value: string): void {
    this.drafts.update((drafts) => ({ ...drafts, [field]: value }));
  }

  /** Picking a kind keeps the errors of the price fields, drops those of the minimum fields. */
  protected pickKind(kind: MinimumRuleKind): void {
    const current = this.errors();
    const errors: Errors = {};
    for (const field of ['day', 'night', 'callFee'] as const) {
      const error = current[field];
      if (error) {
        errors[field] = error;
      }
    }
    this.kind.set(kind);
    this.errors.set(errors);
  }

  protected onCreated(location: SavedLocation): void {
    const index = this.creating();
    if (index === null) {
      return;
    }
    this.created.update((created) => [
      ...created,
      { id: location.id, label: locationLabel(location) },
    ]);
    this.choose(index, location.id);
    this.locationCreated.emit(location);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const specs = [
      ...rateFields(this.night()),
      ...(this.withMinimum() ? minimumFields(this.kind()) : []),
    ];
    const { values, errors } = readFields(specs, this.drafts());
    const ids = this.chosen();
    const missing = ids.map((id) => id === '');
    const combination = missing.includes(true) ? null : this.check()(ids);
    this.errors.set(errors);
    this.subjectErrors.set(missing);
    this.combinationError.set(combination);
    if (Object.keys(errors).length > 0 || missing.includes(true) || combination !== null) {
      afterNextRender(
        {
          read: () =>
            this.host.nativeElement
              .querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)')
              ?.focus(),
        },
        { injector: this.injector },
      );
      return;
    }
    this.confirmed.emit({
      ids,
      rate: toRate(values),
      minimum: this.withMinimum() ? toMinimum(this.kind(), values) : null,
    });
  }
}
