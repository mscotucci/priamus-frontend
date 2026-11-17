import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ApiError, NoticeContent, noticeOf, toApiError } from '../../../core/api/api-error';
import { Toast } from '../../../core/toast/toast';
import {
  SortColumn,
  SortDirection,
  VehicleListItem,
  VehiclePage,
  VehicleStatus,
  VehicleType,
  VehiclesApi,
  VehiclesQuery,
} from './vehicles-api';
import { normalizePlate } from './vehicle-plate';

export interface VehicleValues {
  licensePlate: string;
  description: string;
  type: VehicleType;
  requiresTrailer: boolean;
}

export type SaveOutcome = 'saved' | 'ignored' | ApiError;
export type DecommissionOutcome = 'decommissioned' | 'ignored' | ApiError;

@Injectable()
export class VehiclesFacade {
  private readonly api = inject(VehiclesApi);
  private readonly toast = inject(Toast);
  private readonly translate = inject(TranslateService);

  private readonly searchState = signal('');
  private readonly typeState = signal<VehicleType | null>(null);
  private readonly statusState = signal<VehicleStatus | null>(null);
  private readonly sortColumnState = signal<SortColumn>('licensePlate');
  private readonly sortDirectionState = signal<SortDirection>('Ascending');
  private readonly pageState = signal(1);

  readonly search = this.searchState.asReadonly();
  readonly type = this.typeState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly sortColumn = this.sortColumnState.asReadonly();
  readonly sortDirection = this.sortDirectionState.asReadonly();
  readonly page = this.pageState.asReadonly();

  private readonly query = computed<VehiclesQuery>(() => ({
    search: this.searchState(),
    type: this.typeState(),
    status: this.statusState(),
    sortColumn: this.sortColumnState(),
    sortDirection: this.sortDirectionState(),
    page: this.pageState(),
  }));

  private readonly savingState = signal(false);
  readonly saving = this.savingState.asReadonly();
  private readonly decommissioningState = signal(false);
  readonly decommissioning = this.decommissioningState.asReadonly();
  private readonly reactivatingIdState = signal<string | null>(null);
  readonly reactivatingId = this.reactivatingIdState.asReadonly();
  private readonly reactivateNoticeState = signal<NoticeContent | null>(null);
  readonly reactivateNotice = this.reactivateNoticeState.asReadonly();

  private readonly list = httpResource<VehiclePage>(() => this.api.list(this.query()));

  readonly items = computed<VehicleListItem[]>(() =>
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
    this.reactivateNoticeState.set(null);
    this.searchState.set(trimmed);
    this.pageState.set(1);
  }

  setType(type: VehicleType | null): void {
    this.reactivateNoticeState.set(null);
    this.typeState.set(type);
    this.pageState.set(1);
  }

  setStatus(status: VehicleStatus | null): void {
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
    if (apiError.kind === 'domain' && apiError.status === 409) {
      this.reload();
    }
    return apiError;
  }

  /** Creates the vehicle, or updates `vehicle` when given, sending the version it was read at. */
  async save(vehicle: VehicleListItem | null, values: VehicleValues): Promise<SaveOutcome> {
    if (this.savingState()) {
      return 'ignored';
    }
    this.savingState.set(true);
    try {
      let plate: string;
      try {
        if (vehicle === null) {
          plate = (await firstValueFrom(this.api.create(values))).licensePlate;
        } else {
          await firstValueFrom(
            this.api.update(vehicle.id, { ...values, version: vehicle.version }),
          );
          plate = normalizePlate(values.licensePlate);
        }
      } catch (error) {
        return this.refused(error);
      }
      this.toast.success(
        this.translate.instant(
          vehicle === null ? 'vehicles.form.create.done' : 'vehicles.form.edit.done',
          { plate },
        ),
      );
      this.reload();
      return 'saved';
    } finally {
      this.savingState.set(false);
    }
  }

  async decommission(vehicle: VehicleListItem): Promise<DecommissionOutcome> {
    if (this.decommissioningState()) {
      return 'ignored';
    }
    this.decommissioningState.set(true);
    this.reactivateNoticeState.set(null);
    try {
      try {
        await firstValueFrom(this.api.decommission(vehicle.id, vehicle.version));
      } catch (error) {
        return this.refused(error);
      }
      this.toast.success(
        this.translate.instant('vehicles.decommission.done', { plate: vehicle.licensePlate }),
      );
      this.reload();
      return 'decommissioned';
    } finally {
      this.decommissioningState.set(false);
    }
  }

  async reactivate(vehicle: VehicleListItem): Promise<void> {
    if (this.reactivatingIdState() !== null) {
      return;
    }
    this.reactivatingIdState.set(vehicle.id);
    this.reactivateNoticeState.set(null);
    try {
      try {
        await firstValueFrom(this.api.reactivate(vehicle.id, vehicle.version));
      } catch (error) {
        this.reactivateNoticeState.set(noticeOf(this.refused(error)));
        return;
      }
      this.toast.success(
        this.translate.instant('vehicles.reactivate.done', { plate: vehicle.licensePlate }),
      );
      this.reload();
    } finally {
      this.reactivatingIdState.set(null);
    }
  }
}
