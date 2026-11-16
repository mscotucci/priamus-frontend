import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '../api/generated/api-types';

type Schemas = components['schemas'];

export type LoginRequest = Schemas['LoginRequest'];
export type Tokens = Schemas['LoginResponse'];
export type CurrentUser = Schemas['GetCurrentUserResponse'];

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  login(request: LoginRequest): Observable<Tokens> {
    return this.http.post<Tokens>('/api/identity/auth/login', request);
  }

  refresh(refreshToken: string): Observable<Schemas['RefreshResponse']> {
    const body: Schemas['RefreshRequest'] = { refreshToken };
    return this.http.post<Schemas['RefreshResponse']>('/api/identity/auth/refresh', body);
  }

  revoke(refreshToken: string): Observable<void> {
    const body: Schemas['RevokeRequest'] = { refreshToken };
    return this.http.post<void>('/api/identity/auth/revoke', body);
  }

  me(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>('/api/identity/me');
  }
}
