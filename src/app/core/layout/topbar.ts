import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../shared/components/icon/icon';
import { Layout } from './layout';

@Component({
  selector: 'app-topbar',
  imports: [TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'sticky top-0 z-10 block' },
  template: `
    <header class="pt-topbar">
      <div class="min-[900px]:hidden">
        <button
          type="button"
          class="pt-btn pt-btn--icon"
          [attr.aria-label]="'shell.menu.open' | translate"
          (click)="layout.openDrawer()"
        >
          <app-icon name="menu" />
        </button>
      </div>
      <div class="pt-topbar__heading">
        <p class="pt-eyebrow">{{ eyebrow() }}</p>
        <!-- the line sits beside the title so the bar keeps the height of the sidebar's brand block -->
        <div class="flex min-w-0 items-baseline gap-3">
          <h1 class="pt-topbar__title">{{ title() }}</h1>
          @if (line(); as line) {
            <p class="pt-muted shrink-0 whitespace-nowrap">{{ line }}</p>
          }
        </div>
      </div>
      <div class="pt-topbar__actions"><ng-content /></div>
    </header>
  `,
})
export class Topbar {
  protected readonly layout = inject(Layout);

  readonly section = input.required<string>();
  readonly page = input<string>();
  readonly title = input.required<string>();
  readonly line = input<string>();

  protected readonly eyebrow = computed(() =>
    [this.section(), this.page()].filter((part) => !!part).join(' · '),
  );
}
