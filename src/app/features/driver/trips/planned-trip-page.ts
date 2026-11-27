import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  LOCALE_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NoticeContent } from '../../../core/api/api-error';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { Icon } from '../../../shared/components/icon/icon';
import { Notice } from '../../../shared/components/notice/notice';
import { NativeValue } from '../../../shared/directives/native-value';
import { bringNoticeIntoView, outcomeNotice } from './trip-notices';
import { dayOf, expiryText, isPickable, isTime, yesterdayOf } from './trip-times';
import { ActOutcome, TripsFacade } from './trips-facade';

type StartDay = 'today' | 'yesterday' | 'other';

/**
 * The refusals of a typed start that belong under "Ora di inizio": the start in the future, an overlap.
 * Codes of `TripErrors.InTheFuture` and `TripErrors.Overlaps` in the Operations module of the backend.
 */
const TIME_RULES = ['Operations.Trip.InTheFuture', 'Operations.Trip.Overlaps'];

@Component({
  selector: 'app-planned-trip-page',
  imports: [RouterLink, TranslatePipe, Icon, Notice, Dialog, NativeValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './planned-trip-page.html',
})
export class PlannedTripPage {
  protected readonly facade = inject(TripsFacade);
  private readonly locale = inject(LOCALE_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  private readonly tripId = signal('');
  /** The page as the driver sees it, or asking when the trip was started. */
  protected readonly asking = signal(false);
  protected readonly day = signal<StartDay>('today');
  protected readonly otherDay = signal('');
  protected readonly time = signal('');
  protected readonly notice = signal<NoticeContent | null>(null);
  /** What the server refused about the typed time, shown under "Ora di inizio". */
  protected readonly timeError = signal<string | null>(null);
  protected readonly removeDialog = signal(false);

  protected readonly today = dayOf(new Date());
  protected readonly yesterday = yesterdayOf(this.today);
  protected readonly todayLabel = this.label(this.today);
  protected readonly yesterdayLabel = this.label(this.yesterday);

  protected readonly read = computed(() => {
    const read = this.facade.trip();
    return read !== null && read.trip.id === this.tripId() ? read : null;
  });
  /**
   * Whether another trip is in progress; null until the read of "Nuovo viaggio" has answered. A read that
   * failed counts as no trip in progress: the server refuses the start anyway.
   */
  protected readonly otherInProgress = computed<boolean | null>(() => {
    const newTrip = this.facade.newTrip();
    return newTrip ? newTrip.hasTripInProgress : this.facade.newTripFailed() ? false : null;
  });

  protected readonly pickedDay = computed(() =>
    this.day() === 'today'
      ? this.today
      : this.day() === 'yesterday'
        ? this.yesterday
        : this.otherDay(),
  );
  protected readonly otherLabel = computed(() =>
    isPickable(this.otherDay(), this.today) ? this.label(this.otherDay()) : '…',
  );
  protected readonly canConfirm = computed(
    () => isPickable(this.pickedDay(), this.today) && isTime(this.time()),
  );
  protected readonly proposed = computed(() => this.read()?.proposedStart?.slice(0, 5) ?? null);
  protected readonly showProposalHint = computed(
    () => this.day() === 'today' && this.proposed() !== null && this.time() === this.proposed(),
  );

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const id = params.get('tripId') ?? '';
        this.tripId.set(id);
        this.facade.needTrip(id);
        this.facade.needNewTrip();
      });
    effect(() => {
      if (this.notice() !== null) {
        bringNoticeIntoView(this.host, this.injector);
      }
    });
    effect(() => {
      const read = this.read();
      if (this.facade.tripMissing() || (read !== null && read.trip.state !== 'Planned')) {
        void this.facade.goHome();
      }
    });
  }

  protected expiry(days: number): { key: string; params: { days: number } } {
    return expiryText('driver.planned.expires', days);
  }

  protected ask(): void {
    this.notice.set(null);
    this.timeError.set(null);
    this.day.set('today');
    this.otherDay.set('');
    this.time.set(this.proposed() ?? '');
    this.asking.set(true);
  }

  protected cancel(): void {
    this.notice.set(null);
    this.timeError.set(null);
    this.asking.set(false);
  }

  protected chooseDay(day: StartDay): void {
    const proposal = this.proposed();
    if (
      day !== 'today' &&
      this.day() === 'today' &&
      proposal !== null &&
      this.time() === proposal
    ) {
      this.time.set('');
    }
    this.day.set(day);
    this.timeError.set(null);
    if (day === 'today' && this.time() === '') {
      this.time.set(proposal ?? '');
    }
  }

  /** The driver edits the other day: what the server refused about the old start no longer applies. */
  protected editOtherDay(value: string): void {
    this.otherDay.set(value);
    this.timeError.set(null);
  }

  /** The driver edits the start time: what the server refused about the old one no longer applies. */
  protected editTime(value: string): void {
    this.time.set(value);
    this.timeError.set(null);
  }

  protected async startNow(): Promise<void> {
    await this.start(null);
  }

  protected async confirm(): Promise<void> {
    if (this.canConfirm()) {
      await this.start({ day: this.pickedDay(), time: this.time() });
    }
  }

  protected async removeTrip(): Promise<void> {
    this.removeDialog.set(false);
    this.notice.set(null);
    const outcome = await this.facade.remove(this.tripId());
    if (outcome.kind === 'done') {
      await this.facade.goHome();
    } else {
      this.tell(outcome, 'errors.generic');
    }
  }

  private async start(when: { day: string; time: string } | null): Promise<void> {
    this.notice.set(null);
    this.timeError.set(null);
    const outcome = await this.facade.start(this.tripId(), when);
    if (outcome.kind === 'done') {
      await this.facade.goHome();
    } else if (outcome.kind === 'stale') {
      this.notice.set({ key: 'driver.planned.stale' });
    } else if (outcome.kind === 'rule' && when !== null && TIME_RULES.includes(outcome.errorCode)) {
      this.timeError.set(outcome.detail);
    } else {
      this.tell(outcome, 'driver.planned.startFailed');
    }
  }

  private tell(outcome: ActOutcome, failedKey: string): void {
    const notice = outcomeNotice(outcome, failedKey);
    if (notice !== null) {
      this.notice.set(notice);
    }
  }

  private label(day: string): string {
    return formatDate(new Date(`${day}T00:00:00`), 'd MMM', this.locale);
  }
}
