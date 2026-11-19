import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../../shared/components/icon/icon';

/** The card of one numbered question: open it shows the projected choices, closed its answer (none: only the `[note]`); a `[note]` shows in both. */
@Component({
  selector: 'app-contract-question',
  imports: [TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="pt-question"
      [class.pt-question--answered]="!open()"
      [attr.aria-current]="current() ? 'step' : null"
    >
      <span class="pt-question__number">{{ number() }}</span>
      <div class="flex flex-1 flex-col gap-2">
        <h3 class="pt-title">{{ title() }}</h3>
        @if (hint(); as hint) {
          <p class="pt-muted">{{ hint }}</p>
        }
        @if (open()) {
          <ng-content />
        } @else if (answer() !== null) {
          <p class="flex flex-wrap items-center gap-3">
            <span class="pt-question__answer"
              ><app-icon name="check" size="sm" /> {{ answer() }}</span
            >
            @if (!locked()) {
              <button
                type="button"
                class="pt-btn pt-btn--sm"
                [disabled]="busy()"
                (click)="modify.emit()"
              >
                {{ 'contracts.form.modify' | translate }}
              </button>
            }
          </p>
        }
        <ng-content select="[note]" />
      </div>
    </section>
  `,
})
export class ContractQuestion {
  readonly number = input.required<number>();
  readonly title = input.required<string>();
  readonly hint = input<string>();
  /** The question is being answered; otherwise it shows `answer`. */
  readonly open = input.required<boolean>();
  /** The step the page is on: at most one card at a time. */
  readonly current = input(false);
  readonly answer = input<string | null>(null);
  /** A save is running: "Modifica" is not actionable. */
  readonly busy = input(false);
  /** The answer is shown without "Modifica". */
  readonly locked = input(false);
  readonly modify = output();
}
