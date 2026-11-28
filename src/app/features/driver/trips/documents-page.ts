import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
import { preparePhoto } from './photo-preparation';
import { dayKind, dayOf, kindOf, startedAt, timeOf } from './trip-times';
import type { TripDocument } from './trips-api';
import { AttachmentOutcome, TripsFacade } from './trips-facade';

type FileKind = 'photo' | 'pdf';

/**
 * The largest file the server accepts (its `Operations:Attachments:MaxFileBytes`, the 10 MB of the refusal's
 * text). A larger file is refused here, before it is sent: the server refuses it by its length without reading
 * it, and the browser, still sending, reports that answer as a connection lost.
 */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** A file of a document as the card lists it: named by its position among the files of its kind. */
interface FileRow {
  id: string;
  kind: FileKind;
  number: number;
  added: { key: string; params: { date: string; time: string } };
}

interface Card {
  document: TripDocument;
  nameKey: string;
  required: boolean;
  files: FileRow[];
}

/** A prepared file with the trip and the identifier it is sent under. */
interface Sendable {
  tripId: string;
  id: string;
  kind: FileKind;
  blob: Blob;
}

/** The attachment the driver asked to remove, with what the confirmation names. */
interface RemoveTarget {
  id: string;
  kind: FileKind;
  number: number;
  document: TripDocument;
}

/** The documents of a trip in progress or ended in the last 7 days: one card per document. */
@Component({
  selector: 'app-documents-page',
  imports: [RouterLink, TranslatePipe, Icon, Notice, Dialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './documents-page.html',
})
export class DocumentsPage {
  protected readonly facade = inject(TripsFacade);
  private readonly locale = inject(LOCALE_ID);

  private readonly tripId = signal('');
  /** What each document is sending right now; the other cards stay usable. */
  protected readonly sending = signal<Partial<Record<TripDocument, FileKind>>>({});
  /** What the last send of a document was refused with, shown under its button. */
  protected readonly refusals = signal<Partial<Record<TripDocument, NoticeContent>>>({});
  /** What a send that did not finish keeps for its document, to be sent again under the same identifier. */
  protected readonly kept = signal<Partial<Record<TripDocument, Sendable>>>({});
  /** The documents whose send is done and whose list is being read again: their cards stay busy. */
  private readonly rereading = signal<TripDocument[]>([]);
  /** The run each document's card belongs to now; a run that is no longer it leaves the card alone. */
  private runs: Partial<Record<TripDocument, number>> = {};
  private lastRun = 0;
  /** What the last attempt to remove a file came to, shown in the dialog. */
  protected readonly removeError = signal<NoticeContent | null>(null);
  protected readonly removing = signal<RemoveTarget | null>(null);
  protected readonly removeBusy = signal(false);

  protected readonly read = computed(() => {
    const read = this.facade.documents();
    return read !== null && read.trip.id === this.tripId() ? read : null;
  });

  /** "In corso · iniziato oggi alle 07:30", or "n. <number> · <day>" for an ended trip. */
  protected readonly state = computed(() => {
    const trip = this.read()?.trip;
    if (!trip) {
      return null;
    }
    const long = formatDate(startedAt(trip)!, 'EEEE d MMMM', this.locale);
    if (trip.state === 'Ended') {
      return { key: 'driver.documents.state.ended', params: { number: trip.number, date: long } };
    }
    return {
      key: `driver.documents.state.inProgress.${kindOf(trip)}`,
      params: { date: long, time: timeOf(trip) },
    };
  });

  protected readonly cards = computed<Card[]>(() =>
    (this.read()?.documents ?? []).map((item) => {
      const counts: Record<FileKind, number> = { photo: 0, pdf: 0 };
      return {
        document: item.document,
        nameKey: `driver.documents.name.${item.document.toLowerCase()}`,
        required: item.required,
        files: item.attachments.map((attachment) => {
          const kind: FileKind = attachment.fileKind === 'Pdf' ? 'pdf' : 'photo';
          counts[kind] += 1;
          return {
            id: attachment.id,
            kind,
            number: counts[kind],
            added: this.addedText(attachment.addedAt),
          };
        }),
      };
    }),
  );

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const id = params.get('tripId') ?? '';
        if (id !== this.tripId()) {
          this.kept.set({});
          this.refusals.set({});
          this.sending.set({});
          this.rereading.set([]);
          this.runs = {};
        }
        this.tripId.set(id);
        this.facade.needDocuments(id);
      });
    effect(() => {
      const waiting = this.rereading();
      if (waiting.length > 0 && !this.facade.documentsReloading()) {
        waiting.forEach((document) => this.setSending(document, null));
        this.rereading.set([]);
      }
    });
  }

  /** The driver chose a file for a document: it is prepared, then sent under a new identifier. */
  protected async pick(document: TripDocument, input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.sending()[document]) {
      return;
    }
    const tripId = this.tripId();
    this.setKept(document, null);
    await this.run(document, file.type === 'application/pdf' ? 'pdf' : 'photo', async (current) => {
      const prepared = await preparePhoto(file);
      if (!current()) {
        return;
      }
      if (prepared.kind === 'unsupported') {
        this.setRefusal(document, { key: 'driver.documents.refusal.unsupported' });
        return;
      }
      if (prepared.blob.size > MAX_FILE_BYTES) {
        this.setRefusal(document, { key: 'driver.documents.refusal.tooLarge' });
        return;
      }
      const kind = prepared.kind === 'pdf' ? 'pdf' : 'photo';
      this.setSending(document, kind);
      await this.upload(
        document,
        { tripId, id: crypto.randomUUID(), kind, blob: prepared.blob },
        current,
      );
    });
  }

  /** Sends again what the last send of the document kept, under the same identifier. */
  protected async retry(document: TripDocument): Promise<void> {
    const kept = this.kept()[document];
    if (!kept || this.sending()[document]) {
      return;
    }
    await this.run(document, kept.kind, (current) => this.upload(document, kept, current));
  }

  protected askRemove(document: TripDocument, file: FileRow): void {
    this.removeError.set(null);
    this.removing.set({ id: file.id, kind: file.kind, number: file.number, document });
  }

  protected async remove(): Promise<void> {
    const target = this.removing();
    if (!target || this.removeBusy()) {
      return;
    }
    this.removeBusy.set(true);
    this.removeError.set(null);
    try {
      const outcome = await this.facade.removeAttachment(this.tripId(), target.id);
      if (outcome.kind === 'done' || outcome.kind === 'missing') {
        this.removing.set(null);
        this.facade.reloadDocuments();
      } else {
        this.removeError.set(
          outcome.kind === 'notReached' ? { key: 'driver.notReached' } : { key: 'errors.generic' },
        );
      }
    } finally {
      this.removeBusy.set(false);
    }
  }

  /**
   * Shows the card busy while `work` runs; a work that throws ends as the generic refusal. `work` is told
   * whether the run is still the card's own: after a change of trip it is not, and it must leave the card.
   */
  private async run(
    document: TripDocument,
    kind: FileKind,
    work: (current: () => boolean) => Promise<void>,
  ): Promise<void> {
    const token = ++this.lastRun;
    this.runs[document] = token;
    const current = () => this.runs[document] === token;
    this.setRefusal(document, null);
    this.setSending(document, kind);
    try {
      await work(current);
    } catch {
      if (current()) {
        this.setRefusal(document, { key: 'errors.generic' });
      }
    } finally {
      if (current() && !this.rereading().includes(document)) {
        this.setSending(document, null);
      }
    }
  }

  private async upload(
    document: TripDocument,
    file: Sendable,
    current: () => boolean,
  ): Promise<void> {
    const outcome = await this.facade.addAttachment(file.tripId, document, file.id, file.blob);
    if (!current()) {
      return;
    }
    if (outcome.kind === 'done' || outcome.kind === 'missing') {
      this.setKept(document, null);
      this.rereading.update((waiting) => [...waiting, document]);
      this.facade.reloadDocuments();
    } else {
      this.setKept(
        document,
        outcome.kind === 'notReached' || outcome.kind === 'failed' ? file : null,
      );
      this.setRefusal(document, refusalOf(outcome));
    }
  }

  private setKept(document: TripDocument, file: Sendable | null): void {
    this.kept.update((current) => {
      const next = { ...current };
      if (file === null) {
        delete next[document];
      } else {
        next[document] = file;
      }
      return next;
    });
  }

  private setSending(document: TripDocument, kind: FileKind | null): void {
    this.sending.update((current) => {
      const next = { ...current };
      if (kind === null) {
        delete next[document];
      } else {
        next[document] = kind;
      }
      return next;
    });
  }

  private setRefusal(document: TripDocument, refusal: NoticeContent | null): void {
    this.refusals.update((current) => {
      const next = { ...current };
      if (refusal === null) {
        delete next[document];
      } else {
        next[document] = refusal;
      }
      return next;
    });
  }

  /** "oggi 07:41", "ieri 16:05" or "26/11 10:15", on the device's clock. */
  private addedText(addedAt: string): FileRow['added'] {
    const added = new Date(addedAt);
    return {
      key: `driver.documents.added.${dayKind(dayOf(added), dayOf(new Date()))}`,
      params: {
        date: formatDate(added, 'dd/MM', this.locale),
        time: formatDate(added, 'HH:mm', this.locale),
      },
    };
  }
}

/** What a send that did not finish tells the driver under the button of its document. */
function refusalOf(
  outcome: Exclude<AttachmentOutcome, { kind: 'done' | 'missing' }>,
): NoticeContent {
  switch (outcome.kind) {
    case 'rule':
      return { detail: outcome.detail };
    case 'tooLarge':
      return { key: 'driver.documents.refusal.tooLarge' };
    case 'rateLimited':
      return { key: 'driver.documents.refusal.rateLimited' };
    case 'notReached':
      return { key: 'driver.notReached' };
    case 'failed':
      return { key: 'errors.generic' };
  }
}
