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
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NoticeContent } from '../../../core/api/api-error';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { Icon } from '../../../shared/components/icon/icon';
import { Notice } from '../../../shared/components/notice/notice';
import type { LeaveConfirmable } from '../../../shared/guards/unsaved-changes-guard';
import {
  Answer,
  EMPTY_ANSWERS,
  NewTripAnswers,
  QUESTIONS,
  QuestionNumber,
  RepeatableTrip,
  TripCustomer,
  TripQuestions,
  TripVehicle,
  addRequest,
  applyAnswer,
  applyCheck,
  applyRepeat,
  isAnswered,
  isComplete,
  locationLines,
  locationsOptional,
  openQuestion,
  tractorAwaitingTrailer,
  vehicleLines,
} from './new-trip-answers';
import { CustomerQuestion } from './customer-question';
import { LocationsQuestion } from './locations-question';
import { bringNoticeIntoView } from './trip-notices';
import { TripQuestion, TripQuestionState } from './trip-question';
import { TripsFacade } from './trips-facade';
import { VehicleQuestion } from './vehicle-question';

/** How long a question just opened is kept at the top while the page grows under it. */
const FOLLOW_MS = 1500;

/** Where the texts of each question live, under `driver.newTrip.question.`. */
const KEYS: Record<QuestionNumber, string> = {
  1: 'vehicle',
  2: 'customer',
  3: 'locations',
};

@Component({
  selector: 'app-new-trip-page',
  imports: [
    RouterLink,
    TranslatePipe,
    Dialog,
    Icon,
    Notice,
    CustomerQuestion,
    LocationsQuestion,
    TripQuestion,
    VehicleQuestion,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col', '(window:beforeunload)': 'warnBeforeUnload($event)' },
  templateUrl: './new-trip-page.html',
})
export class NewTripPage implements LeaveConfirmable {
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly facade = inject(TripsFacade);

  protected readonly questions = QUESTIONS;
  /** The repeated trip the page started from, waiting for what the server proposes to be read. */
  private readonly pendingRepeat = this.facade.takeRepeat();

  protected readonly answers = signal(EMPTY_ANSWERS);
  /** The question being reopened with "Modifica". */
  private readonly editing = signal<QuestionNumber | null>(null);
  /** What the server proposes is read (or failed to be) and applied: until then no question is open. */
  private readonly ready = signal(false);
  /** Question 1 carries the proposal's name until the driver chooses a vehicle. */
  protected readonly proposed = signal(false);
  /** The vehicle answered is the one of a repeated trip: its line is the short "<plate> + <plate>". */
  protected readonly repeatedVehicle = signal(false);
  /** A repeated trip is being checked against the registry: until it is, no question is open. */
  private readonly repeatPending = signal(false);
  /** The check of the repeated trip was started: it is made once. */
  private repeatStarted = false;
  /** The page started from a repeated trip: the vehicle proposal of the server is not applied. */
  private repeated = false;
  /** A tractor chosen in question 1 and waiting for its trailer. */
  private readonly pendingTractor = signal<TripVehicle | null>(null);
  /** "Cambia" was tapped on the tractor: question 1 lists the leading vehicles again. */
  private readonly choosingLeading = signal(false);
  protected readonly tractor = computed(() =>
    this.choosingLeading()
      ? null
      : (this.pendingTractor() ?? tractorAwaitingTrailer(this.answers())),
  );
  /** What the server proposes, or the repeated trip, is still being read: no question is open yet. */
  protected readonly loading = computed(() => !this.ready());
  /** The question being asked; none once everything is answered and none is being modified. */
  protected readonly open = computed<QuestionNumber | null>(() =>
    this.ready() ? openQuestion(this.answers(), this.editing()) : null,
  );
  protected readonly complete = computed(() => isComplete(this.answers()));
  /** The driver has a trip in progress: this one can only be added, to be started later. */
  protected readonly tripInProgress = computed(
    () => this.facade.newTrip()?.hasTripInProgress ?? false,
  );
  protected readonly vehicleLines = computed(() => vehicleLines(this.answers()));
  protected readonly locationLines = computed(() => locationLines(this.answers().locations));
  /** The contract of a customer could not be read, or the customer has none in force today. */
  protected readonly customerFailed = signal(false);
  /** The latest read of a contract: an older one that settles later is ignored. */
  private contractRead = 0;
  /** The trip identifier: made once when the page opens, sent with every adding of it. */
  private readonly tripId = crypto.randomUUID();
  protected readonly saving = this.facade.saving;
  /** The choices are read again after a 409. */
  protected readonly rereading = signal(false);
  /** A refusal of the adding, at the top of the page. */
  protected readonly notice = signal<NoticeContent | null>(null);

  /** The driver gave or changed an answer: what the page started from does not count. */
  private readonly touched = signal(false);
  protected readonly hasUnsavedChanges = computed(() => this.touched());
  /** Settles the open "Uscire senza salvare?" dialog: true leaves, false stays. */
  protected readonly leaveDecision = signal<((leave: boolean) => void) | null>(null);
  private readonly stayButton = viewChild<ElementRef<HTMLButtonElement>>('stay');

  private shownQuestion: QuestionNumber | null | undefined;
  /** The next question that opens stays where it is: a notice at the top was just brought into view. */
  private keepNoticeInView = false;
  /** Follows the growth of the page for a moment after a question opens, while its list arrives. */
  private growth: ResizeObserver | null = null;
  private growthTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.facade.needNewTrip();
    this.repeated = this.pendingRepeat !== null;
    effect(() => {
      if (this.ready() || this.repeatPending()) {
        return;
      }
      const proposal = this.facade.newTrip();
      if (proposal === null && !this.facade.newTripFailed()) {
        return;
      }
      untracked(() => {
        if (this.pendingRepeat !== null && !this.repeatStarted) {
          this.repeatStarted = true;
          this.repeatPending.set(true);
          void this.startFrom(this.pendingRepeat);
          return;
        }
        if (proposal?.vehicle && !this.touched() && !this.repeated) {
          const { vehicle, trailer } = proposal;
          this.proposed.set(true);
          this.answers.update((answers) =>
            applyAnswer(answers, { kind: 'vehicle', vehicle, trailer }),
          );
        }
        this.ready.set(true);
      });
    });
    effect(() => {
      if (!this.ready()) {
        return;
      }
      const open = this.open();
      if (this.shownQuestion === undefined || open === this.shownQuestion) {
        this.shownQuestion = open;
        return;
      }
      this.shownQuestion = open;
      if (this.keepNoticeInView) {
        this.keepNoticeInView = false;
        return;
      }
      if (open !== null) {
        this.bringToTop();
      }
    });
    inject(DestroyRef).onDestroy(() => this.stopFollowing());
  }

  /**
   * A repeated trip is checked against today's registry and contract first; the answers that hold
   * are set without making the page dirty, the others are left empty. When the registry cannot be
   * asked the page opens as from the home.
   */
  private async startFrom(repeat: RepeatableTrip): Promise<void> {
    try {
      const [check, questions] = await Promise.all([
        this.facade.checkAnswers({
          ...EMPTY_ANSWERS,
          vehicle: repeat.vehicle,
          trailer: repeat.trailer,
          customer: repeat.customer,
          locations: { pickup: repeat.pickup, delivery: repeat.delivery },
        }),
        this.facade.tripQuestions(repeat.customer.id),
      ]);
      const answers = applyRepeat(repeat, check, questions);
      this.repeatedVehicle.set(answers.vehicle !== null);
      this.answers.set(answers);
    } catch {
      this.repeated = false;
    } finally {
      this.repeatPending.set(false);
    }
  }

  protected stateOf(question: QuestionNumber): TripQuestionState {
    return this.open() === question
      ? 'open'
      : isAnswered(this.answers(), question)
        ? 'answered'
        : 'upcoming';
  }

  protected nameKey(question: QuestionNumber): string {
    if (question === 1 && this.proposed()) {
      return 'driver.newTrip.vehicle.proposedName';
    }
    const answers = this.answers();
    return question === 3 && answers.locations !== null && locationsOptional(answers)
      ? 'driver.newTrip.locations.optionalName'
      : `driver.newTrip.question.${KEYS[question]}.name`;
  }

  protected titleKey(question: QuestionNumber): string {
    if (question === 1 && this.tractor() !== null) {
      return 'driver.newTrip.vehicle.trailerTitle';
    }
    const asked = this.answers().questions?.locationsAsked;
    return question === 3 && asked !== undefined
      ? `driver.newTrip.locations.title.${asked.toLowerCase()}`
      : `driver.newTrip.question.${KEYS[question]}.title`;
  }

  protected modify(question: QuestionNumber): void {
    if (!this.ready()) {
      return;
    }
    this.contractRead++;
    this.customerFailed.set(false);
    this.pendingTractor.set(null);
    this.choosingLeading.set(false);
    this.editing.set(question);
  }

  protected answer(answer: Answer): void {
    this.touched.set(true);
    if (answer.kind === 'vehicle') {
      const current = this.answers();
      if (answer.vehicle.id !== current.vehicle?.id || answer.trailer?.id !== current.trailer?.id) {
        this.proposed.set(false);
        this.repeatedVehicle.set(false);
      }
      this.pendingTractor.set(null);
      this.choosingLeading.set(false);
    }
    if (answer.kind === 'customer') {
      this.contractRead++;
      this.customerFailed.set(false);
    }
    this.editing.set(null);
    this.answers.update((answers) => applyAnswer(answers, answer));
  }

  /** The customer is answered with what its contract asks today, read first. */
  protected async chooseCustomer(customer: TripCustomer): Promise<void> {
    const read = ++this.contractRead;
    this.customerFailed.set(false);
    let questions: TripQuestions | null;
    try {
      questions = await this.facade.tripQuestions(customer.id);
    } catch {
      questions = null;
    }
    if (read !== this.contractRead) {
      return;
    }
    if (questions === null) {
      this.customerFailed.set(true);
      return;
    }
    this.answer({ kind: 'customer', customer, questions });
  }

  /** Back from the trailer to the leading vehicles, the tractor chosen by mistake left behind. */
  protected changeLeading(): void {
    this.pendingTractor.set(null);
    this.choosingLeading.set(true);
  }

  protected chooseTractor(tractor: TripVehicle): void {
    this.choosingLeading.set(false);
    this.pendingTractor.set(tractor);
  }

  /**
   * Adds the trip, started now when `start`, and goes to the home. A refusal is shown only while the
   * answers are the ones that were sent: when the driver changed any of them meanwhile it is about
   * answers no longer on the page.
   */
  protected async add(start: boolean): Promise<void> {
    const answers = this.answers();
    const request = addRequest(answers);
    if (request === null || this.facade.saving() || this.rereading()) {
      return;
    }
    this.notice.set(null);
    const read = this.contractRead;
    const current = () => this.answers() === answers && this.contractRead === read;
    const outcome = await this.facade.add(this.tripId, request, start);
    if (outcome.kind === 'done') {
      this.touched.set(false);
      await this.facade.goHome();
      return;
    }
    if (outcome.kind === 'ignored' || !current()) {
      return;
    }
    switch (outcome.kind) {
      case 'notReached':
        this.showNotice({ key: 'driver.notReached' });
        break;
      case 'rule':
        this.showNotice({ detail: outcome.detail });
        break;
      case 'stale':
        await this.askAgain(answers);
        break;
      case 'failed':
        this.showNotice({ key: 'driver.newTrip.save.failed' });
        break;
    }
  }

  /**
   * The registry changed while the driver filled in the page: the choices are read again and the
   * answers that no longer hold are emptied, the first of them open.
   */
  private async askAgain(answers: NewTripAnswers): Promise<void> {
    this.showNotice({ key: 'driver.newTrip.save.changed' });
    this.facade.readChoicesAgain();
    const { customer } = answers;
    if (customer === null) {
      return;
    }
    const read = ++this.contractRead;
    this.rereading.set(true);
    let result: ReturnType<typeof applyCheck>;
    try {
      const [check, questions] = await Promise.all([
        this.facade.checkAnswers(answers),
        this.facade.tripQuestions(customer.id),
      ]);
      result = applyCheck(answers, check, questions);
    } catch {
      if (read === this.contractRead && this.answers() === answers) {
        this.showNotice({ key: 'driver.newTrip.save.failed' });
      }
      return;
    } finally {
      this.rereading.set(false);
    }
    if (read !== this.contractRead || this.answers() !== answers) {
      return;
    }
    this.keepNoticeInView = result.first !== null && result.first !== this.open();
    this.answers.set(result.answers);
    this.editing.set(result.first);
    this.showNotice({ key: 'driver.newTrip.save.changed' });
  }

  private showNotice(notice: NoticeContent): void {
    this.stopFollowing();
    this.notice.set(notice);
    bringNoticeIntoView(this.host, this.injector);
  }

  /**
   * After the render that opened a question, it goes to the top of the screen, below the bar. Its list
   * may arrive from the server after that render and make the page long enough only then: for a moment
   * the question is brought to the top again each time the page grows.
   */
  private bringToTop(): void {
    afterNextRender(
      {
        read: () => {
          const question = this.host.nativeElement.querySelector('[aria-current="step"]');
          if (question === null) {
            return;
          }
          const toTop = () => question.scrollIntoView({ block: 'start', inline: 'nearest' });
          toTop();
          this.follow(toTop);
        },
      },
      { injector: this.injector },
    );
  }

  private follow(toTop: () => void): void {
    this.stopFollowing();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const main = this.host.nativeElement.querySelector('main');
    if (main === null) {
      return;
    }
    this.growth = new ResizeObserver(toTop);
    this.growth.observe(main);
    this.growthTimer = setTimeout(() => this.stopFollowing(), FOLLOW_MS);
  }

  private stopFollowing(): void {
    clearTimeout(this.growthTimer);
    this.growth?.disconnect();
    this.growth = null;
  }

  /** Resolves true when the user may leave: at once when nothing was given, else after the dialog. */
  async confirmLeave(): Promise<boolean> {
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
        { injector: this.injector },
      );
    });
  }

  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }
}
