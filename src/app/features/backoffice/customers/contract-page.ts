import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
import type { LeaveConfirmable } from '../../../shared/guards/unsaved-changes-guard';
import { CONTRACT_STATUS_PILL, documentsSentence } from './contract-labels';
import { ContractQuestion } from './contract-question';
import { BillingLevel, Contract, PricingMode, RequiredDocument } from './contracts-api';
import { CustomersFacade } from './customers-facade';

const CONCURRENT_UPDATE = 'Registry.Contract.ConcurrentUpdate';

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

@Component({
  selector: 'app-contract-page',
  imports: [Topbar, DatePipe, RouterLink, TranslatePipe, Notice, ContractQuestion, Dialog],
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
    JSON.stringify([this.validity(), this.radio(), this.documents()]),
  );
  /** The answers the page started from: none on a new contract, the loaded ones on an existing one. */
  private readonly baseline = signal(this.answersSnapshot());

  /** A new contract has an answer, or an existing one has an answer different from the loaded one. */
  protected readonly hasUnsavedChanges = computed(
    () => !this.saved() && this.answersSnapshot() !== this.baseline(),
  );

  private readonly shownQuestions = computed(() =>
    this.radio().locations === 'yes' ? [1, 2, 3, 4, 5, 6] : [1, 2, 4, 5, 6],
  );

  private readonly answered = computed(() => {
    const radio = this.radio();
    return new Map<number, boolean>([
      [1, this.validity() !== null],
      [2, radio.locations !== null],
      [3, radio.which !== null],
      [4, radio.mode !== null],
      [5, radio.night !== null],
      [6, this.documents() !== null],
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
  protected readonly ready = computed(() =>
    this.isNew() ? this.facade.customer.hasValue() : this.seeded(),
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
    const day = new Date(`${validity.from}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() - 1);
    return { from: open.validFrom, closedOn: day.toISOString().slice(0, 10) };
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
      this.complete() &&
      this.editing() === null &&
      !this.stale() &&
      !this.facade.contract.isLoading() &&
      (this.isNew() ? this.facade.contracts.hasValue() : this.facade.contract.hasValue()),
  );

  constructor() {
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
    this.documents.set(contract.requiredDocuments);
    this.documentsDraft.set(contract.requiredDocuments);
    this.editing.set(null);
    this.baseline.set(this.answersSnapshot());
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
    const validity = this.validity();
    if (number === 1 && validity) {
      this.fromDraft.set(validity.from);
      this.toDraft.set(validity.to ?? '');
      this.validityErrors.set({});
    }
    if (number === 6) {
      this.documentsDraft.set(this.documents() ?? []);
    }
    this.editing.set(number);
    this.focusStep();
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

  /** Answering question 2 with "No" drops question 3 and its answer; every other answer stays. */
  protected pick(question: RadioQuestion, picked: Choice): void {
    this.radio.update((answers) => ({
      ...picked.apply(answers),
      ...(question.id === 'locations' && picked.value === 'no' ? { which: null } : {}),
    }));
    if (this.editing() === question.number) {
      this.editing.set(null);
    }
    this.focusStep();
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

  protected async save(): Promise<void> {
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
    const pending = this.facade.saveContract(
      this.customerId(),
      contract.hasValue() && !this.isNew()
        ? { ...contract.value(), version: this.seededVersion }
        : null,
      {
        validFrom: validity.from,
        validTo: validity.to,
        billingLevel,
        pricingMode: mode,
        requiredDocuments: documents,
        nightSurcharge: night === 'yes',
      },
    );
    this.pendingSave = pending;
    const outcome = await pending;
    if (outcome === 'created' || outcome === 'updated') {
      this.saved.set(true);
    }
    if (outcome === 'created' || outcome === 'updated' || outcome === 'ignored') {
      return;
    }
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
