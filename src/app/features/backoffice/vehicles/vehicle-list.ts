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
import { PAGE_SIZE, SortColumn, VehicleListItem, VehicleStatus, VehicleType } from './vehicles-api';
import { VehicleDecommissionDialog } from './vehicle-decommission-dialog';
import { VehicleFormDialog } from './vehicle-form-dialog';
import { VehiclesFacade } from './vehicles-facade';

const SEARCH_DELAY_MS = 300;

@Component({
  selector: 'app-vehicle-list',
  imports: [
    Topbar,
    DatePipe,
    TranslatePipe,
    Icon,
    Paging,
    Notice,
    FilterMenu,
    VehicleFormDialog,
    VehicleDecommissionDialog,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './vehicle-list.html',
})
export class VehicleList {
  protected readonly facade = inject(VehiclesFacade);
  protected readonly formOpen = signal(false);
  protected readonly formTarget = signal<VehicleListItem | null>(null);
  protected readonly decommissionTarget = signal<VehicleListItem | null>(null);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly types: FilterOption<VehicleType>[] = [
    { value: 'Tractor', labelKey: 'vehicles.type.tractor' },
    { value: 'Trailer', labelKey: 'vehicles.type.trailer' },
    { value: 'StandaloneVehicle', labelKey: 'vehicles.type.standalonevehicle' },
  ];
  protected readonly statuses: FilterOption<VehicleStatus>[] = [
    { value: 'Active', labelKey: 'vehicles.status.active' },
    { value: 'Decommissioned', labelKey: 'vehicles.status.decommissioned' },
  ];
  protected readonly filtered = computed(
    () =>
      this.facade.search() !== '' || this.facade.type() !== null || this.facade.status() !== null,
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
    { sortKey: 'licensePlate', suffix: 'plate' },
    { sortKey: 'description', suffix: 'description' },
    { sortKey: null, suffix: 'type' },
    { sortKey: null, suffix: 'status' },
    { sortKey: 'lastModifiedAt', suffix: 'modified' },
  ];

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected openDecommission(vehicle: VehicleListItem): void {
    this.facade.clearReactivateNotice();
    this.decommissionTarget.set(vehicle);
  }

  protected openForm(vehicle: VehicleListItem | null): void {
    this.facade.clearReactivateNotice();
    this.formTarget.set(vehicle);
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
    this.facade.setType(null);
    this.facade.setStatus(null);
  }
}
