import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiError, fieldErrors, noticeOf } from '../../../core/api/api-error';
import { Topbar } from '../../../core/layout/topbar';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { Notice } from '../../../shared/components/notice/notice';
import { LeaveConfirmation } from '../../../shared/guards/leave-confirmation';
import type { LeaveConfirmable } from '../../../shared/guards/unsaved-changes-guard';
import {
  CONTRACT_STATUS_PILL,
  dayBefore,
  documentsSentence,
  fixedExample,
  minimumSummary,
  rateSummary,
  tieredExample,
} from './contract-labels';
import { ContractQuestion } from './contract-question';
import {
  AmountField,
  Drafts,
  EMPTY_DRAFTS,
  Errors,
  FieldSpec,
  MINIMUM_KINDS,
  Minimum,
  Rate,
  draftsOf,
  minimumFields,
  minimumOfContract,
  rateFields,
  rateMembers,
  rateOfContract,
  readFields,
  toMinimum,
  toRate,
  unitKey,
} from './contract-rate';
import {
  BillingLevel,
  Contract,
  MinimumRuleKind,
  PricingMode,
  RequiredDocument,
} from './contracts-api';
import { CustomersFacade } from './customers-facade';

const CONCURRENT_UPDATE = 'Registry.Contract.ConcurrentUpdate';

type ChangeScope = 'from' | 'always';

const DOCUMENTS: RequiredDocument[] = ['DeliveryNote', 'DeliverySlip', 'WasteForm', 'DailySummary'];

type Which = 'pickup' | 'delivery' | 'both';
type YesNo = 'yes' | 'no';

interface RadioAnswers {
  locations: YesNo | null;
  which: Which | null;
  mode: PricingMode | null;
  night: YesNo | null;
}

type RadioId = keyof RadioAnswers;

interface Choice {
  value: string;
  /** Key of the choice's title, hint and collapsed answer, under `contracts.form.`. */
  key: string;
  /** The answers with this choice picked for its question. */
  apply: (answers: RadioAnswers) => RadioAnswers;
}

interface RadioQuestion {
  number: number;
  id: RadioId;
  grid: string;
  choices: Choice[];
}

const choice = <K extends RadioId>(
  id: K,
  value: NonNullable<RadioAnswers[K]>,
  key: string,
): Choice => ({ value, key, apply: (answers) => ({ ...answers, [id]: value }) });

const RADIO_QUESTIONS: RadioQuestion[] = [
  {
    number: 2,
    id: 'locations',
    grid: 'max-w-md grid-cols-1 sm:grid-cols-2',
    choices: [
      choice('locations', 'no', 'locations.no'),
      choice('locations', 'yes', 'locations.yes'),
    ],
  },
  {
    number: 3,
    id: 'which',
    grid: 'grid-cols-1 md:grid-cols-3',
    choices: [
      choice('which', 'pickup', 'which.pickup'),
      choice('which', 'delivery', 'which.delivery'),
      choice('which', 'both', 'which.both'),
    ],
  },
  {
    number: 4,
    id: 'mode',
    grid: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
    choices: [
      choice('mode', 'ByHour', 'mode.byhour'),
      choice('mode', 'ByWeight', 'mode.byweight'),
      choice('mode', 'ByDistance', 'mode.bydistance'),
      choice('mode', 'ByTrip', 'mode.bytrip'),
    ],
  },
  {
    number: 5,
    id: 'night',
    grid: 'max-w-md grid-cols-1 sm:grid-cols-2',
    choices: [choice('night', 'no', 'night.no'), choice('night', 'yes', 'night.yes')],
  },
];

const WHICH_BY_BILLING: Partial<Record<BillingLevel, Which>> = {
  PerPickupLocation: 'pickup',
  PerDeliveryLocation: 'delivery',
  PerLocationPair: 'both',
};

const BILLING_BY_WHICH: Record<Which, BillingLevel> = {
  pickup: 'PerPickupLocation',
  delivery: 'PerDeliveryLocation',
  both: 'PerLocationPair',
};

/** The values of the minimum's example until the user's own ones are complete. */
const SAMPLE_MINIMUM: Minimum = { kind: 'TieredOverage', amount: 50, threshold: 4, overage: 12 };

@Component({
  selector: 'app-contract-page',
  imports: [
    Topbar,
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    TranslatePipe,
    Notice,
    ContractQuestion,
    Dialog,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col', '(window:beforeunload)': 'warnBeforeUnload($event)' },
  templateUrl: './contract-page.html',
})
export class ContractPage implements LeaveConfirmable {
  protected readonly facade = inject(CustomersFacade);
  private readonly translate = inject(TranslateService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly radioQuestions = RADIO_QUESTIONS;
  protected readonly documentChoices = DOCUMENTS;
  protected readonly minimumKinds = MINIMUM_KINDS;
  protected readonly statusPill = CONTRACT_STATUS_PILL;

  protected readonly customerId = signal('');
  protected readonly contractId = signal<string | null>(null);
  /** The answers of an existing contract are in; they are taken once per open. */
  protected readonly seeded = signal(false);
  /** The version the answers were seeded from: the one a save sends, whatever was read since. */
  private seededVersion = 0;

  /** The save succeeded: nothing is unsaved, whatever the answers are. */
  private readonly saved = signal(false);
  private pendingSave: Promise<unknown> = Promise.resolve();
  /** Settles the open "Uscire senza salvare?" dialog: true leaves, false stays. */
  protected readonly leaveDecision = signal<((leave: boolean) => void) | null>(null);
  private readonly stayButton = viewChild<ElementRef<HTMLButtonElement>>('stay');

  /** The question being reopened with "Modifica". */
  protected readonly editing = signal<number | null>(null);
  protected readonly fromDraft = signal('');
  protected readonly toDraft = signal('');
  protected readonly validityErrors = signal<{ from?: string; to?: string }>({});
  protected readonly validity = signal<{ from: string; to: string | null } | null>(null);
  protected readonly radio = signal<RadioAnswers>({
    locations: null,
    which: null,
    mode: null,
    night: null,
  });
  protected readonly documentsDraft = signal<RequiredDocument[]>([]);
  protected readonly documents = signal<RequiredDocument[] | null>(null);
  /** The amounts typed in questions 6 and 7, and the message under each one that does not hold. */
  protected readonly drafts = signal<Drafts>(EMPTY_DRAFTS);
  protected readonly fieldErrors = signal<Errors>({});
  protected readonly minimumKindDraft = signal<MinimumRuleKind | null>(null);
  protected readonly rate = signal<Rate | null>(null);
  protected readonly minimum = signal<Minimum | null>(null);

  /** A contract answered "No" to the locations has the one flat rate; any other has none to set here. */
  protected readonly flat = computed(() => this.radio().locations !== 'yes');
  protected readonly rateFieldSpecs = computed(() => rateFields(this.radio().night === 'yes'));
  protected readonly minimumFieldSpecs = computed(() => minimumFields(this.minimumKindDraft()));
  /** Under a tiered overage whose three values hold: the formula worked on a trip. */
  /**
   * An example under the minimum being chosen: with the typed values once they all hold, with
   * sample ones until then, so the rule reads before anything is typed.
   */
  protected readonly example = computed(() => {
    const mode = this.radio().mode;
    const kind = this.minimumKindDraft();
    if (mode === null || mode === 'ByTrip' || kind === null || kind === 'None') {
      return null;
    }
    const { values, errors } = readFields(minimumFields(kind), this.drafts());
    const typed = Object.keys(errors).length === 0;
    return kind === 'FixedMinimum'
      ? fixedExample(typed ? values.amount! : SAMPLE_MINIMUM.amount!, this.translate)
      : tieredExample(
          typed ? toMinimum('TieredOverage', values) : SAMPLE_MINIMUM,
          mode,
          this.translate,
        );
  });

  /** The billing level the answers to questions 2 and 3 stand for, for the save. */
  readonly billingLevel = computed<BillingLevel | null>(() => {
    const { locations, which } = this.radio();
    if (locations === 'no') {
      return 'FlatRate';
    }
    return locations === 'yes' && which !== null ? BILLING_BY_WHICH[which] : null;
  });

  /** The confirmed answers, as text, to compare with the loaded ones. */
  private readonly answersSnapshot = computed(() =>
    JSON.stringify([this.validity(), this.radio(), this.rate(), this.minimum(), this.documents()]),
  );
  /** The answers the page started from: none on a new contract, the loaded ones on an existing one. */
  private readonly baseline = signal(this.answersSnapshot());

  /** The answers that are the contract's terms: everything but its validity. */
  private readonly termsSnapshot = computed(() =>
    JSON.stringify([this.radio(), this.rate(), this.minimum(), this.documents()]),
  );
  private readonly baselineTerms = signal(this.termsSnapshot());

  /** A new contract has an answer, or an existing one has an answer different from the loaded one. */
  protected readonly hasUnsavedChanges = computed(
    () => !this.saved() && this.answersSnapshot() !== this.baseline(),
  );

  private readonly shownQuestions = computed(() => {
    const { locations, mode } = this.radio();
    return locations === 'yes'
      ? [1, 2, 3, 4, 5, 6, 8]
      : mode === 'ByTrip'
        ? [1, 2, 4, 5, 6, 8]
        : [1, 2, 4, 5, 6, 7, 8];
  });

  private readonly answered = computed(() => {
    const radio = this.radio();
    return new Map<number, boolean>([
      [1, this.validity() !== null],
      [2, radio.locations !== null],
      [3, radio.which !== null],
      [4, radio.mode !== null],
      [5, radio.night !== null],
      [
        6,
        this.flat()
          ? this.rate() !== null
          : this.billingLevel() !== null && radio.mode !== null && radio.night !== null,
      ],
      [7, this.minimum() !== null],
      [8, this.documents() !== null],
    ]);
  });

  /** Every shown question has an answer. */
  protected readonly complete = computed(() =>
    this.shownQuestions().every((number) => this.answered().get(number)),
  );

  protected readonly isNew = computed(() => this.contractId() === null);
  protected readonly notFound = computed(
    () => this.facade.customerNotFound() || (!this.isNew() && this.facade.contractNotFound()),
  );
  protected readonly loadFailed = computed(
    () =>
      !!this.facade.customer.error() ||
      (this.isNew() ? !!this.facade.contracts.error() : !!this.facade.contract.error()),
  );
  /** A deactivated customer takes no new contract: the page says so before any question is asked. */
  protected readonly deactivated = computed(
    () =>
      this.isNew() &&
      this.facade.customer.hasValue() &&
      this.facade.customer.value().status !== 'Active',
  );
  /** The contract of a deactivated customer is shown, not edited. */
  protected readonly readOnly = computed(
    () =>
      !this.isNew() &&
      this.facade.customer.hasValue() &&
      this.facade.customer.value().status !== 'Active',
  );
  protected readonly ready = computed(() =>
    this.isNew()
      ? this.facade.customer.hasValue()
      : this.seeded() && this.facade.customer.hasValue(),
  );

  private readonly refusal = signal<ApiError | null>(null);

  /** The open contract the new one closes (RF-18): the customer's open contract starting before "Dal". */
  protected readonly closing = computed(() => {
    const validity = this.validity();
    if (!this.isNew() || validity === null || !this.facade.contracts.hasValue()) {
      return null;
    }
    const open = this.facade.contracts
      .value()
      .find((contract) => !contract.validTo && contract.validFrom < validity.from);
    if (!open) {
      return null;
    }
    return { from: open.validFrom, closedOn: dayBefore(validity.from) };
  });

  /** The refusal as a notice at the top; a 400 that only names "Dal" or "Al" shows under them instead. */
  protected readonly notice = computed(() => {
    const refusal = this.refusal();
    if (refusal === null || this.onlyValidityRefused(refusal)) {
      return null;
    }
    return noticeOf(refusal);
  });
  protected readonly stale = computed(() => {
    const refusal = this.refusal();
    return refusal?.kind === 'domain' && refusal.errorCode === CONCURRENT_UPDATE;
  });
  protected readonly fromRefusal = computed(() => this.refusalTexts('ValidFrom'));
  protected readonly toRefusal = computed(() => this.refusalTexts('ValidTo'));

  protected readonly saving = this.facade.savingContract;

  /** Every shown question is answered and confirmed, and the contract to update is current. */
  protected readonly canSave = computed(
    () =>
      !this.saved() &&
      !this.deactivated() &&
      !this.readOnly() &&
      this.complete() &&
      this.editing() === null &&
      !this.stale() &&
      !this.facade.contract.isLoading() &&
      (this.isNew() ? this.facade.contracts.hasValue() : this.facade.contract.hasValue()),
  );

  /** The dialog "Da quando valgono le modifiche?" is open. */
  protected readonly changeDialog = signal(false);
  protected readonly changeScope = signal<ChangeScope | null>(null);
  protected readonly changeFromDraft = signal('');
  protected readonly changeFromError = signal<string | null>(null);
  protected readonly changeFromRefusal = signal<string[]>([]);

  /** The message under the date for a draft that cannot be sent; null when it can. */
  private changeFromProblem(date: string): string | null {
    const validity = this.validity();
    if (!date) {
      return 'contracts.form.change.from.required';
    }
    return validity !== null &&
      (date <= validity.from || (validity.to !== null && date > validity.to))
      ? 'contracts.form.change.from.outside'
      : null;
  }

  /** What "Da una data" will do, for a valid date: the written validity cut at it. */
  protected readonly changePlan = computed(() => {
    const validity = this.validity();
    const date = this.changeFromDraft();
    if (
      this.changeScope() !== 'from' ||
      validity === null ||
      this.changeFromProblem(date) !== null
    ) {
      return null;
    }
    return {
      from: validity.from,
      closedOn: dayBefore(date),
      changeFrom: date,
      to: validity.to,
    };
  });

  constructor() {
    inject(DestroyRef).onDestroy(inject(LeaveConfirmation).register(this));
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.customerId.set(params.get('customerId')!);
        this.contractId.set(params.get('contractId'));
        this.seeded.set(false);
        this.saved.set(false);
        this.refusal.set(null);
        this.retry();
      });
    effect(() => {
      const contract = this.facade.contract;
      if (
        !this.isNew() &&
        !this.seeded() &&
        contract.status() === 'resolved' &&
        contract.hasValue()
      ) {
        untracked(() => {
          this.seed(contract.value());
          this.seeded.set(true);
        });
      }
    });
  }

  private refusalTexts(field: string): string[] {
    const refusal = this.refusal();
    return refusal === null ? [] : fieldErrors(refusal, field);
  }

  /** A 400 whose every field is "Dal" or "Al": the messages show under them, not at the top. */
  private onlyValidityRefused(refusal: ApiError): boolean {
    return (
      refusal.kind === 'validation' &&
      Object.keys(refusal.errors).length > 0 &&
      Object.keys(refusal.errors).every((field) => /^valid(from|to)$/i.test(field))
    );
  }

  private validityRefusal(): boolean {
    return this.fromRefusal().length > 0 || this.toRefusal().length > 0;
  }

  protected retry(): void {
    this.facade.openCustomer(this.customerId());
    this.facade.openContract(this.contractId());
  }

  private seed(contract: Contract): void {
    this.seededVersion = contract.version;
    const flat = contract.billingLevel === 'FlatRate';
    this.validity.set({ from: contract.validFrom, to: contract.validTo ?? null });
    this.fromDraft.set(contract.validFrom);
    this.toDraft.set(contract.validTo ?? '');
    this.radio.set({
      locations: flat ? 'no' : 'yes',
      which: WHICH_BY_BILLING[contract.billingLevel] ?? null,
      mode: contract.pricingMode,
      night: contract.nightSurcharge ? 'yes' : 'no',
    });
    this.rate.set(rateOfContract(contract));
    this.minimum.set(minimumOfContract(contract));
    this.drafts.set(draftsOf(this.rate(), this.minimum()));
    this.minimumKindDraft.set(this.minimum()?.kind ?? null);
    this.fieldErrors.set({});
    this.documents.set(contract.requiredDocuments);
    this.documentsDraft.set(contract.requiredDocuments);
    this.editing.set(null);
    this.baseline.set(this.answersSnapshot());
    this.baselineTerms.set(this.termsSnapshot());
  }

  /** A question shows once it is answered or every question before it is. */
  protected visible(number: number): boolean {
    const order = this.shownQuestions();
    return (
      order.includes(number) &&
      (!!this.answered().get(number) ||
        order.slice(0, order.indexOf(number)).every((before) => this.answered().get(before)))
    );
  }

  /** A shown question is open while it is unanswered or being reopened. */
  protected open(number: number): boolean {
    return !this.answered().get(number) || this.editing() === number;
  }

  /** The one current step: the question being reopened, else the first unanswered one. */
  protected current(number: number): boolean {
    const editing = this.editing();
    return editing !== null
      ? editing === number
      : this.shownQuestions().find((n) => !this.answered().get(n)) === number;
  }

  protected edit(number: number): void {
    this.resetDrafts(number);
    this.editing.set(number);
    this.focusStep();
  }

  /** "Annulla modifica": the reopened question closes on the answer it had, nothing else changes. */
  protected cancelEdit(): void {
    const number = this.editing();
    if (number === null) {
      return;
    }
    this.resetDrafts(number);
    this.editing.set(null);
    afterNextRender(
      {
        read: () => {
          const card = Array.from(
            this.host.nativeElement.querySelectorAll<HTMLElement>('.pt-question'),
          ).find(
            (question) =>
              question.querySelector('.pt-question__number')?.textContent?.trim() === `${number}`,
          );
          card?.querySelector<HTMLElement>('button')?.focus();
        },
      },
      { injector: this.injector },
    );
  }

  /** The drafts of a question go back to its answer. */
  private resetDrafts(number: number): void {
    const validity = this.validity();
    if (number === 1 && validity) {
      this.fromDraft.set(validity.from);
      this.toDraft.set(validity.to ?? '');
      this.validityErrors.set({});
    }
    if (number === 6 || number === 7) {
      // Questions 6 and 7 share the drafts: only this question's fields go back.
      const fields: AmountField[] =
        number === 6 ? ['day', 'night', 'callFee'] : ['amount', 'threshold', 'overage'];
      const saved = draftsOf(this.rate(), this.minimum());
      this.drafts.update((drafts) => ({
        ...drafts,
        ...Object.fromEntries(fields.map((field) => [field, saved[field]])),
      }));
      this.fieldErrors.update((errors) =>
        Object.fromEntries(
          Object.entries(errors).filter(([field]) => !fields.includes(field as AmountField)),
        ),
      );
      if (number === 7) {
        this.minimumKindDraft.set(this.minimum()?.kind ?? null);
      }
    }
    if (number === 8) {
      this.documentsDraft.set(this.documents() ?? []);
    }
  }

  /**
   * An answer closes its card and "Modifica" opens one, so the control that had the focus is gone:
   * the focus moves to the step the page is on, or to the final "Salva contratto" once every
   * question is answered.
   */
  private focusStep(): void {
    afterNextRender(
      {
        read: () => {
          const focused = document.activeElement;
          if (focused !== null && focused !== document.body && focused.isConnected) {
            return;
          }
          const root = this.host.nativeElement;
          const step = root.querySelector('[aria-current="step"]');
          const target =
            step?.querySelector<HTMLElement>('input:checked') ??
            step?.querySelector<HTMLElement>('input') ??
            root.querySelector<HTMLElement>('main > section.pt-card button');
          target?.focus();
        },
      },
      { injector: this.injector },
    );
  }

  protected confirmValidity(): void {
    const from = this.fromDraft();
    const to = this.toDraft();
    const errors: { from?: string; to?: string } = {};
    if (!from) {
      errors.from = 'contracts.form.q1.from.required';
    }
    if (from && to && to < from) {
      errors.to = 'contracts.form.q1.to.beforefrom';
    }
    this.validityErrors.set(errors);
    if (errors.from || errors.to) {
      return;
    }
    this.validity.set({ from, to: to || null });
    this.refusal.set(null);
    this.editing.set(null);
    this.focusStep();
  }

  /**
   * Answering question 2 with "No" drops question 3 and its answer. A new pricing mode, or leaving
   * the flat rate, clears the rate and the minimum; removing the night surcharge clears the night
   * price and the night call fee; adding it asks the rate again. Every other answer stays.
   */
  protected pick(question: RadioQuestion, picked: Choice): void {
    if (this.arrowMoved) {
      this.arrowMoved = false;
      return;
    }
    const before = this.radio();
    const after = {
      ...picked.apply(before),
      ...(question.id === 'locations' && picked.value === 'no' ? { which: null } : {}),
    };
    this.radio.set(after);
    if (after.mode !== before.mode || (after.locations === 'yes' && before.locations !== 'yes')) {
      this.rate.set(null);
      this.minimum.set(null);
      this.drafts.set(EMPTY_DRAFTS);
      this.minimumKindDraft.set(null);
      this.fieldErrors.set({});
    } else if (before.night === 'yes' && after.night === 'no') {
      this.rate.update((rate) => (rate ? { ...rate, night: null, callFee: null } : rate));
      this.drafts.update((drafts) => ({ ...drafts, night: '', callFee: '' }));
    } else if (before.night !== 'yes' && after.night === 'yes') {
      this.rate.set(null);
    }
    if (this.editing() === question.number) {
      this.editing.set(null);
    }
    this.focusStep();
  }

  /** Set while an arrow key moves a radio selection: it suppresses the click that key fires. */
  private arrowMoved = false;

  /** An arrow key moves a radio selection without confirming it: the click it fires is ignored. */
  protected choiceKeyDown(event: KeyboardEvent): void {
    if (event.key.startsWith('Arrow')) {
      this.arrowMoved = true;
    }
  }

  /** Space and Enter confirm the focused choice, as a click does: the template then picks it. */
  protected confirmChoice(event: Event): void {
    event.preventDefault();
    this.arrowMoved = false;
  }

  protected choiceKeyUp(event: KeyboardEvent): void {
    this.arrowMoved = false;
    if (event.key === ' ') {
      event.preventDefault();
    }
  }

  /** The key of the unit add-on of a field, by the pricing mode answered. */
  protected unit(spec: FieldSpec): string {
    return unitKey(spec.unit, this.radio().mode!);
  }

  protected draft(spec: FieldSpec): string {
    return this.drafts()[spec.field];
  }

  protected fieldError(spec: FieldSpec): string | undefined {
    return this.fieldErrors()[spec.field];
  }

  /** The night call fee keeps its hint under the field, and an error is read after it. */
  protected describedBy(prefix: string, spec: FieldSpec): string | null {
    const ids = [
      ...(spec.field === 'callFee' ? [`${prefix}${spec.field}-hint`] : []),
      ...(this.fieldError(spec) ? [`${prefix}${spec.field}-error`] : []),
    ];
    return ids.length > 0 ? ids.join(' ') : null;
  }

  protected setDraft(field: keyof Drafts, value: string): void {
    this.drafts.update((drafts) => ({ ...drafts, [field]: value }));
  }

  /** Picking a kind only selects it ("Conferma" confirms the question), so an arrow key picks it too. */
  protected pickMinimumKind(kind: MinimumRuleKind): void {
    this.arrowMoved = false;
    this.minimumKindDraft.set(kind);
    this.fieldErrors.set({});
  }

  protected confirmRate(): void {
    const { values, errors } = readFields(this.rateFieldSpecs(), this.drafts());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    this.rate.set(toRate(values));
    this.editing.set(null);
    this.focusStep();
  }

  protected confirmMinimum(): void {
    const kind = this.minimumKindDraft();
    if (kind === null) {
      return;
    }
    const { values, errors } = readFields(this.minimumFieldSpecs(), this.drafts());
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    this.minimum.set(toMinimum(kind, values));
    this.editing.set(null);
    this.focusStep();
  }

  protected rateAnswer(): string | null {
    const rate = this.rate();
    const mode = this.radio().mode;
    return rate === null || mode === null ? null : rateSummary(rate, mode, this.translate);
  }

  protected minimumAnswer(): string | null {
    const minimum = this.minimum();
    const mode = this.radio().mode;
    return minimum === null || mode === null ? null : minimumSummary(minimum, mode, this.translate);
  }

  protected toggleDocument(document: RequiredDocument, checked: boolean): void {
    this.documentsDraft.update((drafts) =>
      DOCUMENTS.filter((d) => (d === document ? checked : drafts.includes(d))),
    );
  }

  protected confirmDocuments(): void {
    this.documents.set(this.documentsDraft());
    this.editing.set(null);
    this.focusStep();
  }

  /** Key of the collapsed answer of a radio question; null while it has none. */
  protected answerKey(question: RadioQuestion): string | null {
    const value = this.radio()[question.id];
    const choice = question.choices.find((c) => c.value === value);
    return choice ? `contracts.form.${choice.key}.answer` : null;
  }

  protected documentsAnswer(): string | null {
    const documents = this.documents();
    return documents === null ? null : documentsSentence(documents, this.translate);
  }

  /** A contract in force whose terms changed asks from when they hold; any other save goes through. */
  protected save(): Promise<void> {
    const contract = this.facade.contract;
    if (
      this.canSave() &&
      !this.isNew() &&
      contract.hasValue() &&
      contract.value().status === 'Current' &&
      this.termsSnapshot() !== this.baselineTerms()
    ) {
      this.changeScope.set(null);
      this.changeFromDraft.set('');
      this.changeFromError.set(null);
      this.changeFromRefusal.set([]);
      this.changeDialog.set(true);
      return Promise.resolve();
    }
    return this.write();
  }

  protected closeChangeDialog(): void {
    if (!this.saving()) {
      this.changeDialog.set(false);
    }
  }

  protected pickChangeScope(scope: ChangeScope): void {
    this.changeScope.set(scope);
    if (scope === 'from') {
      afterNextRender(
        { read: () => this.host.nativeElement.querySelector<HTMLElement>('#change-from')?.focus() },
        { injector: this.injector },
      );
    }
  }

  protected setChangeFrom(value: string): void {
    this.changeFromDraft.set(value);
    this.changeFromError.set(null);
    this.changeFromRefusal.set([]);
  }

  /** "Salva" of the dialog: the chosen option decides between the change from a date and the correction. */
  protected async confirmChange(): Promise<void> {
    const scope = this.changeScope();
    if (scope === null) {
      return;
    }
    if (scope === 'always') {
      this.changeDialog.set(false);
      return this.write();
    }
    const problem = this.changeFromProblem(this.changeFromDraft());
    this.changeFromError.set(problem);
    if (problem !== null) {
      return;
    }
    await this.write(this.changeFromDraft());
  }

  private async write(changeFrom?: string): Promise<void> {
    const validity = this.validity();
    const { mode, night } = this.radio();
    const billingLevel = this.billingLevel();
    const documents = this.documents();
    if (
      !this.canSave() ||
      validity === null ||
      billingLevel === null ||
      mode === null ||
      night === null ||
      documents === null
    ) {
      return;
    }
    const contract = this.facade.contract;
    if (!this.isNew() && !contract.hasValue()) {
      return;
    }
    this.refusal.set(null);
    const stored =
      contract.hasValue() && !this.isNew()
        ? { ...contract.value(), version: this.seededVersion }
        : null;
    const values = {
      validFrom: validity.from,
      validTo: validity.to,
      billingLevel,
      pricingMode: mode,
      requiredDocuments: documents,
      nightSurcharge: night === 'yes',
      ...rateMembers(this.flat(), this.rate(), this.minimum()),
    };
    const pending =
      changeFrom === undefined || stored === null
        ? this.facade.saveContract(this.customerId(), stored, values)
        : this.facade.changeContractFromDate(this.customerId(), stored, values, changeFrom);
    this.pendingSave = pending;
    const outcome = await pending;
    if (outcome === 'created' || outcome === 'updated' || outcome === 'changed') {
      this.saved.set(true);
    }
    if (outcome === 'changed') {
      this.changeDialog.set(false);
    }
    if (
      outcome === 'created' ||
      outcome === 'updated' ||
      outcome === 'changed' ||
      outcome === 'ignored'
    ) {
      return;
    }
    if (changeFrom !== undefined && outcome.kind === 'validation') {
      const messages = fieldErrors(outcome, 'ChangeFrom');
      if (messages.length > 0) {
        this.changeFromRefusal.set(messages);
        return;
      }
    }
    this.changeDialog.set(false);
    this.refusal.set(outcome);
    if (this.validityRefusal()) {
      this.edit(1);
    }
  }

  /** Reads the contract again and shows its answers, discarding the entered changes. */
  protected reload(): void {
    this.refusal.set(null);
    if (this.isNew()) {
      this.facade.reloadContracts();
      return;
    }
    this.seeded.set(false);
    this.facade.reloadContract();
  }

  /**
   * Resolves true when the user may leave: at once without unsaved changes, else after the
   * "Uscire senza salvare?" dialog. A save in flight settles first: it navigates away itself.
   */
  async confirmLeave(): Promise<boolean> {
    await this.pendingSave;
    if (!this.hasUnsavedChanges()) {
      return true;
    }
    this.leaveDecision()?.(false);
    return new Promise<boolean>((resolve) => {
      this.leaveDecision.set((leave) => {
        this.leaveDecision.set(null);
        resolve(leave);
      });
      afterNextRender(
        { read: () => this.stayButton()?.nativeElement.focus() },
        {
          injector: this.injector,
        },
      );
    });
  }

  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }
}
