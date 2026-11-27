import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { isoDay, monthDays, monthName, toDate } from '../../dates/day';
import { NativeValue } from '../../directives/native-value';
import { Icon } from '../icon/icon';
import { placeUnder } from '../../popover/place-under';

/** The days of the period as `yyyy-MM-dd`, both included. */
export interface Period {
  from: string;
  to: string;
}

interface Preset {
  /** The text key of a fixed preset, or the month's own name. */
  key: string | null;
  name: string | null;
  period: Period;
}

/** A typed date applies after this pause, so a day or a year typed digit by digit is not read at each digit. */
const RANGE_DELAY_MS = 600;

/** A year typed digit by digit reads as 0002, 0020, 0202 before 2026: such a day is not complete yet. */
const isComplete = (day: string): boolean => day !== '' && day >= '1000';

let nextId = 0;

@Component({
  selector: 'app-period-menu',
  imports: [TranslatePipe, Icon, NativeValue],
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
        <span class="pt-muted">{{ 'period.label' | translate }}</span>
        @if (selected(); as preset) {
          {{ preset.name ?? (preset.key ?? '' | translate) }}
        } @else {
          {{ rangeText() }}
        }
        <app-icon name="chevron" size="xs" />
      </button>
      <div
        #menu
        popover
        class="pt-menu inset-auto m-0"
        [id]="menuId"
        (beforetoggle)="place(button, menu)"
        (toggle)="onToggle($event)"
      >
        <div role="listbox" [attr.aria-label]="'period.name' | translate">
          @for (preset of presets(); track preset.key ?? preset.name) {
            <button
              type="button"
              class="pt-menu__item"
              role="option"
              [attr.aria-selected]="preset === selected()"
              (click)="pick(menu, preset.period)"
            >
              {{ preset.name ?? (preset.key ?? '' | translate) }}
            </button>
          }
        </div>
        <div class="flex items-start gap-2 px-3 py-2">
          <div class="pt-field">
            <label class="pt-label" [for]="fromId">{{ 'period.from' | translate }}</label>
            <input
              class="pt-input"
              type="date"
              [id]="fromId"
              [appNativeValue]="fromDraft()"
              (change)="setFrom($any($event.target).value)"
            />
          </div>
          <div class="pt-field">
            <label class="pt-label" [for]="toId">{{ 'period.to' | translate }}</label>
            <input
              class="pt-input"
              type="date"
              [id]="toId"
              [appNativeValue]="toDraft()"
              [attr.aria-invalid]="rangeInvalid() ? 'true' : null"
              [attr.aria-describedby]="rangeInvalid() ? errorId : null"
              (change)="setTo($any($event.target).value)"
            />
            @if (rangeInvalid()) {
              <span class="pt-field__error" [id]="errorId">{{ 'period.order' | translate }}</span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PeriodMenu {
  readonly value = input.required<Period>();
  readonly today = input.required<string>();
  readonly valueChange = output<Period>();

  private readonly locale = inject(LOCALE_ID);

  protected readonly menuId = `app-period-menu-${nextId}`;
  protected readonly fromId = `app-period-from-${nextId}`;
  protected readonly toId = `app-period-to-${nextId}`;
  protected readonly errorId = `app-period-error-${nextId++}`;
  protected readonly expanded = signal(false);
  protected readonly fromDraft = linkedSignal(() => this.value().from);
  protected readonly toDraft = linkedSignal(() => this.value().to);
  protected readonly rangeInvalid = computed(
    () =>
      isComplete(this.fromDraft()) && isComplete(this.toDraft()) && this.toDraft() < this.fromDraft(),
  );

  private rangeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.rangeTimer));
  }

  protected readonly presets = computed<Preset[]>(() => {
    const today = toDate(this.today());
    const monday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - ((today.getDay() + 6) % 7),
    );
    const month = (offset: number): Preset => ({
      key: null,
      name: monthName(new Date(today.getFullYear(), today.getMonth() + offset, 1), this.locale),
      period: monthDays(today, offset),
    });
    return [
      { key: 'period.today', name: null, period: { from: this.today(), to: this.today() } },
      { key: 'period.week', name: null, period: { from: isoDay(monday), to: this.today() } },
      month(0),
      month(-1),
    ];
  });

  protected readonly selected = computed(() =>
    this.presets().find(
      (preset) => preset.period.from === this.value().from && preset.period.to === this.value().to,
    ),
  );

  protected readonly rangeText = computed(() => {
    const day = (iso: string) => formatDate(toDate(iso), 'dd/MM/yyyy', this.locale);
    return `${day(this.value().from)} – ${day(this.value().to)}`;
  });

  protected place(button: HTMLElement, menu: HTMLElement): void {
    placeUnder(button, menu);
  }

  /** The fields open on the period applied: a range left half typed or reversed is dropped. */
  protected onToggle(event: Event): void {
    const open = (event as ToggleEvent).newState === 'open';
    this.expanded.set(open);
    if (open) {
      clearTimeout(this.rangeTimer);
      this.fromDraft.set(this.value().from);
      this.toDraft.set(this.value().to);
    }
  }

  protected pick(menu: HTMLElement, period: Period): void {
    clearTimeout(this.rangeTimer);
    menu.hidePopover();
    this.fromDraft.set(period.from);
    this.toDraft.set(period.to);
    this.valueChange.emit(period);
  }

  protected setFrom(from: string): void {
    this.fromDraft.set(from);
    this.emitRange();
  }

  protected setTo(to: string): void {
    this.toDraft.set(to);
    this.emitRange();
  }

  private emitRange(): void {
    clearTimeout(this.rangeTimer);
    this.rangeTimer = setTimeout(() => {
      const range = { from: this.fromDraft(), to: this.toDraft() };
      const changed = range.from !== this.value().from || range.to !== this.value().to;
      if (isComplete(range.from) && isComplete(range.to) && !this.rangeInvalid() && changed) {
        this.valueChange.emit(range);
      }
    }, RANGE_DELAY_MS);
  }
}
