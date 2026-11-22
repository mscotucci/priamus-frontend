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
  RateableLocation,
  SortColumn,
  SortDirection,
} from './locations-api';

/** The location a save created or updated. */
export interface SavedLocation {
  id: string;
  name: string;
  municipality: string;
}
export type SaveOutcome = SavedLocation | 'ignored' | ApiError;
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

  private readonly listNeeded = signal(false);
  private readonly list = httpResource<LocationListPage>(() =>
    this.listNeeded() ? this.api.list(this.query()) : undefined,
  );

  private readonly rateableNeeded = signal(false);
  private readonly rateableResource = httpResource<RateableLocation[]>(() =>
    this.rateableNeeded() ? this.api.rateable() : undefined,
  );
  /** The active locations that can receive a rate; `null` until they are read. */
  readonly rateable = computed<RateableLocation[] | null>(() =>
    this.rateableResource.hasValue() ? this.rateableResource.value() : null,
  );
  readonly rateableFailed = computed(() => this.rateableResource.status() === 'error');

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

  /** The list page asks for the list; until then it is not read. */
  loadList(): void {
    this.listNeeded.set(true);
  }

  /** Reads the rateable locations; called again after a failure it reads them again. */
  loadRateable(): void {
    if (this.rateableNeeded()) {
      this.rateableResource.reload();
    } else {
      this.rateableNeeded.set(true);
    }
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
      let saved: SavedLocation;
      try {
        if (location === null) {
          const created = await firstValueFrom(this.api.create(values));
          saved = { id: created.id, name: created.name, municipality: created.municipality };
        } else {
          await firstValueFrom(
            this.api.update(location.id, { ...values, version: location.version }),
          );
          saved = { id: location.id, name: values.name, municipality: values.municipality };
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
      if (location === null && this.rateableNeeded()) {
        this.rateableResource.reload();
      }
      return saved;
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
