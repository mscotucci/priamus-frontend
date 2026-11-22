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
import { LocationDeactivateDialog } from './location-deactivate-dialog';
import { LocationFormDialog } from './location-form-dialog';
import { LocationListItem, LocationStatus, PAGE_SIZE, SortColumn } from './locations-api';
import { LocationsFacade } from './locations-facade';

const SEARCH_DELAY_MS = 300;

@Component({
  selector: 'app-location-list',
  imports: [
    Topbar,
    DatePipe,
    TranslatePipe,
    Icon,
    Paging,
    Notice,
    FilterMenu,
    LocationFormDialog,
    LocationDeactivateDialog,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './location-list.html',
})
export class LocationList {
  protected readonly facade = inject(LocationsFacade);
  /** The dialog is open: for a new location (null) or for the one being edited. */
  protected readonly formTarget = signal<{ location: LocationListItem | null } | null>(null);
  protected readonly deactivateTarget = signal<LocationListItem | null>(null);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly statuses: FilterOption<LocationStatus>[] = [
    { value: 'Active', labelKey: 'locations.status.active' },
    { value: 'Deactivated', labelKey: 'locations.status.deactivated' },
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
    { sortKey: 'municipality', suffix: 'municipality' },
    { sortKey: null, suffix: 'address' },
    { sortKey: null, suffix: 'status' },
    { sortKey: 'lastModifiedAt', suffix: 'modified' },
  ];

  constructor() {
    this.facade.loadList();
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected openForm(location: LocationListItem | null): void {
    this.facade.clearReactivateNotice();
    this.formTarget.set({ location });
  }

  protected openDeactivate(location: LocationListItem): void {
    this.facade.clearReactivateNotice();
    this.deactivateTarget.set(location);
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
