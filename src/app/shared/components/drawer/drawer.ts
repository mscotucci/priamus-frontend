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
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../icon/icon';

let nextId = 0;

/** A read-only panel docked to the right over the page: closes with its X, Escape or a click outside it. */
@Component({
  selector: 'app-drawer',
  imports: [Icon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="pt-drawer pt-card m-0 ml-auto h-full max-h-full p-0 text-inherit backdrop:bg-scrim [&:not([open])]:hidden"
      [attr.aria-labelledby]="titleId"
      (cancel)="onCancel($event)"
      (close)="onClose()"
    >
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="pt-drawer__head">
          <div>
            <p class="pt-label">{{ eyebrow() }}</p>
            <p class="pt-title" [id]="titleId">{{ title() }}</p>
          </div>
          <button
            type="button"
            class="pt-btn pt-btn--outline pt-btn--sm"
            [attr.aria-label]="'common.actions.close' | translate"
            (click)="closeRequested.emit()"
          >
            <app-icon name="close" size="sm" />
          </button>
        </div>
        <div class="pt-drawer__body min-h-0 flex-1 overflow-y-auto">
          <ng-content />
        </div>
      </div>
    </dialog>
  `,
})
export class Drawer {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly closeRequested = output<void>();

  protected readonly titleId = `app-drawer-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  private destroyed = false;
  // the drawer is created by a click, so the focused element is the control that opened it
  private readonly opener = inject(DOCUMENT).activeElement;
  // where the focus goes when the opener is gone (its row left the list): the page's main area
  private readonly fallback = this.opener?.closest('main') ?? null;

  constructor() {
    afterNextRender(() => {
      const element = this.dialog().nativeElement;
      // the content fills the dialog, so a press on the dialog itself is a press on the backdrop; a click
      // closes only when it also started there, not when a text selection dragged out of the content ends on it
      let pressedOnBackdrop = false;
      element.addEventListener('pointerdown', (event) => {
        pressedOnBackdrop = event.target === element;
      });
      element.addEventListener('click', (event) => {
        if (event.target === element && pressedOnBackdrop) {
          this.closeRequested.emit();
        }
        pressedOnBackdrop = false;
      });
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
      // removing the drawer from the page loses the focus: give it back to the opener, or to the main area
      // when the opener left the page, so that the keyboard goes on from the list and not from the top
      if (this.opener instanceof HTMLElement && this.opener.isConnected) {
        this.opener.focus();
      } else if (this.fallback instanceof HTMLElement && this.fallback.isConnected) {
        if (!this.fallback.hasAttribute('tabindex')) {
          this.fallback.setAttribute('tabindex', '-1');
        }
        this.fallback.focus();
      }
    });
  }

  // the browser would close the dialog on Escape by itself: the caller decides, by removing it
  protected onCancel(event: Event): void {
    event.preventDefault();
    this.closeRequested.emit();
  }

  // a browser can close the native dialog although `cancel` was prevented (Escape twice in Chrome)
  protected onClose(): void {
    if (!this.destroyed) {
      this.closeRequested.emit();
    }
  }
}
