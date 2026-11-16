import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Session } from '../auth/session';
import { Icon } from '../../shared/components/icon/icon';
import { Notice } from '../../shared/components/notice/notice';

@Component({
  selector: 'app-startup',
  imports: [TranslatePipe, Icon, Notice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div class="pt-brand">
        <div class="pt-tile pt-tile--primary"><app-icon name="truck" size="lg" /></div>
        <div>
          <p class="pt-brand__name">{{ 'brand.name' | translate }}</p>
          <p class="pt-brand__line">{{ 'brand.tagline' | translate }}</p>
        </div>
      </div>
      @if (session.status() === 'unreachable') {
        <app-notice [notice]="{ key: 'errors.generic' }">
          <button
            #retryButton
            type="button"
            class="pt-btn pt-btn--outline pt-btn--sm"
            (click)="retry()"
          >
            {{ 'common.actions.retry' | translate }}
          </button>
        </app-notice>
      }
    </main>
  `,
})
export class Startup {
  protected readonly session = inject(Session);
  private readonly injector = inject(Injector);
  private readonly retryButton = viewChild<ElementRef<HTMLButtonElement>>('retryButton');

  protected async retry(): Promise<void> {
    await this.session.retry();
    // the button leaves the page while the session restarts: a new failure puts the focus back on it
    if (this.session.status() === 'unreachable') {
      afterNextRender(() => this.retryButton()?.nativeElement.focus(), { injector: this.injector });
    }
  }
}
