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
import { Toast } from '../../../core/toast/toast';
import { locationLabel } from './location-label';
import {
  CreateLocationRequest,
  LocationListItem,
  LocationListPage,
  LocationStatus,
  LocationsApi,
  LocationsQuery,
  SortColumn,
  SortDirection,
} from './locations-api';

export type SaveOutcome = 'saved' | 'ignored' | ApiError;
export type DeactivateOutcome = 'deactivated' | 'ignored' | ApiError;

@Injectable()
export class LocationsFacade {
  private readonly api = inject(LocationsApi);
  private readonly toast = inject(Toast);
  private readonly translate = inject(TranslateService);

  private readonly searchState = signal('');
  private readonly statusState = signal<LocationStatus | null>(null);
  private readonly sortColumnState = signal<SortColumn>('name');
  private readonly sortDirectionState = signal<SortDirection>('Ascending');
  private readonly pageState = signal(1);

  readonly search = this.searchState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly sortColumn = this.sortColumnState.asReadonly();
  readonly sortDirection = this.sortDirectionState.asReadonly();
  readonly page = this.pageState.asReadonly();

  private readonly query = computed<LocationsQuery>(() => ({
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

  private readonly list = httpResource<LocationListPage>(() => this.api.list(this.query()));

  readonly items = computed<LocationListItem[]>(() =>
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

  setStatus(status: LocationStatus | null): void {
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

  /** A write refused with 409 means the list is stale: it is read again, keeping its state. */
  private refused(error: unknown): ApiError {
    const apiError = toApiError(error);
    if (isStale(apiError)) {
      this.reload();
    }
    return apiError;
  }

  /** Creates the location, or updates `location` when given, sending the version it was read at. */
  async save(
    location: LocationListItem | null,
    values: CreateLocationRequest,
  ): Promise<SaveOutcome> {
    if (this.savingState()) {
      return 'ignored';
    }
    this.savingState.set(true);
    try {
      let saved: { name: string; municipality: string };
      try {
        if (location === null) {
          saved = await firstValueFrom(this.api.create(values));
        } else {
          await firstValueFrom(
            this.api.update(location.id, { ...values, version: location.version }),
          );
          saved = values;
        }
      } catch (error) {
        return this.refused(error);
      }
      this.toast.success(
        this.translate.instant(
          location === null ? 'locations.form.create.done' : 'locations.form.edit.done',
          { label: locationLabel(saved) },
        ),
      );
      this.reload();
      return 'saved';
    } finally {
      this.savingState.set(false);
    }
  }

  async deactivate(location: LocationListItem): Promise<DeactivateOutcome> {
    if (this.deactivatingState()) {
      return 'ignored';
    }
    this.deactivatingState.set(true);
    this.reactivateNoticeState.set(null);
    try {
      try {
        await firstValueFrom(this.api.deactivate(location.id, location.version));
      } catch (error) {
        return this.refused(error);
      }
      this.toast.success(
        this.translate.instant('locations.deactivate.done', { label: locationLabel(location) }),
      );
      this.reload();
      return 'deactivated';
    } finally {
      this.deactivatingState.set(false);
    }
  }

  async reactivate(location: LocationListItem): Promise<void> {
    if (this.reactivatingIdState() !== null) {
      return;
    }
    this.reactivatingIdState.set(location.id);
    this.reactivateNoticeState.set(null);
    try {
      try {
        await firstValueFrom(this.api.reactivate(location.id, location.version));
      } catch (error) {
        this.reactivateNoticeState.set(noticeOf(this.refused(error)));
        return;
      }
      this.toast.success(
        this.translate.instant('locations.reactivate.done', { label: locationLabel(location) }),
      );
      this.reload();
    } finally {
      this.reactivatingIdState.set(null);
    }
  }
}
