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
import { PAGE_SIZE, SortColumn, UserListItem, UserRole, UserStatus } from './users-api';
import { UserCreateDialog } from './user-create-dialog';
import { UserDisableDialog } from './user-disable-dialog';
import { UsersFacade } from './users-facade';

const SEARCH_DELAY_MS = 300;

@Component({
  selector: 'app-user-list',
  imports: [
    Topbar,
    DatePipe,
    TranslatePipe,
    Icon,
    Paging,
    Notice,
    FilterMenu,
    UserCreateDialog,
    UserDisableDialog,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './user-list.html',
})
export class UserList {
  protected readonly facade = inject(UsersFacade);
  protected readonly createOpen = signal(false);
  protected readonly disableTarget = signal<UserListItem | null>(null);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly roles: FilterOption<UserRole>[] = [
    { value: 'Admin', labelKey: 'role.admin' },
    { value: 'BackOffice', labelKey: 'role.backoffice' },
    { value: 'Driver', labelKey: 'role.driver' },
  ];
  protected readonly statuses: FilterOption<UserStatus>[] = [
    { value: 'Active', labelKey: 'users.status.active' },
    { value: 'Disabled', labelKey: 'users.status.disabled' },
  ];
  protected readonly filtered = computed(
    () =>
      this.facade.search() !== '' || this.facade.role() !== null || this.facade.status() !== null,
  );
  protected readonly columns: { key: SortColumn; suffix: string }[] = [
    { key: 'username', suffix: 'username' },
    { key: 'role', suffix: 'role' },
    { key: 'status', suffix: 'status' },
    { key: 'createdAt', suffix: 'created' },
    { key: 'lastModifiedAt', suffix: 'modified' },
  ];

  protected sortBy(column: SortColumn): void {
    const inverted = this.facade.sortDirection() === 'Ascending' ? 'Descending' : 'Ascending';
    this.facade.setSort(column, this.facade.sortColumn() === column ? inverted : 'Ascending');
  }

  protected openCreate(): void {
    this.facade.clearEnableNotice();
    this.createOpen.set(true);
  }

  protected openDisable(user: UserListItem): void {
    this.facade.clearEnableNotice();
    this.disableTarget.set(user);
  }

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected searchFor(text: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.facade.setSearch(text), SEARCH_DELAY_MS);
  }

  protected clearFilters(searchField: HTMLInputElement): void {
    clearTimeout(this.searchTimer);
    searchField.value = '';
    this.facade.clearFilters();
  }
}
