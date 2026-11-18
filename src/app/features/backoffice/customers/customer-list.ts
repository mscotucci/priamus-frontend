import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Topbar } from '../../../core/layout/topbar';
import { FilterMenu, FilterOption } from '../../../shared/components/filter-menu/filter-menu';
import { Icon } from '../../../shared/components/icon/icon';
import { Notice } from '../../../shared/components/notice/notice';
import { Paging } from '../../../shared/components/paging/paging';
import { CustomerDeactivateDialog } from './customer-deactivate-dialog';
import { CustomerFormDialog } from './customer-form-dialog';
import { CustomerListItem, CustomerStatus, PAGE_SIZE, SortColumn } from './customers-api';
import { CustomersFacade } from './customers-facade';

const SEARCH_DELAY_MS = 300;

@Component({
  selector: 'app-customer-list',
  imports: [
    Topbar,
    DatePipe,
    TranslatePipe,
    Icon,
    Paging,
    Notice,
    FilterMenu,
    CustomerFormDialog,
    CustomerDeactivateDialog,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './customer-list.html',
})
export class CustomerList {
  protected readonly facade = inject(CustomersFacade);
  protected readonly formOpen = signal(false);
  protected readonly formTarget = signal<CustomerListItem | null>(null);
  protected readonly deactivateTarget = signal<CustomerListItem | null>(null);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly statuses: FilterOption<CustomerStatus>[] = [
    { value: 'Active', labelKey: 'customers.status.active' },
    { value: 'Deactivated', labelKey: 'customers.status.deactivated' },
  ];
  protected readonly filtered = computed(
    () => this.facade.search() !== '' || this.facade.status() !== null,
  );
  protected readonly registryEmpty = computed(
    () =>
      this.facade.loaded() &&
      !this.facade.loading() &&
      !this.facade.failed() &&
      this.facade.total() === 0 &&
      !this.filtered(),
  );
  protected readonly columns: { sortKey: SortColumn | null; suffix: string }[] = [
    { sortKey: 'companyName', suffix: 'companyname' },
    { sortKey: null, suffix: 'vatnumber' },
    { sortKey: null, suffix: 'address' },
    { sortKey: null, suffix: 'status' },
    { sortKey: 'lastModifiedAt', suffix: 'modified' },
  ];

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected openDeactivate(customer: CustomerListItem): void {
    this.facade.clearReactivateNotice();
    this.deactivateTarget.set(customer);
  }

  protected openForm(customer: CustomerListItem | null): void {
    this.facade.clearReactivateNotice();
    this.formTarget.set(customer);
    this.formOpen.set(true);
  }

  protected sortBy(column: SortColumn): void {
    const inverted = this.facade.sortDirection() === 'Ascending' ? 'Descending' : 'Ascending';
    this.facade.setSort(column, this.facade.sortColumn() === column ? inverted : 'Ascending');
  }

  protected searchFor(text: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.facade.setSearch(text), SEARCH_DELAY_MS);
  }

  protected clearFilters(searchField: HTMLInputElement): void {
    clearTimeout(this.searchTimer);
    searchField.value = '';
    this.facade.setSearch('');
    this.facade.setStatus(null);
  }
}
