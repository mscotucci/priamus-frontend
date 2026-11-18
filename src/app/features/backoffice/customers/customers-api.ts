import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '../../../core/api/generated/api-types';

type Schemas = components['schemas'];

export type CustomerStatus = Schemas['CustomerStatus'];
export type CustomerListItem = Schemas['CustomerListItemDto'];
export type CreateCustomerRequest = Schemas['CreateCustomerRequest'];
export type CreatedCustomer = Schemas['CreateCustomerResponse'];
export type UpdateCustomerRequest = Schemas['UpdateCustomerRequest'];
export type CustomerPage = Schemas['PagedResponseOfCustomerListItemDto'];
export type SortColumn = 'companyName' | 'lastModifiedAt';
export type SortDirection = NonNullable<Schemas['SortDirection']>;

export const PAGE_SIZE = 20;

export interface CustomersQuery {
  search: string;
  status: CustomerStatus | null;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  page: number;
}

const URL = '/api/registry/customers';

@Injectable({ providedIn: 'root' })
export class CustomersApi {
  private readonly http = inject(HttpClient);

  list(query: CustomersQuery): HttpResourceRequest {
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

  create(request: CreateCustomerRequest): Observable<CreatedCustomer> {
    return this.http.post<CreatedCustomer>(URL, request);
  }

  update(id: string, request: UpdateCustomerRequest): Observable<void> {
    return this.http.put<void>(`${URL}/${id}`, request);
  }

  deactivate(id: string, version: number): Observable<void> {
    return this.http.post<void>(`${URL}/${id}/deactivate`, { version });
  }

  reactivate(id: string, version: number): Observable<void> {
    return this.http.post<void>(`${URL}/${id}/reactivate`, { version });
  }
}
