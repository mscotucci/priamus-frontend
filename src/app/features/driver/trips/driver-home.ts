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
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NoticeContent } from '../../../core/api/api-error';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { Icon } from '../../../shared/components/icon/icon';
import { Notice } from '../../../shared/components/notice/notice';
import { RepeatableTrip } from './new-trip-answers';
import { bringNoticeIntoView, outcomeNotice } from './trip-notices';
import {
  TripEndAsks,
  durationKey,
  expiryText,
  isOverdue,
  kindOf,
  placesOf,
  startedAt,
  timeOf,
} from './trip-times';
import { DriverHome as DriverHomeRead, Trip } from './trips-api';
import { ActOutcome, TripsFacade } from './trips-facade';

const SHOWN = 4;

type InProgressDocuments = NonNullable<DriverHomeRead['inProgress']>['documents'];

/** What the dialog of a trip started on an earlier day says, ready to show. */
interface EndNowDialog {
  tripId: string;
  text: string;
  /** What the end asks besides the time: decides where "Termina ora" of the dialog goes. */
  asks: TripEndAsks;
}

@Component({
  selector: 'app-driver-home',
  imports: [RouterLink, TranslatePipe, Icon, Notice, Dialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './driver-home.html',
})
export class DriverHome {
  protected readonly facade = inject(TripsFacade);
  private readonly locale = inject(LOCALE_ID);
  private readonly translate = inject(TranslateService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly today = capitalized(formatDate(new Date(), 'EEEE d MMMM', this.locale));

  /** The first four repeatable trips, or all of them after "Mostra tutti". */
  private readonly showAll = signal(false);
  protected readonly shown = computed(() => {
    const trips = this.facade.home()?.repeatableTrips ?? [];
    return this.showAll() ? trips : trips.slice(0, SHOWN);
  });
  protected readonly hasMore = computed(
    () => !this.showAll() && (this.facade.home()?.repeatableTrips.length ?? 0) > SHOWN,
  );

  /** What an act of the home refused or could not do; null when nothing is to be told. */
  protected readonly notice = signal<NoticeContent | null>(null);
  /** The notice last brought into view: a reload of the home does not scroll to it again. */
  private scrolledTo: NoticeContent | null = null;
  protected readonly endNowDialog = signal<EndNowDialog | null>(null);
  /** The trip the open "Eliminare il viaggio?" dialog is about. */
  protected readonly removeDialog = signal<string | null>(null);

  /** The trip in progress started 24 hours ago or more: it can only be ended at a typed time. */
  protected readonly overdue = computed(() => {
    const trip = this.facade.home()?.inProgress?.trip;
    return trip ? isOverdue(trip, new Date()) : false;
  });

  constructor() {
    this.facade.needHome();
    // The notice is on the page only once the home is read: it is brought into view then.
    effect(() => {
      const notice = this.notice();
      if (notice !== null && this.facade.home() !== null && notice !== this.scrolledTo) {
        this.scrolledTo = notice;
        bringNoticeIntoView(this.host, this.injector);
      }
    });
  }

  protected readonly places = placesOf;

  /** A required document with no file is still to attach. */
  protected hasMissing(documents: InProgressDocuments): boolean {
    return documents.some((item) => item.required && item.attachmentCount === 0);
  }

  /** What the required documents have and lack, "DDT allegato · manca il formulario rifiuti"; documents not required are left out. */
  protected documentsText(documents: InProgressDocuments): string {
    const required = documents.filter((item) => item.required);
    const phrase = (kind: 'attached' | 'missing', document: string) =>
      this.translate.instant(
        `driver.home.inProgress.documents.${kind}.${document.toLowerCase()}`,
      ) as string;
    const parts = [
      ...required
        .filter((item) => item.attachmentCount > 0)
        .map((item) => phrase('attached', item.document)),
      ...required
        .filter((item) => item.attachmentCount === 0)
        .map((item) => phrase('missing', item.document)),
    ];
    if (parts.length === 0) {
      return this.translate.instant('driver.home.inProgress.documents.none');
    }
    const text = parts.join(' · ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** "Oggi alle <time>", "Ieri, <weekday> <day> <month>, alle <time>" or "<weekday> <day> <month>, alle <time>". */
  protected startedText(trip: Trip): { key: string; params: Record<string, string> } {
    const kind = kindOf(trip);
    return {
      key: `driver.home.inProgress.started.${kind}`,
      params: {
        date: formatDate(startedAt(trip)!, 'EEEE d MMMM', this.locale),
        time: timeOf(trip),
      },
    };
  }

  protected expiry(days: number): { key: string; params: { days: number } } {
    return expiryText('driver.home.planned.expires', days);
  }

  protected async endNow(trip: Trip, asks: TripEndAsks): Promise<void> {
    this.notice.set(null);
    if (kindOf(trip) !== 'today') {
      this.endNowDialog.set({ tripId: trip.id, text: this.endNowText(trip), asks });
    } else {
      await this.endNowOf(trip.id, asks);
    }
  }

  protected async confirmEndNow(): Promise<void> {
    const dialog = this.endNowDialog();
    this.endNowDialog.set(null);
    if (dialog) {
      await this.endNowOf(dialog.tripId, dialog.asks);
    }
  }

  protected async typeEnd(tripId: string): Promise<void> {
    this.endNowDialog.set(null);
    await this.facade.openEnd(tripId, true);
  }

  protected async removeTrip(): Promise<void> {
    const tripId = this.removeDialog();
    this.removeDialog.set(null);
    if (tripId === null) {
      return;
    }
    this.notice.set(null);
    const outcome = await this.facade.remove(tripId);
    if (outcome.kind === 'done') {
      this.facade.needHome();
    } else {
      this.tell(outcome, 'errors.generic');
      if (outcome.kind === 'stale') {
        // The trip was ended meanwhile: the home shows it as it is now.
        this.facade.needHome();
      }
    }
  }

  protected repeat(trip: RepeatableTrip): void {
    void this.facade.repeat(trip);
  }

  protected displayAll(): void {
    this.showAll.set(true);
  }

  /** "Termina ora": the end page when the end asks a measure, the end at once when it asks nothing. */
  private async endNowOf(tripId: string, asks: TripEndAsks): Promise<void> {
    if (asks !== 'Nothing') {
      await this.facade.openEnd(tripId, false);
    } else {
      await this.endAtOnce(tripId);
    }
  }

  private async endAtOnce(tripId: string): Promise<void> {
    const outcome = await this.facade.end(tripId, {
      time: null,
      kilograms: null,
      kilometres: null,
    });
    if (outcome.kind === 'done') {
      await this.facade.openEnded();
    } else if (outcome.kind === 'stale') {
      await this.facade.openEnd(tripId, false);
    } else {
      this.tell(outcome, 'driver.end.failed');
    }
  }

  private tell(outcome: ActOutcome, failedKey: string): void {
    const notice = outcomeNotice(outcome, failedKey);
    if (notice !== null) {
      this.notice.set(notice);
    }
  }

  private endNowText(trip: Trip): string {
    const minutes = Math.max(0, Math.floor((Date.now() - startedAt(trip)!.getTime()) / 60_000));
    const duration = this.translate.instant(durationKey(minutes), {
      hours: Math.floor(minutes / 60),
      minutes: minutes % 60,
    });
    const yesterday = kindOf(trip) === 'yesterday';
    return this.translate.instant(
      `driver.home.inProgress.endNow.${yesterday ? 'yesterday' : 'other'}`,
      {
        time: timeOf(trip),
        date: formatDate(startedAt(trip)!, 'd MMMM', this.locale),
        duration,
      },
    );
  }
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
