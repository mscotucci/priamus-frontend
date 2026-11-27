import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../../shared/components/icon/icon';

export type TripQuestionState = 'open' | 'answered' | 'upcoming';

/**
 * One numbered question of "Nuovo viaggio" at driver size. Open it shows its `title` and the
 * projected choices, answered a check, its `name`, the projected `[answer]` lines and "Modifica";
 * upcoming only its number and `name`.
 */
@Component({
  selector: 'app-trip-question',
  imports: [TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="pt-question scroll-mt-20"
      [class.pt-question--answered]="state() === 'answered'"
      [attr.aria-current]="state() === 'open' ? 'step' : null"
    >
      <span class="pt-question__number">
        @if (state() === 'answered') {
          <app-icon name="check" size="sm" />
        } @else {
          {{ number() }}
        }
      </span>
      @switch (state()) {
        @case ('open') {
          <div class="flex min-w-0 flex-1 flex-col gap-3">
            <h2 class="pt-question__title">{{ title() }}</h2>
            <ng-content />
          </div>
        }
        @case ('answered') {
          <div class="min-w-0 flex-1">
            <h2 class="pt-question__title">{{ name() }}</h2>
            <ng-content select="[answer]" />
          </div>
          <button type="button" class="pt-link" (click)="modify.emit()">
            {{ 'driver.newTrip.modify' | translate }}
          </button>
        }
        @default {
          <h2 class="pt-question__title">{{ name() }}</h2>
        }
      }
    </section>
  `,
})
export class TripQuestion {
  readonly number = input.required<number>();
  /** The short name shown when answered or upcoming. */
  readonly name = input.required<string>();
  /** The question as asked, shown when open. */
  readonly title = input.required<string>();
  readonly state = input.required<TripQuestionState>();
  readonly modify = output();
}
