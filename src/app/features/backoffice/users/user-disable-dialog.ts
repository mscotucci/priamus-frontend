import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NoticeContent, noticeOf } from '../../../core/api/api-error';
import { Notice } from '../../../shared/components/notice/notice';
import { Dialog } from '../../../shared/components/dialog/dialog';
import { UserListItem } from './users-api';
import { UsersFacade } from './users-facade';

@Component({
  selector: 'app-user-disable-dialog',
  imports: [Dialog, Notice, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-disable-dialog.html',
})
export class UserDisableDialog {
  protected readonly facade = inject(UsersFacade);
  readonly user = input.required<UserListItem>();
  readonly closed = output<void>();
  private readonly injector = inject(Injector);

  private readonly cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancel');
  private readonly refusal = signal<NoticeContent | null>(null);
  protected readonly notice = this.refusal.asReadonly();
  protected readonly roleKey = computed(() => 'role.' + this.user().role.toLowerCase());

  constructor() {
    // the read phase runs after the dialog component has opened the native dialog
    afterNextRender({ read: () => this.cancelButton().nativeElement.focus() });
  }

  protected async disable(): Promise<void> {
    if (this.facade.disabling()) {
      return;
    }
    this.refusal.set(null);
    const { id, username } = this.user();
    const outcome = await this.facade.disable(id, username);
    if (outcome === 'disabled') {
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
