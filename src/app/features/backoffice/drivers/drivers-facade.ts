import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiError,
  isStale,
  NoticeContent,
  noticeOf,
  toApiError,
} from '../../../core/api/api-error';
import { Session } from '../../../core/auth/session';
import { Toast } from '../../../core/toast/toast';
import { UsersApi } from '../users/users-api';
import { fullName } from './driver-names';
import {
  CreateDriverRequest,
  DriverAccount,
  DriverListItem,
  DriverListPage,
  DriverStatus,
  DriversApi,
  DriversQuery,
  SortColumn,
  SortDirection,
} from './drivers-api';

export type SaveOutcome = 'saved' | 'ignored' | ApiError;
export type DeactivateOutcome = 'deactivated' | 'ignored' | ApiError;
export type CreateAccountOutcome = { userId: string } | 'ignored' | ApiError;

@Injectable()
export class DriversFacade {
  private readonly api = inject(DriversApi);
  private readonly toast = inject(Toast);
  private readonly translate = inject(TranslateService);
  private readonly usersApi = inject(UsersApi);
  private readonly session = inject(Session);

  private readonly searchState = signal('');
  private readonly statusState = signal<DriverStatus | null>(null);
  private readonly sortColumnState = signal<SortColumn>('name');
  private readonly sortDirectionState = signal<SortDirection>('Ascending');
  private readonly pageState = signal(1);

  readonly search = this.searchState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly sortColumn = this.sortColumnState.asReadonly();
  readonly sortDirection = this.sortDirectionState.asReadonly();
  readonly page = this.pageState.asReadonly();

  private readonly query = computed<DriversQuery>(() => ({
    search: this.searchState(),
    status: this.statusState(),
    sortColumn: this.sortColumnState(),
    sortDirection: this.sortDirectionState(),
    page: this.pageState(),
  }));

  private readonly savingState = signal(false);
  readonly saving = this.savingState.asReadonly();

  private readonly deactivatingState = signal(false);
  readonly deactivating = this.deactivatingState.asReadonly();
  private readonly reactivatingIdState = signal<string | null>(null);
  readonly reactivatingId = this.reactivatingIdState.asReadonly();
  private readonly reactivateNoticeState = signal<NoticeContent | null>(null);
  readonly reactivateNotice = this.reactivateNoticeState.asReadonly();

  private readonly creatingAccountState = signal(false);
  readonly creatingAccount = this.creatingAccountState.asReadonly();
  readonly isAdmin = computed(() => this.session.user()?.role === 'Admin');

  /** The driver whose dialog is open (`null` for a new one); `undefined` while no dialog is open. */
  private readonly accountsFor = signal<{ driverId: string | null } | undefined>(undefined);
  private readonly accountsResource = httpResource<DriverAccount[]>(() => {
    const target = this.accountsFor();
    return target === undefined ? undefined : this.api.linkableAccounts(target.driverId);
  });
  /** The accounts the open dialog can link; `null` until they are read. */
  readonly linkableAccounts = computed<DriverAccount[] | null>(() =>
    this.accountsResource.hasValue() ? this.accountsResource.value() : null,
  );
  /** True when the open dialog's accounts could not be read. */
  readonly linkableAccountsFailed = computed(() => this.accountsResource.status() === 'error');

  private readonly list = httpResource<DriverListPage>(() => this.api.list(this.query()));

  readonly items = computed<DriverListItem[]>(() =>
    this.list.hasValue() ? this.list.value().data : [],
  );
  readonly total = computed(() => (this.list.hasValue() ? this.list.value().totalCount : 0));
  readonly loaded = computed(() => this.list.hasValue());
  /** The list is read for the first time or for a new query: nothing current to show. */
  readonly loading = computed(
    () =>
      this.list.status() === 'loading' ||
      (this.list.status() === 'reloading' && !this.list.hasValue()),
  );
  /** The same list is read again (after a write): the rows on screen stay until the answer. */
  readonly reloading = computed(() => this.list.status() === 'reloading' && this.list.hasValue());
  readonly failed = computed(() => this.list.status() === 'error');

  setSearch(search: string): void {
    const trimmed = search.trim();
    if (trimmed === this.searchState()) {
      return;
    }
    this.reactivateNoticeState.set(null);
    this.searchState.set(trimmed);
    this.pageState.set(1);
  }

  setStatus(status: DriverStatus | null): void {
    this.reactivateNoticeState.set(null);
    this.statusState.set(status);
    this.pageState.set(1);
  }

  setSort(column: SortColumn, direction: SortDirection): void {
    this.reactivateNoticeState.set(null);
    this.sortColumnState.set(column);
    this.sortDirectionState.set(direction);
    this.pageState.set(1);
  }

  setPage(page: number): void {
    this.reactivateNoticeState.set(null);
    this.pageState.set(page);
  }

  clearReactivateNotice(): void {
    this.reactivateNoticeState.set(null);
  }

  reload(): void {
    this.list.reload();
  }

  /**
   * A write refused with 409 means the list is stale: it is read again, keeping its state; the
   * accounts of an open dialog are read again too, as the refusal may concern the one chosen.
   */
  private refused(error: unknown): ApiError {
    const apiError = toApiError(error);
    if (isStale(apiError)) {
      this.reload();
      if (this.accountsFor() !== undefined) {
        this.accountsResource.reload();
      }
    }
    return apiError;
  }

  /** Starts reading the accounts the dialog of `driverId` can link (`null`: a new driver). */
  readAccounts(driverId: string | null): void {
    this.accountsFor.set({ driverId });
  }

  stopReadingAccounts(): void {
    this.accountsFor.set(undefined);
  }

  /** Creates a user with the role Driver and reads the linkable accounts again; no toast. */
  async createAccount(username: string, password: string): Promise<CreateAccountOutcome> {
    if (this.creatingAccountState()) {
      return 'ignored';
    }
    this.creatingAccountState.set(true);
    try {
      let userId: string;
      try {
        userId = (
          await firstValueFrom(this.usersApi.create({ username, password, role: 'Driver' }))
        ).id;
      } catch (error) {
        return toApiError(error);
      }
      this.accountsResource.reload();
      return { userId };
    } finally {
      this.creatingAccountState.set(false);
    }
  }

  /** Creates the driver, or updates `driver` when given, sending the version it was read at. */
  async save(driver: DriverListItem | null, values: CreateDriverRequest): Promise<SaveOutcome> {
    if (this.savingState()) {
      return 'ignored';
    }
    this.savingState.set(true);
    try {
      let name: string;
      try {
        if (driver === null) {
          name = fullName(await firstValueFrom(this.api.create(values)));
        } else {
          await firstValueFrom(this.api.update(driver.id, { ...values, version: driver.version }));
          name = fullName(values);
        }
      } catch (error) {
        return this.refused(error);
      }
      this.toast.success(
        this.translate.instant(
          driver === null ? 'drivers.form.create.done' : 'drivers.form.edit.done',
          { name },
        ),
      );
      this.reload();
      return 'saved';
    } finally {
      this.savingState.set(false);
    }
  }

  async deactivate(driver: DriverListItem): Promise<DeactivateOutcome> {
    if (this.deactivatingState()) {
      return 'ignored';
    }
    this.deactivatingState.set(true);
    this.reactivateNoticeState.set(null);
    try {
      try {
        await firstValueFrom(this.api.deactivate(driver.id, driver.version));
      } catch (error) {
        return this.refused(error);
      }
      this.toast.success(
        this.translate.instant('drivers.deactivate.done', { name: fullName(driver) }),
      );
      this.reload();
      return 'deactivated';
    } finally {
      this.deactivatingState.set(false);
    }
  }

  async reactivate(driver: DriverListItem): Promise<void> {
    if (this.reactivatingIdState() !== null) {
      return;
    }
    this.reactivatingIdState.set(driver.id);
    this.reactivateNoticeState.set(null);
    try {
      try {
        await firstValueFrom(this.api.reactivate(driver.id, driver.version));
      } catch (error) {
        this.reactivateNoticeState.set(noticeOf(this.refused(error)));
        return;
      }
      this.toast.success(
        this.translate.instant('drivers.reactivate.done', { name: fullName(driver) }),
      );
      this.reload();
    } finally {
      this.reactivatingIdState.set(null);
    }
  }
}
