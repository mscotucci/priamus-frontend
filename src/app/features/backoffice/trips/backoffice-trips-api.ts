import { HttpResourceRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { components } from '../../../core/api/generated/api-types';

type Schemas = components['schemas'];

export type TripView = Schemas['TripState'];
export type TripMode = NonNullable<Schemas['TripMeasureKind']>;
export type TripListResponse = Schemas['BackOfficeTripListResponse'];
export type TripListItem = Schemas['BackOfficeTripListItemDto'];
export type TripFigures = Schemas['BackOfficeTripFigures'];
export type TripDetail = Schemas['GetBackOfficeTripResponse'];
export type CustomerOptionItem = Schemas['CustomerListItemDto'];
export type DriverOptionItem = Schemas['DriverListItemDto'];
export type VehicleOptionItem = Schemas['VehicleListItemDto'];
export type LocationOptionItem = Schemas['LocationListItemDto'];
export type CustomerOptionsPage = Schemas['PagedResponseOfCustomerListItemDto'];
export type DriverOptionsPage = Schemas['PagedResponseOfDriverListItemDto'];
export type VehicleOptionsPage = Schemas['PagedResponseOfVehicleListItemDto'];
export type LocationOptionsPage = Schemas['PagedResponseOfLocationListItemDto'];
export type SortColumn = 'day' | 'total';
export type SortDirection = NonNullable<Schemas['SortDirection']>;

export const PAGE_SIZE = 20;
/** A filter menu lists at most 10 records found by its search (Michele, 2026-11-27). */
export const OPTIONS_PAGE_SIZE = 10;

export interface TripsQuery {
  view: TripView;
  from: string;
  to: string;
  customerId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  locationId: string | null;
  mode: TripMode | null;
  search: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  page: number;
}

const URL = '/api/operations/backoffice/trips';

@Injectable({ providedIn: 'root' })
export class BackofficeTripsApi {
  /** Period, mode and order belong to the ended view only; the other views never send them. */
  list(query: TripsQuery): HttpResourceRequest {
    const params: Record<string, string | number> = {
      view: query.view,
      page: query.page,
      pageSize: PAGE_SIZE,
    };
    if (query.view === 'Ended') {
      params['from'] = query.from;
      params['to'] = query.to;
      params['sortColumn'] = query.sortColumn;
      params['sortDirection'] = query.sortDirection;
      if (query.mode !== null) {
        params['mode'] = query.mode;
      }
    }
    if (query.customerId !== null) {
      params['customerId'] = query.customerId;
    }
    if (query.driverId !== null) {
      params['driverId'] = query.driverId;
    }
    if (query.vehicleId !== null) {
      params['vehicleId'] = query.vehicleId;
    }
    if (query.locationId !== null) {
      params['locationId'] = query.locationId;
    }
    if (query.search !== '') {
      params['search'] = query.search;
    }
    return { url: URL, params };
  }

  trip(id: string): HttpResourceRequest {
    return { url: `${URL}/${id}` };
  }

  customers(search: string): HttpResourceRequest {
    return this.options('customers', search);
  }

  drivers(search: string): HttpResourceRequest {
    return this.options('drivers', search);
  }

  vehicles(search: string): HttpResourceRequest {
    return this.options('vehicles', search);
  }

  locations(search: string): HttpResourceRequest {
    return this.options('locations', search);
  }

  /** Any status: a deactivated registry record still names trips it was used on. */
  private options(kind: string, search: string): HttpResourceRequest {
    const params: Record<string, string | number> = { pageSize: OPTIONS_PAGE_SIZE };
    if (search !== '') {
      params['search'] = search;
    }
    return { url: `/api/registry/${kind}`, params };
  }
}
