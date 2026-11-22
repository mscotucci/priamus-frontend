import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '../../../core/api/generated/api-types';

type Schemas = components['schemas'];

export type LocationStatus = Schemas['LocationStatus'];
export type LocationListItem = Schemas['LocationListItemDto'];
export type CreateLocationRequest = Schemas['CreateLocationRequest'];
export type CreatedLocation = Schemas['CreateLocationResponse'];
export type UpdateLocationRequest = Schemas['UpdateLocationRequest'];
export type LocationListPage = Schemas['PagedResponseOfLocationListItemDto'];
export type SortColumn = 'name' | 'municipality' | 'lastModifiedAt';
export type SortDirection = NonNullable<Schemas['SortDirection']>;

export const PAGE_SIZE = 20;

export interface LocationsQuery {
  search: string;
  status: LocationStatus | null;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  page: number;
}

const URL = '/api/registry/locations';

@Injectable({ providedIn: 'root' })
export class LocationsApi {
  private readonly http = inject(HttpClient);

  list(query: LocationsQuery): HttpResourceRequest {
    const params: Record<string, string | number> = {
      page: query.page,
      pageSize: PAGE_SIZE,
      sortColumn: query.sortColumn,
      sortDirection: query.sortDirection,
    };
    if (query.status !== null) {
      params['status'] = query.status;
    }
    if (query.search !== '') {
      params['search'] = query.search;
    }
    return { url: URL, params };
  }

  create(request: CreateLocationRequest): Observable<CreatedLocation> {
    return this.http.post<CreatedLocation>(URL, request);
  }

  update(id: string, request: UpdateLocationRequest): Observable<void> {
    return this.http.put<void>(`${URL}/${id}`, request);
  }

  deactivate(id: string, version: number): Observable<void> {
    return this.http.post<void>(`${URL}/${id}/deactivate`, { version });
  }

  reactivate(id: string, version: number): Observable<void> {
    return this.http.post<void>(`${URL}/${id}/reactivate`, { version });
  }
}
