import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icon, IconName } from '../icon/icon';

let nextId = 0;

@Component({
  selector: 'app-dialog',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="pt-dialog m-auto text-inherit backdrop:bg-scrim"
      [class.pt-dialog--lg]="size() === 'lg'"
      [attr.aria-labelledby]="titleId"
      [attr.aria-busy]="busy()"
      (cancel)="onCancel($event)"
      (close)="onClose()"
    >
      <div class="pt-dialog__head">
        <div class="pt-tile" [class]="'pt-tile--' + tone()">
          <app-icon [name]="icon()" size="lg" />
        </div>
        <div>
          <p class="pt-title" [id]="titleId">
            {{ title() }}
            @if (code(); as code) {
              <span class="pt-mono">{{ code }}</span>
            }
          </p>
          @if (line(); as line) {
            <p class="pt-muted text-xs">{{ line }}</p>
          }
        </div>
      </div>
      <ng-content />
      <div class="pt-dialog__actions"><ng-content select="[actions]" /></div>
    </dialog>
  `,
})
export class Dialog {
  readonly icon = input.required<IconName>();
  readonly tone = input.required<'primary' | 'success' | 'warn' | 'danger'>();
  readonly title = input.required<string>();
  /** A code that ends the title (a plate), shown in mono; it stays part of the dialog's label. */
  readonly code = input<string | null>(null);
  readonly line = input<string | null>(null);
  readonly size = input<'md' | 'lg'>('md');
  readonly busy = input(false);
  readonly closeRequested = output<void>();

  protected readonly titleId = `app-dialog-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  private destroyed = false;
  // the dialog is created by a click, so the focused element is the control that opened it
  private readonly opener = inject(DOCUMENT).activeElement;

  constructor() {
    afterNextRender(() => {
      const element = this.dialog().nativeElement;
      if (!element.open) {
        element.showModal();
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      const element = this.dialog().nativeElement;
      if (element.open) {
        element.close();
      }
      // removing the dialog from the page loses the focus: give it back to the opener
      if (this.opener instanceof HTMLElement && this.opener.isConnected) {
        this.opener.focus();
      }
    });
  }

  // the browser would close the dialog on Escape by itself: the caller decides, by removing it
  protected onCancel(event: Event): void {
    event.preventDefault();
    if (!this.busy()) {
      this.closeRequested.emit();
    }
  }

  // a browser can close the native dialog although `cancel` was prevented (Escape twice in Chrome)
  protected onClose(): void {
    if (this.destroyed) {
      return;
    }
    if (this.busy()) {
      this.dialog().nativeElement.showModal();
    } else {
      this.closeRequested.emit();
    }
  }
}
