import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '../../../core/api/generated/api-types';

type Schemas = components['schemas'];

export type UserRole = Schemas['UserRole'];
export type UserStatus = Schemas['UserStatus'];
export type UserListItem = Schemas['UserListItemDto'];
export type CreateUserRequest = Schemas['CreateUserRequest'];
export type CreatedUser = Schemas['CreateUserResponse'];
export type UserPage = Schemas['PagedResponseOfUserListItemDto'];
export type SortColumn = 'username' | 'role' | 'status' | 'createdAt' | 'lastModifiedAt';
export type SortDirection = NonNullable<Schemas['SortDirection']>;

export const PAGE_SIZE = 20;

export interface UsersQuery {
  search: string;
  role: UserRole | null;
  status: UserStatus | null;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  page: number;
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);

  list(query: UsersQuery): HttpResourceRequest {
    const params: Record<string, string | number> = {
      page: query.page,
      pageSize: PAGE_SIZE,
      sortColumn: query.sortColumn,
      sortDirection: query.sortDirection,
    };
    if (query.role !== null) {
      params['role'] = query.role;
    }
    if (query.status !== null) {
      params['status'] = query.status;
    }
    if (query.search !== '') {
      params['usernameContains'] = query.search;
    }
    return { url: '/api/identity/users', params };
  }

  create(request: CreateUserRequest): Observable<CreatedUser> {
    return this.http.post<CreatedUser>('/api/identity/users', request);
  }

  disable(id: string): Observable<void> {
    return this.http.post<void>(`/api/identity/users/${id}/disable`, null);
  }

  enable(id: string): Observable<void> {
    return this.http.post<void>(`/api/identity/users/${id}/enable`, null);
  }
}
