import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-paging',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-center justify-between gap-2' },
  template: `
    <span class="pt-label">{{
      rangeKey() | translate: { from: from(), to: to(), total: total() }
    }}</span>

    <span class="pt-paging">
      <button
        type="button"
        class="pt-btn pt-btn--outline pt-btn--sm"
        [disabled]="page() <= 1"
        (click)="pageChange.emit(page() - 1)"
      >
        {{ 'paging.previous' | translate }}
      </button>
      <span class="pt-muted">{{
        'paging.page' | translate: { page: page(), pages: pages() }
      }}</span>
      <button
        type="button"
        class="pt-btn pt-btn--outline pt-btn--sm"
        [disabled]="page() >= pages()"
        (click)="pageChange.emit(page() + 1)"
      >
        {{ 'paging.next' | translate }}
      </button>
    </span>
  `,
})
export class Paging {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly rangeKey = input.required<string>();
  readonly pageChange = output<number>();

  protected readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  protected readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
}
