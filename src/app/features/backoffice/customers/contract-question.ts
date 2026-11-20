import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../../shared/components/icon/icon';

/** The card of one numbered question: open it shows the projected choices, closed its answer (none: only the `[note]`); a `[note]` shows in both; `[detail]` lines show under a closed answer when `detailed`. */
@Component({
  selector: 'app-contract-question',
  imports: [TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Esc from any control of the open question bubbles up to the card.
  host: { '(keydown.escape)': 'escape($event)' },
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
          <p
            class="flex flex-wrap gap-3"
            [class.items-center]="!detailed()"
            [class.items-start]="detailed()"
          >
            <span
              class="pt-question__answer"
              [class.flex-col]="detailed()"
              [class.items-start]="detailed()"
              [class.text-left]="detailed()"
            >
              @if (detailed()) {
                <span class="flex items-center gap-2 self-start"
                  ><app-icon name="check" size="sm" /> {{ answer() }}</span
                >
                <ng-content select="[detail]" />
              } @else {
                <app-icon name="check" size="sm" /> {{ answer() }}
              }
            </span>
            @if (!locked()) {
              <button
                type="button"
                class="pt-btn pt-btn--sm"
                data-modify
                [disabled]="busy()"
                (click)="modify.emit()"
                (keydown.arrowup)="step($event, -1)"
                (keydown.arrowdown)="step($event, 1)"
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
  /** The closed answer has one line per item, projected as `[detail]` under the answer. */
  readonly detailed = input(false);
  /** A save is running: "Modifica" is not actionable. */
  readonly busy = input(false);
  /** The answer is shown without "Modifica". */
  readonly locked = input(false);
  /** The question was reopened with "Modifica": Esc cancels the change, as "Annulla modifica". */
  readonly cancellable = input(false);
  readonly modify = output();
  readonly cancelled = output();

  protected escape(event: Event): void {
    if (this.open() && this.cancellable()) {
      event.preventDefault();
      this.cancelled.emit();
    }
  }

  /** The arrows on "Modifica" move the focus to the "Modifica" of the question before or after. */
  protected step(event: Event, by: -1 | 1): void {
    event.preventDefault();
    const button = event.target as HTMLButtonElement;
    const buttons = Array.from(
      (button.closest('main') ?? document).querySelectorAll<HTMLButtonElement>(
        'button[data-modify]:not(:disabled)',
      ),
    );
    buttons[buttons.indexOf(button) + by]?.focus();
  }
}
