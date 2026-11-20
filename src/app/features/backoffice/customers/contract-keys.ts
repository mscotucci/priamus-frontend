import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * The keyboard hint of an open question: the arrows choose, then Space or Enter confirm a single
 * choice, or, where the choice opens fields, Tab reaches them and "Conferma" confirms; in a
 * reopened question Esc goes back to the answer.
 */
@Component({
  selector: 'app-contract-keys',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <p class="pt-keys">
      <span
        ><kbd class="pt-kbd">{{ 'contracts.form.keys.up' | translate }}</kbd
        >&ngsp;<kbd class="pt-kbd">{{ 'contracts.form.keys.down' | translate }}</kbd>
        {{ 'contracts.form.keys.choose' | translate }}</span
      >
      @if (byButton()) {
        <span
          ><kbd class="pt-kbd">{{ 'contracts.form.keys.tab' | translate }}</kbd>
          {{ 'contracts.form.keys.thenConfirm' | translate }}</span
        >
      } @else {
        <span
          ><kbd class="pt-kbd">{{ 'contracts.form.keys.enter' | translate }}</kbd>
          {{ 'contracts.form.keys.or' | translate }}
          <kbd class="pt-kbd">{{ 'contracts.form.keys.space' | translate }}</kbd>
          {{ 'contracts.form.keys.confirm' | translate }}</span
        >
      }
      @if (cancellable()) {
        <span
          ><kbd class="pt-kbd">{{ 'contracts.form.keys.esc' | translate }}</kbd>
          {{ 'contracts.form.keys.cancel' | translate }}</span
        >
      }
    </p>
  `,
})
export class ContractKeys {
  /** The choice opens fields and only "Conferma" confirms it. */
  readonly byButton = input(false);
  /** The question was reopened with "Modifica": Esc goes back to its answer. */
  readonly cancellable = input(false);
}
