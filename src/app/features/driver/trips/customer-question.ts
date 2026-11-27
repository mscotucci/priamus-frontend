import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../../shared/components/icon/icon';
import { TripCustomer } from './new-trip-answers';
import { TripsFacade } from './trips-facade';

const SEARCH_DELAY_MS = 300;

/**
 * The body of question 2: the customers with a contract in force today, the recent ones first.
 * A tap on a card answers.
 */
@Component({
  selector: 'app-customer-question',
  imports: [TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3' },
  templateUrl: './customer-question.html',
})
export class CustomerQuestion {
  protected readonly facade = inject(TripsFacade);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  /** The customer already answered, shown selected. */
  readonly customer = input.required<TripCustomer | null>();
  /** The contract of the customer tapped could not be read, or is not in force today. */
  readonly failed = input.required<boolean>();
  readonly answered = output<TripCustomer>();

  /** The recent customers, then the others. */
  protected readonly all = computed(() => {
    const { recent, others } = this.facade.customers();
    return [...recent, ...others];
  });

  constructor() {
    this.facade.askCustomers();
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected searchFor(text: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.facade.searchCustomers(text), SEARCH_DELAY_MS);
  }

  protected pick(customer: TripCustomer): void {
    clearTimeout(this.searchTimer);
    this.answered.emit(customer);
  }
}
