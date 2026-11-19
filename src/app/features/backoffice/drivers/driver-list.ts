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
import { DriverDeactivateDialog } from './driver-deactivate-dialog';
import { DriverFormDialog } from './driver-form-dialog';
import { listName } from './driver-names';
import { DriverListItem, DriverStatus, PAGE_SIZE, SortColumn } from './drivers-api';
import { DriversFacade } from './drivers-facade';

const SEARCH_DELAY_MS = 300;

@Component({
  selector: 'app-driver-list',
  imports: [
    Topbar,
    DatePipe,
    TranslatePipe,
    Icon,
    Paging,
    Notice,
    FilterMenu,
    DriverFormDialog,
    DriverDeactivateDialog,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './driver-list.html',
})
export class DriverList {
  protected readonly facade = inject(DriversFacade);
  protected readonly formOpen = signal(false);
  /** The driver the open dialog edits; `null` when it creates one. */
  protected readonly formDriver = signal<DriverListItem | null>(null);
  protected readonly deactivateTarget = signal<DriverListItem | null>(null);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly listName = listName;
  protected readonly statuses: FilterOption<DriverStatus>[] = [
    { value: 'Active', labelKey: 'drivers.status.active' },
    { value: 'Deactivated', labelKey: 'drivers.status.deactivated' },
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
    { sortKey: 'name', suffix: 'name' },
    { sortKey: null, suffix: 'phone' },
    { sortKey: null, suffix: 'account' },
    { sortKey: null, suffix: 'status' },
    { sortKey: 'lastModifiedAt', suffix: 'modified' },
  ];

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected openDeactivate(driver: DriverListItem): void {
    this.facade.clearReactivateNotice();
    this.deactivateTarget.set(driver);
  }

  protected openForm(driver: DriverListItem | null): void {
    this.facade.clearReactivateNotice();
    this.formDriver.set(driver);
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
