import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NoticeContent, noticeOf } from '../../../core/api/api-error';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { Notice } from '../../../shared/components/notice/notice';
import { fullName } from './driver-names';
import { DriverListItem } from './drivers-api';
import { DriversFacade } from './drivers-facade';

@Component({
  selector: 'app-driver-deactivate-dialog',
  imports: [Dialog, Notice, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './driver-deactivate-dialog.html',
})
export class DriverDeactivateDialog {
  protected readonly facade = inject(DriversFacade);
  protected readonly fullName = fullName;
  readonly driver = input.required<DriverListItem>();
  readonly closed = output<void>();
  private readonly injector = inject(Injector);

  private readonly cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancel');
  private readonly refusal = signal<NoticeContent | null>(null);
  protected readonly notice = this.refusal.asReadonly();

  constructor() {
    // the read phase runs after the dialog component has opened the native dialog
    afterNextRender({ read: () => this.cancelButton().nativeElement.focus() });
  }

  protected async deactivate(): Promise<void> {
    if (this.facade.deactivating()) {
      return;
    }
    this.refusal.set(null);
    const outcome = await this.facade.deactivate(this.driver());
    if (outcome === 'deactivated') {
      this.closed.emit();
    } else if (outcome !== 'ignored') {
      this.refusal.set(noticeOf(outcome));
      // the focused button was disabled during the call; the buttons are enabled again only after the next render
      afterNextRender(() => this.cancelButton().nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}
