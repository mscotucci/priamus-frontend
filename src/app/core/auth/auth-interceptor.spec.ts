import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth-interceptor';
import { Session } from './session';

@Component({ selector: 'app-stub', template: '' })
class Stub {}

const STORAGE_KEY = 'priamus.refresh-token';
const REFRESH_URL = '/api/identity/auth/refresh';

function tokens(n: number) {
  return {
    accessToken: `access-${n}`,
    refreshToken: `refresh-${n}`,
    accessTokenExpiresAt: '2026-11-15T10:00:00Z',
    refreshTokenExpiresAt: '2026-12-15T10:00:00Z',
  };
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve));
const unauthorized = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let session: Session;
  let httpClient: HttpClient;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: Stub },
          { path: 'users', component: Stub },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    session = TestBed.inject(Session);
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    const signIn = session.signIn('admin', 'secret');
    http.expectOne('/api/identity/auth/login').flush(tokens(1));
    await tick();
    http
      .expectOne('/api/identity/me')
      .flush({ id: '1', username: 'admin', role: 'Admin', driverId: null });
    await signIn;
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('attaches the access token to requests to the API', () => {
    httpClient.get('/api/identity/users').subscribe();

    const request = http.expectOne('/api/identity/users');
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-1');
    request.flush([]);
  });

  it('a 401 renews the session once and repeats the request with the new token', async () => {
    const result = firstValueFrom(httpClient.get('/api/identity/users'));

    http.expectOne('/api/identity/users').flush(null, unauthorized);
    await tick();
    http.expectOne(REFRESH_URL).flush(tokens(2));
    await tick();
    const repeated = http.expectOne('/api/identity/users');
    expect(repeated.request.headers.get('Authorization')).toBe('Bearer access-2');
    repeated.flush({ ok: true });

    await expect(result).resolves.toEqual({ ok: true });
  });

  it('two concurrent 401s share one renewal', async () => {
    const first = firstValueFrom(httpClient.get('/api/identity/users'));
    const second = firstValueFrom(httpClient.get('/api/identity/me'));

    http.expectOne('/api/identity/users').flush(null, unauthorized);
    http.expectOne('/api/identity/me').flush(null, unauthorized);
    await tick();
    http.expectOne(REFRESH_URL).flush(tokens(2));
    await tick();
    http.expectOne('/api/identity/users').flush({ n: 1 });
    http.expectOne('/api/identity/me').flush({ n: 2 });

    await expect(Promise.all([first, second])).resolves.toEqual([{ n: 1 }, { n: 2 }]);
  });

  it('a second 401 on the repeated request is passed on without a second renewal', async () => {
    const result = firstValueFrom(httpClient.get('/api/identity/users'));

    http.expectOne('/api/identity/users').flush(null, unauthorized);
    await tick();
    http.expectOne(REFRESH_URL).flush(tokens(2));
    await tick();
    http.expectOne('/api/identity/users').flush(null, unauthorized);

    await expect(result).rejects.toMatchObject({ status: 401 });
  });

  it('a 401 from the login endpoint does not start a renewal', async () => {
    const result = firstValueFrom(httpClient.post('/api/identity/auth/login', {}));

    http.expectOne('/api/identity/auth/login').flush(null, unauthorized);

    await expect(result).rejects.toMatchObject({ status: 401 });
  });

  it('when the refresh token is gone the request is not sent and the user goes to the login with no notice', async () => {
    await router.navigateByUrl('/users');
    localStorage.removeItem(STORAGE_KEY);

    const result = firstValueFrom(httpClient.get('/api/identity/users'));

    await expect(result).rejects.toBeInstanceOf(HttpErrorResponse);
    http.expectNone('/api/identity/users');
    await tick();
    expect(session.user()).toBeNull();
    expect(session.accessToken()).toBeNull();
    expect(session.notice()).toBeNull();
    expect(router.url).toBe('/login?returnUrl=%2Fusers');
  });

  it('a 401 whose renewal loses to another tab repeats the request with the other tab token', async () => {
    const result = firstValueFrom(httpClient.get('/api/identity/users'));

    http.expectOne('/api/identity/users').flush(null, unauthorized);
    await tick();
    const lost = http.expectOne(REFRESH_URL);
    localStorage.setItem(STORAGE_KEY, 'refresh-9');
    lost.flush({ errorCode: 'Identity.RefreshToken.NoLongerValid', detail: 'x' }, unauthorized);
    await tick();
    http.expectOne(REFRESH_URL).flush(tokens(10));
    await tick();
    const repeated = http.expectOne('/api/identity/users');
    expect(repeated.request.headers.get('Authorization')).toBe('Bearer access-10');
    repeated.flush({ ok: true });

    await expect(result).resolves.toEqual({ ok: true });
  });
});
