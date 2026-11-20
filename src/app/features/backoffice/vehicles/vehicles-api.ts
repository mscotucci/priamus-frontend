import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '../../../core/api/generated/api-types';

type Schemas = components['schemas'];

export type VehicleType = Schemas['VehicleType'];
export type VehicleStatus = Schemas['VehicleStatus'];
export type VehicleListItem = Schemas['VehicleListItemDto'];
export type CreateVehicleRequest = Schemas['CreateVehicleRequest'];
export type CreatedVehicle = Schemas['CreateVehicleResponse'];
export type UpdateVehicleRequest = Schemas['UpdateVehicleRequest'];
export type RateableVehicle = Schemas['RateableVehicleDto'];
export type VehiclePage = Schemas['PagedResponseOfVehicleListItemDto'];
export type SortColumn = 'licensePlate' | 'description' | 'lastModifiedAt';
export type SortDirection = NonNullable<Schemas['SortDirection']>;

export const PAGE_SIZE = 20;

export interface VehiclesQuery {
  search: string;
  type: VehicleType | null;
  status: VehicleStatus | null;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  page: number;
}

const URL = '/api/registry/vehicles';

@Injectable({ providedIn: 'root' })
export class VehiclesApi {
  private readonly http = inject(HttpClient);

  list(query: VehiclesQuery): HttpResourceRequest {
    const params: Record<string, string | number> = {
      page: query.page,
      pageSize: PAGE_SIZE,
      sortColumn: query.sortColumn,
      sortDirection: query.sortDirection,
    };
    if (query.type !== null) {
      params['type'] = query.type;
    }
    if (query.status !== null) {
      params['status'] = query.status;
    }
    if (query.search !== '') {
      params['search'] = query.search;
    }
    return { url: URL, params };
  }

  rateable(): HttpResourceRequest {
    return { url: `${URL}/rateable` };
  }

  create(request: CreateVehicleRequest): Observable<CreatedVehicle> {
    return this.http.post<CreatedVehicle>(URL, request);
  }

  update(id: string, request: UpdateVehicleRequest): Observable<void> {
    return this.http.put<void>(`${URL}/${id}`, request);
  }

  decommission(id: string, version: number): Observable<void> {
    return this.http.post<void>(`${URL}/${id}/decommission`, { version });
  }

  reactivate(id: string, version: number): Observable<void> {
    return this.http.post<void>(`${URL}/${id}/reactivate`, { version });
  }
}
