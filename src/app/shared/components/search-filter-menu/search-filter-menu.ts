import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../icon/icon';
import { placeUnder } from '../../popover/place-under';

export interface SearchFilterOption {
  id: string;
  label: string;
}

const SEARCH_DELAY_MS = 300;

let nextId = 0;

@Component({
  selector: 'app-search-filter-menu',
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
        {{ value()?.label ?? ('filter.all.value' | translate) }}
        <app-icon name="chevron" size="xs" />
      </button>
      <div
        #menu
        popover
        class="pt-menu pt-menu--search inset-auto m-0"
        [id]="menuId"
        (beforetoggle)="place(button, menu)"
        (toggle)="onToggle($event, searchField)"
      >
        <div class="px-3 py-2">
          <label class="pt-search pt-search--sm">
            <app-icon name="search" size="sm" />
            <input
              #searchField
              type="search"
              maxlength="100"
              [attr.aria-label]="searchLabelKey() | translate"
              (input)="searchFor(searchField.value)"
            />
          </label>
        </div>
        <div role="listbox" [attr.aria-label]="labelKey() | translate">
          <button
            type="button"
            class="pt-menu__item"
            role="option"
            [attr.aria-selected]="value() === null"
            (click)="pick(menu, null)"
          >
            {{ 'filter.all.label' | translate }}
          </button>
          @for (option of searched() === '' ? [] : options(); track option.id) {
            <button
              type="button"
              class="pt-menu__item"
              role="option"
              [attr.aria-selected]="value()?.id === option.id"
              (click)="pick(menu, option)"
            >
              {{ option.label }}
            </button>
          }
        </div>
        @let note =
          searched() === ''
            ? 'filter.hint'
            : loading()
              ? 'filter.loading'
              : options().length === 0
                ? 'filter.none'
                : more()
                  ? 'filter.more'
                  : null;
        @if (note) {
          <p class="pt-muted px-3 py-2" role="status">{{ note | translate }}</p>
        }
      </div>
    </div>
  `,
})
export class SearchFilterMenu {
  readonly labelKey = input.required<string>();
  readonly searchLabelKey = input.required<string>();
  readonly value = input.required<SearchFilterOption | null>();
  readonly options = input.required<SearchFilterOption[]>();
  readonly loading = input.required<boolean>();
  /** The search found more options than those given: the menu asks to type more. */
  readonly more = input(false);
  readonly searchChange = output<string>();
  readonly valueChange = output<SearchFilterOption | null>();

  protected readonly menuId = `app-search-filter-menu-${nextId++}`;
  protected readonly expanded = signal(false);
  /** The text last sent to the search: records are listed only once something is searched. */
  protected readonly searched = signal('');

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected place(button: HTMLElement, menu: HTMLElement): void {
    placeUnder(button, menu);
  }

  /** Closing the menu empties its search, so it opens again on the hint. */
  protected onToggle(event: Event, searchField: HTMLInputElement): void {
    const open = (event as ToggleEvent).newState === 'open';
    this.expanded.set(open);
    if (!open && searchField.value !== '') {
      searchField.value = '';
      this.searchFor('');
    }
  }

  protected searchFor(text: string): void {
    clearTimeout(this.searchTimer);
    const search = text.trim();
    if (search === '') {
      this.send('');
      return;
    }
    this.searchTimer = setTimeout(() => this.send(search), SEARCH_DELAY_MS);
  }

  private send(search: string): void {
    this.searched.set(search);
    this.searchChange.emit(search);
  }

  protected pick(menu: HTMLElement, option: SearchFilterOption | null): void {
    menu.hidePopover();
    this.valueChange.emit(option);
  }
}
