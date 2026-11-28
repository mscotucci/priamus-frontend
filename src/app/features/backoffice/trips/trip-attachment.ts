import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../../shared/components/icon/icon';
import type { TripAttachmentItem } from './backoffice-trips-api';
import { BackofficeTripsFacade } from './backoffice-trips-facade';

/**
 * How long the object URL handed to a new tab lives: long enough for the tab to load the file,
 * then it is released.
 */
const TAB_URL_LIFETIME_MS = 60_000;

/** One file of a trip's document: a thumbnail for a photo, a line for a PDF; a click opens it in a new tab. */
@Component({
  selector: 'app-trip-attachment',
  imports: [DatePipe, TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trip-attachment.html',
})
export class TripAttachment implements OnInit {
  private readonly facade = inject(BackofficeTripsFacade);
  private readonly destroyRef = inject(DestroyRef);

  readonly tripId = input.required<string>();
  readonly attachment = input.required<TripAttachmentItem>();
  /** The document's name, already in words. */
  readonly documentName = input.required<string>();
  /** The position of this file among those of its kind in its document, from 1. */
  readonly number = input.required<number>();

  /** The file could not be opened: the browser blocked the new tab, or the file could not be fetched. */
  readonly failed = output<void>();
  /** The file was opened in the new tab. */
  readonly opened = output<void>();

  /** The photo's object URL once fetched; the frame stays neutral until then. */
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly photoFailed = signal(false);
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      const url = this.photoUrl();
      if (url !== null) {
        URL.revokeObjectURL(url);
      }
    });
  }

  ngOnInit(): void {
    if (this.attachment().fileKind !== 'Jpeg') {
      return;
    }
    this.fetch().then(
      (blob) => {
        if (this.destroyed) {
          return;
        }
        this.photoUrl.set(URL.createObjectURL(blob));
      },
      () => {
        if (!this.destroyed) {
          this.photoFailed.set(true);
        }
      },
    );
  }

  /** Opens the file in a new tab; the tab is opened inside the click so the browser does not block it. */
  protected open(): void {
    const tab = window.open('', '_blank');
    if (tab === null) {
      this.failed.emit();
      return;
    }
    tab.opener = null;
    const photo = this.photoUrl();
    if (photo !== null) {
      this.show(tab, photo);
      this.opened.emit();
      return;
    }
    this.fetch().then(
      (blob) => {
        const url = URL.createObjectURL(blob);
        this.show(tab, url);
        this.opened.emit();
        setTimeout(() => URL.revokeObjectURL(url), TAB_URL_LIFETIME_MS);
      },
      () => {
        tab.close();
        this.failed.emit();
      },
    );
  }

  private show(tab: Window, url: string): void {
    tab.location.href = url;
  }

  private fetch(): Promise<Blob> {
    return this.facade.attachmentFile(this.tripId(), this.attachment().id);
  }
}
