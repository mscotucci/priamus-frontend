import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ApiError } from '../api/api-error';
import { authInterceptor } from './auth-interceptor';
import { Session } from './session';

@Component({ selector: 'app-stub', template: '' })
class Stub {}

const REFRESH_URL = '/api/identity/auth/refresh';
const ME_URL = '/api/identity/me';
const STORAGE_KEY = 'priamus.refresh-token';

function tokens(n: number) {
  return {
    accessToken: `access-${n}`,
    refreshToken: `refresh-${n}`,
    accessTokenExpiresAt: '2026-11-15T10:00:00Z',
    refreshTokenExpiresAt: '2026-12-15T10:00:00Z',
  };
}

const admin = { id: '1', username: 'admin', role: 'Admin', driverId: null };

const tick = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('Session', () => {
  let session: Session;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
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
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  async function signedIn(): Promise<void> {
    const signIn = session.signIn('admin', 'secret');
    http.expectOne('/api/identity/auth/login').flush(tokens(1));
    await tick();
    http.expectOne(ME_URL).flush(admin);
    await signIn;
  }

  it('after a sign-in the refresh token is in localStorage and the access token is not', async () => {
    await signedIn();

    expect(localStorage.getItem(STORAGE_KEY)).toBe('refresh-1');
    const stored = Object.keys(localStorage).map((key) => localStorage.getItem(key));
    expect(stored).not.toContain('access-1');
    expect(session.accessToken()).toBe('access-1');
    expect(session.user()).toEqual(admin);
  });

  it('at start a stored refresh token is renewed and the user read before the status is ready', async () => {
    localStorage.setItem(STORAGE_KEY, 'refresh-1');

    const start = session.start();
    expect(session.status()).toBe('starting');
    http.expectOne(REFRESH_URL).flush(tokens(2));
    await tick();
    expect(session.status()).toBe('starting');
    const me = http.expectOne(ME_URL);
    expect(me.request.headers.get('Authorization')).toBe('Bearer access-2');
    me.flush(admin);
    await start;
    await session.wait();

    expect(session.status()).toBe('ready');
    expect(session.user()).toEqual(admin);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('refresh-2');
  });

  it('at start without a stored token the session is ready with no user and no request', async () => {
    await session.start();

    expect(session.status()).toBe('ready');
    expect(session.user()).toBeNull();
  });

  it.each([
    [
      'the backend detail',
      { errorCode: 'Identity.User.AccountDisabled', detail: 'Account disabilitato.' },
      { detail: 'Account disabilitato.' },
      401,
    ],
    ['the session-expired key', null, { key: 'session.expired' }, 401],
    [
      'the session-expired key, not the detail, for a session the backend no longer knows',
      { errorCode: 'Identity.RefreshToken.NotFound', detail: 'Sessione non trovata.' },
      { key: 'session.expired' },
      404,
    ],
  ])(
    'a refused renewal at start removes the tokens and sets %s as notice',
    async (_name, body, notice, status) => {
      localStorage.setItem(STORAGE_KEY, 'refresh-1');

      const start = session.start();
      http.expectOne(REFRESH_URL).flush(body, { status, statusText: 'Refused' });
      await start;

      expect(session.status()).toBe('ready');
      expect(session.user()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(session.notice()).toEqual(notice);
    },
  );

  it('a refused renewal inside the application removes the tokens and goes to the login with the current address', async () => {
    await signedIn();
    await router.navigateByUrl('/users');

    const renewal = session.renew();
    http
      .expectOne(REFRESH_URL)
      .flush(
        { errorCode: 'Identity.RefreshToken.Expired', detail: 'Sessione chiusa.' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await expect(renewal).rejects.toBeDefined();
    await tick();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(session.user()).toBeNull();
    expect(session.notice()).toEqual({ detail: 'Sessione chiusa.' });
    expect(router.url).toBe('/login?returnUrl=%2Fusers');
  });

  it('when the start gets no usable answer the status is unreachable, the token is kept and retry starts again', async () => {
    localStorage.setItem(STORAGE_KEY, 'refresh-1');

    const start = session.start();
    http.expectOne(REFRESH_URL).flush(null, { status: 503, statusText: 'Service Unavailable' });
    await start;
    let released = false;
    void session.wait().then(() => (released = true));
    await tick();

    expect(session.status()).toBe('unreachable');
    expect(released).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('refresh-1');

    const retry = session.retry();
    expect(session.status()).toBe('starting');
    http.expectOne(REFRESH_URL).flush(tokens(2));
    await tick();
    http.expectOne(ME_URL).flush(admin);
    await retry;
    await tick();

    expect(session.status()).toBe('ready');
    expect(released).toBe(true);
    expect(session.user()).toEqual(admin);
  });

  it.each([408, 429])(
    'a %s on the renewal at start is no usable answer: unreachable, token kept',
    async (status) => {
      localStorage.setItem(STORAGE_KEY, 'refresh-1');

      const start = session.start();
      http.expectOne(REFRESH_URL).flush(null, { status, statusText: 'Retry' });
      await start;

      expect(session.status()).toBe('unreachable');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('refresh-1');
    },
  );

  it('a network failure at start is unreachable as well', async () => {
    localStorage.setItem(STORAGE_KEY, 'refresh-1');

    const start = session.start();
    http.expectOne(REFRESH_URL).error(new ProgressEvent('error'));
    await start;

    expect(session.status()).toBe('unreachable');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('refresh-1');
  });

  it('sign-out revokes on the backend, removes the tokens and goes to the login with no notice', async () => {
    await signedIn();

    const signOut = session.signOut();
    const revoke = http.expectOne('/api/identity/auth/revoke');
    expect(revoke.request.body).toEqual({ refreshToken: 'refresh-1' });
    revoke.flush(null, { status: 204, statusText: 'No Content' });
    await signOut;

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(session.accessToken()).toBeNull();
    expect(session.user()).toBeNull();
    expect(session.notice()).toBeNull();
    expect(router.url).toBe('/login');
  });

  it('when the revoke fails the user is signed out all the same', async () => {
    await signedIn();

    const signOut = session.signOut();
    http
      .expectOne('/api/identity/auth/revoke')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await signOut;

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(session.user()).toBeNull();
    expect(router.url).toBe('/login');
  });

  it('when the revoke is replayed after a rotation with the old token, the new token is revoked too', async () => {
    await signedIn();

    const signOut = session.signOut();
    http
      .expectOne('/api/identity/auth/revoke')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await tick();
    http.expectOne(REFRESH_URL).flush(tokens(2));
    await tick();
    const replayed = http.expectOne('/api/identity/auth/revoke');
    expect(replayed.request.body).toEqual({ refreshToken: 'refresh-1' });
    replayed.flush(null, { status: 409, statusText: 'Conflict' });
    await tick();
    const again = http.expectOne('/api/identity/auth/revoke');
    expect(again.request.body).toEqual({ refreshToken: 'refresh-2' });
    again.flush(null, { status: 204, statusText: 'No Content' });
    await signOut;

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(session.user()).toBeNull();
    expect(session.notice()).toBeNull();
    expect(router.url).toBe('/login');
  });

  it('when the renewal inside the sign-out is refused there is no further revoke and no notice', async () => {
    await signedIn();
    await router.navigateByUrl('/users');

    const signOut = session.signOut();
    http
      .expectOne('/api/identity/auth/revoke')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await tick();
    http
      .expectOne(REFRESH_URL)
      .flush(
        { errorCode: 'Identity.RefreshToken.Expired', detail: 'Sessione chiusa.' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await signOut;
    await tick();

    http.expectNone('/api/identity/auth/revoke');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(session.notice()).toBeNull();
    expect(router.url).toBe('/login');
  });

  it('a failed sign-in surfaces an ApiError and leaves no token behind', async () => {
    const signIn = session.signIn('admin', 'wrong');
    http
      .expectOne('/api/identity/auth/login')
      .flush(
        { errorCode: 'Identity.Login.InvalidCredentials', detail: 'Credenziali non valide.' },
        { status: 401, statusText: 'Unauthorized' },
      );

    await expect(signIn).rejects.toEqual({
      kind: 'domain',
      status: 401,
      errorCode: 'Identity.Login.InvalidCredentials',
      detail: 'Credenziali non valide.',
    } satisfies ApiError);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(session.accessToken()).toBeNull();
  });

  it.each([
    [401, 'Identity.RefreshToken.NoLongerValid'],
    [409, 'Identity.RefreshToken.ConcurrentRefresh'],
  ])(
    'a renewal refused with %s reads the token stored by the other tab and retries once',
    async (status, errorCode) => {
      await signedIn();

      const renewal = session.renew();
      const first = http.expectOne(REFRESH_URL);
      expect(first.request.body).toEqual({ refreshToken: 'refresh-1' });
      localStorage.setItem(STORAGE_KEY, 'refresh-9');
      first.flush({ errorCode, detail: 'x' }, { status, statusText: 'Refused' });
      await tick();
      const second = http.expectOne(REFRESH_URL);
      expect(second.request.body).toEqual({ refreshToken: 'refresh-9' });
      second.flush(tokens(10));

      await expect(renewal).resolves.toBe('access-10');
      expect(session.user()).toEqual(admin);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('refresh-10');
    },
  );

  it('concurrent renewals share the one in flight', async () => {
    await signedIn();

    const a = session.renew();
    const b = session.renew();
    http.expectOne(REFRESH_URL).flush(tokens(2));

    await expect(Promise.all([a, b])).resolves.toEqual(['access-2', 'access-2']);
  });

  it('a late renewal after a completed sign-out leaves the login as it is', async () => {
    await signedIn();
    const signOut = session.signOut();
    http
      .expectOne('/api/identity/auth/revoke')
      .flush(null, { status: 204, statusText: 'No Content' });
    await signOut;

    await expect(session.renew()).rejects.toMatchObject({ status: 401 });
    await tick();

    expect(router.url).toBe('/login');
    expect(session.notice()).toBeNull();
  });

  it('a refused login leaves the refresh token of another tab where it is', async () => {
    localStorage.setItem(STORAGE_KEY, 'refresh-other');

    const signIn = session.signIn('admin', 'wrong');
    http
      .expectOne('/api/identity/auth/login')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(signIn).rejects.toEqual({ kind: 'generic' });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('refresh-other');
    expect(session.accessToken()).toBeNull();
  });

  it('when the login succeeds but the current user cannot be read no token is left behind', async () => {
    const signIn = session.signIn('admin', 'secret');
    http.expectOne('/api/identity/auth/login').flush(tokens(1));
    await tick();
    http.expectOne(ME_URL).flush(null, { status: 500, statusText: 'Server Error' });

    await expect(signIn).rejects.toEqual({ kind: 'generic' });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(session.accessToken()).toBeNull();
    expect(session.user()).toBeNull();
  });

  describe('a 409 before the other tab has stored its token', () => {
    afterEach(() => vi.useRealTimers());

    const concurrentRefresh = {
      errorCode: 'Identity.RefreshToken.ConcurrentRefresh',
      detail: 'x',
    };

    it('waits once, reads the token the other tab stored meanwhile and retries with it', async () => {
      await signedIn();
      vi.useFakeTimers();

      const renewal = session.renew();
      http.expectOne(REFRESH_URL).flush(concurrentRefresh, { status: 409, statusText: 'Conflict' });
      await vi.advanceTimersByTimeAsync(100);
      http.expectNone(REFRESH_URL);
      localStorage.setItem(STORAGE_KEY, 'refresh-9');
      await vi.advanceTimersByTimeAsync(300);
      const second = http.expectOne(REFRESH_URL);
      expect(second.request.body).toEqual({ refreshToken: 'refresh-9' });
      second.flush(tokens(10));

      await expect(renewal).resolves.toBe('access-10');
      expect(session.user()).toEqual(admin);
    });

    it('when nothing appears during the wait the session ends', async () => {
      await signedIn();
      vi.useFakeTimers();

      const outcome = session.renew().catch((error: unknown) => error);
      http.expectOne(REFRESH_URL).flush(concurrentRefresh, { status: 409, statusText: 'Conflict' });
      await vi.advanceTimersByTimeAsync(300);

      await expect(outcome).resolves.toMatchObject({ status: 409 });
      http.expectNone(REFRESH_URL);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(session.user()).toBeNull();
      expect(session.notice()).toEqual({ detail: 'x' });
    });
  });
});
