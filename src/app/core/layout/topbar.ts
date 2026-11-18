import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../shared/components/icon/icon';
import { Layout } from './layout';

/** One level of the breadcrumb: a level that is a page has the link to it; one without a label is not shown. */
export interface Crumb {
  label: string;
  link?: string;
}

@Component({
  selector: 'app-topbar',
  imports: [TranslatePipe, Icon, RouterLink],
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
        <nav [attr.aria-label]="'shell.breadcrumb' | translate">
          <ol class="pt-breadcrumb">
            @for (crumb of crumbs(); track $index) {
              @if (crumb.label) {
                <li>
                  @if (crumb.link) {
                    <a [routerLink]="crumb.link">{{ crumb.label }}</a>
                  } @else {
                    {{ crumb.label }}
                  }
                </li>
              }
            }
          </ol>
        </nav>
        <!-- the line sits beside the title so the bar keeps the height of the sidebar's brand block -->
        <div class="flex min-w-0 items-baseline gap-3">
          <h1 class="pt-topbar__title">{{ title() }}</h1>
          @if (line(); as line) {
            <p class="pt-muted shrink-0 whitespace-nowrap">{{ line }}</p>
          }
          <ng-content select="[titleAside]" />
        </div>
      </div>
      <div class="pt-topbar__actions"><ng-content /></div>
    </header>
  `,
})
export class Topbar {
  protected readonly layout = inject(Layout);

  /** The levels above the page, from the outermost; the page itself is the title. */
  readonly crumbs = input.required<readonly Crumb[]>();
  readonly title = input.required<string>();
  readonly line = input<string>();
}
