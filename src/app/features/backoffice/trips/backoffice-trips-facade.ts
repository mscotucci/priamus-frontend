import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Period } from '../../../shared/components/period-menu/period-menu';
import type { SearchFilterOption } from '../../../shared/components/search-filter-menu/search-filter-menu';
import { monthDays } from '../../../shared/dates/day';
import {
  BackofficeTripsApi,
  CustomerOptionsPage,
  DriverOptionsPage,
  LocationOptionsPage,
  SortColumn,
  SortDirection,
  TripDetail,
  TripFigures,
  TripListItem,
  TripListResponse,
  TripMode,
  TripsQuery,
  TripView,
  VehicleOptionsPage,
} from './backoffice-trips-api';
import { customerOption, driverOption, locationOption, vehicleOption } from './trip-filters';

const NOT_FOUND = 404;

/** The registry is read for a filter menu only once something is searched: never the whole list. */
const optionsSearch = (search: string): string | null => search.trim() || null;

/** The current month on the device clock, first to last day. */
export const currentMonth = (now: Date = new Date()): Period => monthDays(now);

@Injectable()
export class BackofficeTripsFacade {
  private readonly api = inject(BackofficeTripsApi);
  private readonly http = inject(HttpClient);

  private readonly viewState = signal<TripView>('Ended');
  private readonly periodState = signal<Period>(currentMonth());
  private readonly customerState = signal<SearchFilterOption | null>(null);
  private readonly driverState = signal<SearchFilterOption | null>(null);
  private readonly vehicleState = signal<SearchFilterOption | null>(null);
  private readonly locationState = signal<SearchFilterOption | null>(null);
  private readonly modeState = signal<TripMode | null>(null);
  private readonly searchState = signal('');
  private readonly sortColumnState = signal<SortColumn>('day');
  private readonly sortDirectionState = signal<SortDirection>('Descending');
  private readonly pageState = signal(1);

  readonly view = this.viewState.asReadonly();
  readonly period = this.periodState.asReadonly();
  readonly customer = this.customerState.asReadonly();
  readonly driver = this.driverState.asReadonly();
  readonly vehicle = this.vehicleState.asReadonly();
  readonly location = this.locationState.asReadonly();
  readonly mode = this.modeState.asReadonly();
  readonly search = this.searchState.asReadonly();
  readonly sortColumn = this.sortColumnState.asReadonly();
  readonly sortDirection = this.sortDirectionState.asReadonly();
  readonly page = this.pageState.asReadonly();

  private readonly query = computed<TripsQuery>(() => ({
    view: this.viewState(),
    from: this.periodState().from,
    to: this.periodState().to,
    customerId: this.customerState()?.id ?? null,
    driverId: this.driverState()?.id ?? null,
    vehicleId: this.vehicleState()?.id ?? null,
    locationId: this.locationState()?.id ?? null,
    mode: this.modeState(),
    search: this.searchState(),
    sortColumn: this.sortColumnState(),
    sortDirection: this.sortDirectionState(),
    page: this.pageState(),
  }));

  private readonly listNeeded = signal(false);
  private readonly listResource = httpResource<TripListResponse>(() =>
    this.listNeeded() ? this.api.list(this.query()) : undefined,
  );

  /**
   * The last list read for the current view: a new filter, search, sort or page keeps the rows on screen
   * until its answer arrives; another view starts empty, its columns being different.
   */
  private readonly shown = linkedSignal<
    { view: TripView; list: TripListResponse | undefined },
    TripListResponse | undefined
  >({
    source: () => ({
      view: this.viewState(),
      list: this.listResource.hasValue() ? this.listResource.value() : undefined,
    }),
    computation: (source, previous) =>
      source.list ??
      (previous !== undefined && previous.source.view === source.view ? previous.value : undefined),
  });

  readonly trips = computed<TripListItem[]>(() => this.shown()?.trips.data ?? []);
  readonly total = computed(() => this.shown()?.trips.totalCount ?? 0);
  /** The figures of the whole ended selection; `null` for the other views. */
  readonly figures = computed<TripFigures | null>(() => this.shown()?.figures ?? null);
  readonly loaded = computed(() => this.shown() !== undefined);
  /** The list is read with nothing to show meanwhile: the first read, or another view. */
  readonly loading = computed(() => this.shown() === undefined && this.listResource.isLoading());
  /** The rows on screen stay while the list is read again. */
  readonly reloading = computed(() => this.shown() !== undefined && this.listResource.isLoading());
  readonly failed = computed(() => this.listResource.status() === 'error');

  private readonly tripId = signal<string | null>(null);
  private readonly tripResource = httpResource<TripDetail>(() => {
    const id = this.tripId();
    return id === null ? undefined : this.api.trip(id);
  });
  readonly openTripId = this.tripId.asReadonly();
  readonly trip = computed<TripDetail | null>(() =>
    this.tripResource.hasValue() ? this.tripResource.value() : null,
  );
  readonly tripLoading = computed(() => this.tripResource.isLoading());
  /** The trip is gone (deleted or expired since the list was read). */
  readonly tripMissing = computed(() => {
    const error = this.tripResource.error();
    return error instanceof HttpErrorResponse && error.status === NOT_FOUND;
  });
  readonly tripFailed = computed(
    () => this.tripResource.status() === 'error' && !this.tripMissing(),
  );

  private readonly customerSearch = signal<string | null>(null);
  private readonly driverSearch = signal<string | null>(null);
  private readonly vehicleSearch = signal<string | null>(null);
  private readonly locationSearch = signal<string | null>(null);

  private readonly customerResource = httpResource<CustomerOptionsPage>(() => {
    const search = this.customerSearch();
    return search === null ? undefined : this.api.customers(search);
  });
  private readonly driverResource = httpResource<DriverOptionsPage>(() => {
    const search = this.driverSearch();
    return search === null ? undefined : this.api.drivers(search);
  });
  private readonly vehicleResource = httpResource<VehicleOptionsPage>(() => {
    const search = this.vehicleSearch();
    return search === null ? undefined : this.api.vehicles(search);
  });
  private readonly locationResource = httpResource<LocationOptionsPage>(() => {
    const search = this.locationSearch();
    return search === null ? undefined : this.api.locations(search);
  });

  readonly customerOptions = computed<SearchFilterOption[]>(() =>
    this.customerResource.hasValue() ? this.customerResource.value().data.map(customerOption) : [],
  );
  readonly driverOptions = computed<SearchFilterOption[]>(() =>
    this.driverResource.hasValue() ? this.driverResource.value().data.map(driverOption) : [],
  );
  readonly vehicleOptions = computed<SearchFilterOption[]>(() =>
    this.vehicleResource.hasValue() ? this.vehicleResource.value().data.map(vehicleOption) : [],
  );
  readonly locationOptions = computed<SearchFilterOption[]>(() =>
    this.locationResource.hasValue() ? this.locationResource.value().data.map(locationOption) : [],
  );
  /** The search found more records than the menu lists: typing more narrows it. */
  readonly customerOptionsMore = computed(
    () => this.customerResource.hasValue() && this.customerResource.value().hasNextPage === true,
  );
  readonly driverOptionsMore = computed(
    () => this.driverResource.hasValue() && this.driverResource.value().hasNextPage === true,
  );
  readonly vehicleOptionsMore = computed(
    () => this.vehicleResource.hasValue() && this.vehicleResource.value().hasNextPage === true,
  );
  readonly locationOptionsMore = computed(
    () => this.locationResource.hasValue() && this.locationResource.value().hasNextPage === true,
  );
  readonly customerOptionsLoading = computed(() => this.customerResource.isLoading());
  readonly driverOptionsLoading = computed(() => this.driverResource.isLoading());
  readonly vehicleOptionsLoading = computed(() => this.vehicleResource.isLoading());
  readonly locationOptionsLoading = computed(() => this.locationResource.isLoading());
  readonly customerOptionsFailed = computed(() => this.customerResource.status() === 'error');
  readonly driverOptionsFailed = computed(() => this.driverResource.status() === 'error');
  readonly vehicleOptionsFailed = computed(() => this.vehicleResource.status() === 'error');
  readonly locationOptionsFailed = computed(() => this.locationResource.status() === 'error');

  /** The list page asks for the list; until then it is not read. */
  loadList(): void {
    this.listNeeded.set(true);
  }

  reload(): void {
    this.listResource.reload();
  }

  reloadTrip(): void {
    this.tripResource.reload();
  }

  setView(view: TripView): void {
    this.viewState.set(view);
    this.pageState.set(1);
  }

  setPeriod(period: Period): void {
    this.periodState.set(period);
    this.pageState.set(1);
  }

  setCustomer(customer: SearchFilterOption | null): void {
    this.customerState.set(customer);
    this.pageState.set(1);
  }

  setDriver(driver: SearchFilterOption | null): void {
    this.driverState.set(driver);
    this.pageState.set(1);
  }

  setVehicle(vehicle: SearchFilterOption | null): void {
    this.vehicleState.set(vehicle);
    this.pageState.set(1);
  }

  setLocation(location: SearchFilterOption | null): void {
    this.locationState.set(location);
    this.pageState.set(1);
  }

  setMode(mode: TripMode | null): void {
    this.modeState.set(mode);
    this.pageState.set(1);
  }

  setSearch(search: string): void {
    const trimmed = search.trim();
    if (trimmed === this.searchState()) {
      return;
    }
    this.searchState.set(trimmed);
    this.pageState.set(1);
  }

  setSort(column: SortColumn, direction: SortDirection): void {
    this.sortColumnState.set(column);
    this.sortDirectionState.set(direction);
    this.pageState.set(1);
  }

  setPage(page: number): void {
    this.pageState.set(page);
  }

  searchCustomers(search: string): void {
    this.customerSearch.set(optionsSearch(search));
  }

  searchDrivers(search: string): void {
    this.driverSearch.set(optionsSearch(search));
  }

  searchVehicles(search: string): void {
    this.vehicleSearch.set(optionsSearch(search));
  }

  searchLocations(search: string): void {
    this.locationSearch.set(optionsSearch(search));
  }

  openTrip(id: string): void {
    this.tripId.set(id);
  }

  closeTrip(): void {
    this.tripId.set(null);
  }

  /** The file of an attachment of a trip, fetched with the user's session. Rejects when the read fails. */
  attachmentFile(tripId: string, attachmentId: string): Promise<Blob> {
    return firstValueFrom(
      this.http.get(this.api.attachmentFile(tripId, attachmentId), { responseType: 'blob' }),
    );
  }
}
