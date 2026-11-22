import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface RateRowPill {
  /** Key of `it.json`. */
  key: string;
  tone: 'danger' | 'warn';
}

export interface RateRowPart {
  /** Shown in monospace before the label, as a licence plate. */
  mono?: string;
  label: string;
  pill: RateRowPill | null;
}

/** One rate of the list: the parts of its title (joined by an arrow), the terms below it. */
export interface RateRow {
  key: string;
  parts: RateRowPart[];
  summary: string;
}

let nextRowsId = 0;

/** The compact list of rates of a contract question, each row with "Modifica" and "Togli". */
@Component({
  selector: 'app-contract-rate-rows',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="flex flex-col gap-2">
      @for (row of rows(); track row.key; let index = $index) {
        <li class="pt-card flex flex-wrap items-center justify-between gap-2 p-3">
          <span class="flex min-w-0 flex-col gap-1">
            <strong [id]="rowsId + '-' + index">
              @for (part of row.parts; track $index; let last = $last) {
                @if (part.mono; as mono) {
                  <span class="pt-mono">{{ mono }}</span>
                }
                {{ part.label }}
                @if (part.pill; as pill) {
                  <span class="pt-pill" [class]="'pt-pill--' + pill.tone">{{
                    pill.key | translate
                  }}</span>
                }
                @if (!last) {
                  →
                }
              }
            </strong>
            <span class="pt-muted">{{ row.summary }}</span>
          </span>
          <span class="flex gap-2">
            <button
              type="button"
              class="pt-btn pt-btn--outline pt-btn--sm"
              data-edit
              [attr.aria-describedby]="rowsId + '-' + index"
              (click)="edit.emit(row.key)"
            >
              {{ 'contracts.form.modify' | translate }}
            </button>
            <button
              type="button"
              class="pt-btn pt-btn--outline pt-btn--sm"
              data-remove
              [attr.aria-describedby]="rowsId + '-' + index"
              (click)="remove(index)"
            >
              {{ 'contracts.form.rateRows.remove' | translate }}
            </button>
          </span>
        </li>
      }
    </ul>
  `,
})
export class ContractRateRows {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly rowsId = `rate-rows-${nextRowsId++}`;

  readonly rows = input.required<RateRow[]>();
  /** The key of the row whose "Modifica" was pressed. */
  readonly edit = output<string>();
  /** The key of the row whose "Togli" was pressed. */
  readonly removed = output<string>();
  /** The removed row was the last one: the focus belongs to the control that adds a row. */
  readonly focusAdd = output();

  /** The next row's "Togli" takes the focus, else the caller's add button does. */
  protected remove(index: number): void {
    const next = index < this.rows().length - 1;
    this.removed.emit(this.rows()[index].key);
    if (!next) {
      this.focusAdd.emit();
      return;
    }
    afterNextRender(
      {
        read: () =>
          this.host.nativeElement.querySelectorAll<HTMLElement>('[data-remove]')[index]?.focus(),
      },
      { injector: this.injector },
    );
  }
}
