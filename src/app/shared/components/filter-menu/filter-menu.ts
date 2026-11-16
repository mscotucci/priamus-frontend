import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../icon/icon';

export interface FilterOption<T extends string> {
  value: T;
  labelKey: string;
}

let nextId = 0;

@Component({
  selector: 'app-filter-menu',
  imports: [TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pt-filter">
      <button
        #button
        type="button"
        class="pt-filter__button"
        aria-haspopup="listbox"
        [attr.popovertarget]="menuId"
        [attr.aria-expanded]="expanded()"
      >
        <span class="pt-muted">{{ labelKey() | translate }}</span>
        {{ currentKey() | translate }}
        <app-icon name="chevron" size="xs" />
      </button>
      <div
        #menu
        popover
        class="pt-menu inset-auto m-0"
        role="listbox"
        [id]="menuId"
        [attr.aria-label]="labelKey() | translate"
        (beforetoggle)="place(button, menu)"
        (toggle)="onToggle($event)"
      >
        <button
          type="button"
          class="pt-menu__item"
          role="option"
          [attr.aria-selected]="value() === null"
          (click)="pick(menu, null)"
        >
          {{ 'filter.all.label' | translate }}
        </button>
        @for (option of options(); track option.value) {
          <button
            type="button"
            class="pt-menu__item"
            role="option"
            [attr.aria-selected]="value() === option.value"
            (click)="pick(menu, option.value)"
          >
            {{ option.labelKey | translate }}
          </button>
        }
      </div>
    </div>
  `,
})
export class FilterMenu<T extends string> {
  readonly labelKey = input.required<string>();
  readonly options = input.required<FilterOption<T>[]>();
  readonly value = input.required<T | null>();
  readonly valueChange = output<T | null>();

  protected readonly menuId = `app-filter-menu-${nextId++}`;
  protected readonly expanded = signal(false);
  protected readonly currentKey = computed(
    () =>
      this.options().find((option) => option.value === this.value())?.labelKey ??
      'filter.all.value',
  );

  protected place(button: HTMLElement, menu: HTMLElement): void {
    const box = button.getBoundingClientRect();
    menu.style.top = `${box.bottom + 4}px`;
    menu.style.left = `${box.left}px`;
  }

  protected onToggle(event: Event): void {
    this.expanded.set((event as ToggleEvent).newState === 'open');
  }

  protected pick(menu: HTMLElement, value: T | null): void {
    menu.hidePopover();
    this.valueChange.emit(value);
  }
}
