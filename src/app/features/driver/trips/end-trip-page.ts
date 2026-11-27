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
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NoticeContent } from '../../../core/api/api-error';
import { Icon } from '../../../shared/components/icon/icon';
import { Notice } from '../../../shared/components/notice/notice';
import { NativeValue } from '../../../shared/directives/native-value';
import { bringNoticeIntoView } from './trip-notices';
import {
  MeasureDraft,
  MeasureField,
  dayKind,
  dayOf,
  durationKey,
  durationMinutes,
  isOverdue,
  isTime,
  measureProblems,
  startedAt,
} from './trip-times';
import { TripRead } from './trips-api';
import { TripsFacade } from './trips-facade';

/** A trip started less than this long ago, by the device clock, has "appena iniziato". */
const JUST_STARTED_MS = 2 * 60 * 1000;

@Component({
  selector: 'app-end-trip-page',
  imports: [RouterLink, TranslatePipe, Icon, Notice, NativeValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './end-trip-page.html',
})
export class EndTripPage {
  protected readonly facade = inject(TripsFacade);
  private readonly locale = inject(LOCALE_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  private readonly tripId = signal('');
  /** The route asked for a typed end (`?time=typed`). */
  private readonly typedEnd = signal(false);
  protected readonly end = signal('');
  protected readonly kilograms = signal('');
  protected readonly kilometres = signal('');
  private readonly left = signal<ReadonlySet<MeasureField>>(new Set());
  protected readonly notice = signal<NoticeContent | null>(null);
  /** What the server refused about the typed end time (the future, an overlap), shown under it. */
  protected readonly timeError = signal<string | null>(null);
  /** What the page asked when an end came back stale, until the trip read again is compared with it. */
  private readonly staleFrom = signal<{
    read: TripRead | null;
    asks: string;
    asksTime: boolean;
  } | null>(null);

  protected readonly read = computed(() => {
    const read = this.facade.trip();
    return read !== null && read.trip.id === this.tripId() ? read : null;
  });
  protected readonly asks = computed(() => this.read()?.endAsks ?? 'Nothing');
  private readonly startTime = computed(() => this.read()?.trip.start?.slice(0, 5) ?? '');
  /** The end time is typed: asked by the route, or because the trip started 24 hours ago or more. */
  protected readonly asksTime = computed(() => {
    const trip = this.read()?.trip;
    return this.typedEnd() || (trip !== undefined && isOverdue(trip, new Date()));
  });
  /** The trip started less than 2 minutes ago by the device clock. */
  private startedJustNow(): boolean {
    const start = startedAt(this.read()?.trip ?? { day: null, start: null });
    return start !== null && Date.now() - start.getTime() < JUST_STARTED_MS;
  }

  /** "iniziato oggi alle 07:30", from the day and time of the start. */
  protected readonly started = computed(() => {
    const day = this.read()?.trip.day;
    if (!day) {
      return null;
    }
    const date = formatDate(new Date(`${day}T00:00:00`), 'd MMM', this.locale);
    return {
      key: `driver.end.started.${dayKind(day, dayOf(new Date()))}`,
      params: { date, time: this.startTime() },
    };
  });

  private readonly draft = computed<MeasureDraft>(() => ({
    start: this.startTime(),
    end: this.asksTime() ? this.end() : '',
    kilograms: this.kilograms(),
    kilometres: this.kilometres(),
  }));
  private readonly problems = computed(() => measureProblems(this.asks(), this.draft()));
  protected readonly canConfirm = computed(
    () => Object.keys(this.problems()).length === 0 && (!this.asksTime() || isTime(this.end())),
  );
  protected readonly duration = computed(() => {
    const end = this.end();
    if (!this.asksTime() || !isTime(end) || this.problems().end || this.startTime() === '') {
      return null;
    }
    const minutes = durationMinutes(this.startTime(), end);
    return {
      key: durationKey(minutes),
      params: { hours: Math.floor(minutes / 60), minutes: minutes % 60 },
    };
  });

  constructor() {
    const route = inject(ActivatedRoute);
    route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('tripId') ?? '';
      this.tripId.set(id);
      this.facade.needTrip(id);
    });
    route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => this.typedEnd.set(params.get('time') === 'typed'));
    effect(() => {
      if (this.notice() !== null) {
        bringNoticeIntoView(this.host, this.injector);
      }
    });
    effect(() => {
      // A trip read again that asks what it asked before leaves the driver with nothing to change.
      const from = this.staleFrom();
      const read = this.read();
      if (from !== null && this.facade.tripFailed()) {
        untracked(() => this.staleFrom.set(null));
      } else if (from !== null && read !== null && read !== from.read) {
        untracked(() => {
          this.staleFrom.set(null);
          if (this.asks() === from.asks && this.asksTime() === from.asksTime) {
            // Nothing to change: the trip has only just started, or the device clock is behind the server.
            this.notice.set({
              key: this.startedJustNow() ? 'driver.end.stale' : 'driver.end.failed',
            });
          }
        });
      }
    });
    effect(() => {
      const read = this.read();
      if (this.facade.tripMissing() || (read !== null && read.trip.state !== 'InProgress')) {
        void this.facade.goHome();
      }
    });
  }

  /** The message key of a wrong field, once the field has been left. */
  protected problemOf(field: MeasureField): string | null {
    const problem = this.left().has(field) ? this.problems()[field] : null;
    return problem ? `driver.end.error.${field}.${problem}` : null;
  }

  protected leave(field: MeasureField): void {
    this.left.update((fields) => new Set(fields).add(field));
  }

  /** The driver edits the end time: what the server refused about the old one no longer applies. */
  protected editEnd(value: string): void {
    this.end.set(value);
    this.timeError.set(null);
  }

  protected async confirm(): Promise<void> {
    if (!this.canConfirm()) {
      return;
    }
    this.notice.set(null);
    this.timeError.set(null);
    this.staleFrom.set(null);
    const asks = this.asks();
    const outcome = await this.facade.end(this.tripId(), {
      time: this.asksTime() ? this.end() : null,
      kilograms: asks === 'Kilograms' ? Number(this.kilograms()) : null,
      kilometres: asks === 'Kilometres' ? Number(this.kilometres()) : null,
    });
    switch (outcome.kind) {
      case 'done':
        await this.facade.openEnded();
        break;
      case 'stale':
        // What the page asks may be out of date: read the trip again, the fields typed are kept.
        this.staleFrom.set({ read: this.read(), asks: this.asks(), asksTime: this.asksTime() });
        this.facade.needTrip(this.tripId());
        break;
      case 'rule':
        if (this.asksTime()) {
          this.timeError.set(outcome.detail);
        } else {
          this.notice.set({ detail: outcome.detail });
        }
        break;
      case 'notReached':
        this.notice.set({ key: 'driver.notReached' });
        break;
      case 'failed':
        this.notice.set({ key: 'driver.end.failed' });
        break;
    }
  }
}
