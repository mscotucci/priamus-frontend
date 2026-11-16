import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ApiError, NoticeContent, noticeOf, toApiError } from '../../../core/api/api-error';
import { Session } from '../../../core/auth/session';
import { Toast } from '../../../core/toast/toast';
import {
  SortColumn,
  SortDirection,
  UserListItem,
  UserPage,
  UserRole,
  UserStatus,
  UsersApi,
  UsersQuery,
} from './users-api';

export type CreateOutcome = 'created' | 'ignored' | ApiError;
export type DisableOutcome = 'disabled' | 'ignored' | ApiError;

@Injectable()
export class UsersFacade {
  private readonly api = inject(UsersApi);
  private readonly toast = inject(Toast);
  private readonly translate = inject(TranslateService);
  private readonly session = inject(Session);

  private readonly searchState = signal('');
  private readonly roleState = signal<UserRole | null>(null);
  private readonly statusState = signal<UserStatus | null>(null);
  private readonly sortColumnState = signal<SortColumn>('username');
  private readonly sortDirectionState = signal<SortDirection>('Ascending');
  private readonly pageState = signal(1);

  readonly search = this.searchState.asReadonly();
  readonly role = this.roleState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly sortColumn = this.sortColumnState.asReadonly();
  readonly sortDirection = this.sortDirectionState.asReadonly();
  readonly page = this.pageState.asReadonly();

  private readonly creatingState = signal(false);
  readonly creating = this.creatingState.asReadonly();

  private readonly disablingState = signal(false);
  readonly disabling = this.disablingState.asReadonly();
  private readonly enablingIdState = signal<string | null>(null);
  readonly enablingId = this.enablingIdState.asReadonly();
  private readonly enableNoticeState = signal<NoticeContent | null>(null);
  readonly enableNotice = this.enableNoticeState.asReadonly();
  readonly currentUserId = computed(() => this.session.user()?.id ?? null);

  private readonly query = computed<UsersQuery>(() => ({
    search: this.searchState(),
    role: this.roleState(),
    status: this.statusState(),
    sortColumn: this.sortColumnState(),
    sortDirection: this.sortDirectionState(),
    page: this.pageState(),
  }));

  private readonly list = httpResource<UserPage>(() => this.api.list(this.query()));

  readonly items = computed<UserListItem[]>(() =>
    this.list.hasValue() ? this.list.value().data : [],
  );
  readonly total = computed(() => (this.list.hasValue() ? this.list.value().totalCount : 0));
  readonly loaded = computed(() => this.list.hasValue());
  readonly loading = computed(() => this.list.isLoading());
  readonly failed = computed(() => this.list.status() === 'error');

  setSearch(search: string): void {
    const trimmed = search.trim();
    if (trimmed === this.searchState()) {
      return;
    }
    this.enableNoticeState.set(null);
    this.searchState.set(trimmed);
    this.pageState.set(1);
  }

  setRole(role: UserRole | null): void {
    this.enableNoticeState.set(null);
    this.roleState.set(role);
    this.pageState.set(1);
  }

  setStatus(status: UserStatus | null): void {
    this.enableNoticeState.set(null);
    this.statusState.set(status);
    this.pageState.set(1);
  }

  clearFilters(): void {
    this.enableNoticeState.set(null);
    this.searchState.set('');
    this.roleState.set(null);
    this.statusState.set(null);
    this.pageState.set(1);
  }

  setSort(column: SortColumn, direction: SortDirection): void {
    this.enableNoticeState.set(null);
    this.sortColumnState.set(column);
    this.sortDirectionState.set(direction);
    this.pageState.set(1);
  }

  setPage(page: number): void {
    this.enableNoticeState.set(null);
    this.pageState.set(page);
  }

  clearEnableNotice(): void {
    this.enableNoticeState.set(null);
  }

  reload(): void {
    this.list.reload();
  }

  async create(username: string, password: string, role: UserRole): Promise<CreateOutcome> {
    if (this.creatingState()) {
      return 'ignored';
    }
    this.creatingState.set(true);
    try {
      try {
        await firstValueFrom(this.api.create({ username, password, role }));
      } catch (error) {
        return toApiError(error);
      }
      this.toast.success(this.translate.instant('users.create.done', { username }));
      this.reload();
      return 'created';
    } finally {
      this.creatingState.set(false);
    }
  }

  async disable(id: string, username: string): Promise<DisableOutcome> {
    if (this.disablingState()) {
      return 'ignored';
    }
    this.disablingState.set(true);
    this.enableNoticeState.set(null);
    try {
      try {
        await firstValueFrom(this.api.disable(id));
      } catch (error) {
        return toApiError(error);
      }
      this.toast.success(this.translate.instant('users.disable.done', { username }));
      this.reload();
      return 'disabled';
    } finally {
      this.disablingState.set(false);
    }
  }

  async enable(id: string, username: string): Promise<void> {
    if (this.enablingIdState() !== null) {
      return;
    }
    this.enablingIdState.set(id);
    this.enableNoticeState.set(null);
    try {
      try {
        await firstValueFrom(this.api.enable(id));
      } catch (error) {
        this.enableNoticeState.set(noticeOf(toApiError(error)));
        return;
      }
      this.toast.success(this.translate.instant('users.enable.done', { username }));
      this.reload();
    } finally {
      this.enablingIdState.set(null);
    }
  }
}
