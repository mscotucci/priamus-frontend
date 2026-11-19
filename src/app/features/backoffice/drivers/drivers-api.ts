import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '../../../core/api/generated/api-types';

type Schemas = components['schemas'];

export type DriverStatus = Schemas['DriverStatus'];
export type DriverListItem = Schemas['DriverListItemDto'];
export type DriverAccount = Schemas['DriverAccountDto'];
export type CreateDriverRequest = Schemas['CreateDriverRequest'];
export type UpdateDriverRequest = Schemas['UpdateDriverRequest'];
export type DriverListPage = Schemas['PagedResponseOfDriverListItemDto'];
export type SortColumn = 'name' | 'lastModifiedAt';
export type SortDirection = NonNullable<Schemas['SortDirection']>;

export const PAGE_SIZE = 20;

export interface DriversQuery {
  search: string;
  status: DriverStatus | null;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  page: number;
}

const URL = '/api/registry/drivers';

@Injectable({ providedIn: 'root' })
export class DriversApi {
  private readonly http = inject(HttpClient);

  list(query: DriversQuery): HttpResourceRequest {
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

  /** The accounts that can be linked; `driverId` also offers the account that driver holds now. */
  linkableAccounts(driverId: string | null): HttpResourceRequest {
    return {
      url: `${URL}/linkable-accounts`,
      params: driverId === null ? undefined : { driverId },
    };
  }

  create(request: CreateDriverRequest): Observable<DriverListItem> {
    return this.http.post<DriverListItem>(URL, request);
  }

  update(id: string, request: UpdateDriverRequest): Observable<void> {
    return this.http.put<void>(`${URL}/${id}`, request);
  }

  deactivate(id: string, version: number): Observable<void> {
    return this.http.post<void>(`${URL}/${id}/deactivate`, { version });
  }

  reactivate(id: string, version: number): Observable<void> {
    return this.http.post<void>(`${URL}/${id}/reactivate`, { version });
  }
}
