import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'truck'
  | 'building'
  | 'user'
  | 'user-plus'
  | 'user-x'
  | 'users'
  | 'sign-out'
  | 'menu'
  | 'close'
  | 'plus'
  | 'search'
  | 'chevron'
  | 'check'
  | 'alert'
  | 'settings'
  | 'pin';

@Component({
  selector: 'app-icon',
  template: `<svg [class]="classes()" aria-hidden="true">
    <use [attr.href]="'icons.svg#' + name()" />
  </svg>`,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<'xs' | 'sm' | 'md' | 'lg'>('md');

  protected readonly classes = computed(() =>
    this.size() === 'md' ? 'pt-icon' : `pt-icon pt-icon--${this.size()}`,
  );
}
