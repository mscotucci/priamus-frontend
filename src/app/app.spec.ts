import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { App } from './app';
import { routes } from './app.routes';
import { CurrentUser } from './core/auth/auth-api';
import { guestGuard } from './shared/guards/guest-guard';
import { authInterceptor } from './core/auth/auth-interceptor';
import { Session, SessionStatus } from './core/auth/session';
import { provideTestI18n } from './core/i18n/i18n-testing';

@Component({ template: '' })
class Stub {}

function renderApp(status: SessionStatus) {
  const state = signal<SessionStatus>(status);
  const retry = vi.fn(() => Promise.resolve());
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideTestI18n(),
      { provide: Session, useValue: { status: state.asReadonly(), retry } },
    ],
  });
  TestBed.inject(TranslateService).use('it');
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  return { fixture, retry, element: fixture.nativeElement as HTMLElement };
}

describe('App startup screens', () => {
  it('shows only the brand block while the session starts', () => {
    const { element } = renderApp('starting');

    expect(element.querySelector('.pt-brand__name')?.textContent).toBe('Priamus');
    expect(element.querySelector('.pt-brand__line')?.textContent).toBe('Gestione Viaggi');
    expect(element.querySelector('router-outlet')).toBeNull();
    expect(element.querySelector('.pt-notice')).toBeNull();
  });

  it('shows the generic error and "Riprova" when the backend is unreachable, and "Riprova" starts the session again', () => {
    const { fixture, retry, element } = renderApp('unreachable');

    expect(element.querySelector('.pt-notice--danger')?.textContent).toContain(
      'Si è verificato un errore. Riprova tra poco.',
    );
    expect(element.querySelector('router-outlet')).toBeNull();
    const button = element.querySelector<HTMLButtonElement>('.pt-notice button')!;
    expect(button.textContent?.trim()).toBe('Riprova');

    button.click();
    fixture.detectChanges();

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows the routed pages and no startup screen when the session is ready', () => {
    const { element } = renderApp('ready');

    expect(element.querySelector('router-outlet')).not.toBeNull();
    expect(element.querySelector('.pt-brand')).toBeNull();
  });
});

describe('App routes with the real session', () => {
  const REFRESH_URL = '/api/identity/auth/refresh';
  const ME_URL = '/api/identity/me';
  const tick = () => new Promise<void>((resolve) => setTimeout(resolve));
  // long enough for a redirect to a lazy route to complete, were the guards to issue one
  const settleNavigation = () => new Promise<void>((resolve) => setTimeout(resolve, 100));

  afterEach(() => localStorage.clear());

  it('after "Riprova" succeeds the page first asked for is shown, never the login', async () => {
    localStorage.setItem('priamus.refresh-token', 'refresh-1');
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const router = TestBed.inject(Router);
    const session = TestBed.inject(Session);
    const http = TestBed.inject(HttpTestingController);

    const navigation = router.navigateByUrl('/users');
    const start = session.start();
    http.expectOne(REFRESH_URL).error(new ProgressEvent('error'));
    await start;
    await settleNavigation();

    expect(session.status()).toBe('unreachable');
    expect(router.url).toBe('/');

    const retry = session.retry();
    http.expectOne(REFRESH_URL).flush({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      accessTokenExpiresAt: '2026-11-15T10:00:00Z',
      refreshTokenExpiresAt: '2026-12-15T10:00:00Z',
    });
    await tick();
    http.expectOne(ME_URL).flush({ id: '1', username: 'ada', role: 'Admin', driverId: null });
    await retry;
    await navigation;

    expect(router.url).toBe('/users');
    expect(session.user()?.username).toBe('ada');
    http.verify();
  });
});

describe('App routes', () => {
  function configure(user: CurrentUser | null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: Stub, canActivate: [guestGuard] },
          { path: 'users', component: Stub },
          { path: 'customers', component: Stub },
          { path: 'vehicles', component: Stub },
          ...routes,
        ]),
        {
          provide: Session,
          useValue: { wait: () => Promise.resolve(), user: signal(user).asReadonly() },
        },
      ],
    });
  }

  it.each<[CurrentUser['role'], string]>([
    ['Admin', '/users'],
    ['BackOffice', '/customers'],
  ])('sends a signed-in %s from the root to %s', async (role, landing) => {
    configure({ id: '1', username: 'ada', role, driverId: null });

    await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe(landing);
  });

  it.each<[CurrentUser['role'], string, string]>([
    ['Admin', '/foo', '/users'],
    ['Admin', '/users/foo', '/users'],
    ['BackOffice', '/foo', '/customers'],
  ])(
    'sends an unknown address opened by a signed-in %s (%s) to %s',
    async (role, address, landing) => {
      configure({ id: '1', username: 'ada', role, driverId: null });

      await RouterTestingHarness.create(address);

      expect(TestBed.inject(Router).url).toBe(landing);
    },
  );

  it.each<[CurrentUser['role'], string]>([
    ['Driver', '/login'],
    ['BackOffice', '/customers'],
    ['Admin', '/customers'],
  ])(
    'the customers route admits BackOffice and Admin only: a %s opening it ends on %s',
    async (role, landing) => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([{ path: 'login', component: Stub }, ...routes]),
          provideHttpClient(),
          provideHttpClientTesting(),
          provideTestI18n(),
          {
            provide: Session,
            useValue: {
              wait: () => Promise.resolve(),
              user: signal<CurrentUser | null>({
                id: '1',
                username: 'ada',
                role,
                driverId: null,
              }).asReadonly(),
              signOut: vi.fn(),
            },
          },
        ],
      });
      TestBed.inject(TranslateService).use('it');

      await RouterTestingHarness.create('/customers');

      expect(TestBed.inject(Router).url).toBe(landing);
    },
  );

  it.each<[CurrentUser['role'], string]>([
    ['Driver', '/login'],
    ['BackOffice', '/drivers'],
    ['Admin', '/drivers'],
  ])(
    'the drivers route admits BackOffice and Admin only: a %s opening it ends on %s',
    async (role, landing) => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([{ path: 'login', component: Stub }, ...routes]),
          provideHttpClient(),
          provideHttpClientTesting(),
          provideTestI18n(),
          {
            provide: Session,
            useValue: {
              wait: () => Promise.resolve(),
              user: signal<CurrentUser | null>({
                id: '1',
                username: 'ada',
                role,
                driverId: null,
              }).asReadonly(),
              signOut: vi.fn(),
            },
          },
        ],
      });
      TestBed.inject(TranslateService).use('it');

      await RouterTestingHarness.create('/drivers');

      expect(TestBed.inject(Router).url).toBe(landing);
    },
  );

  it('sends an unknown address opened by nobody signed in to the login', async () => {
    configure(null);

    await RouterTestingHarness.create('/foo');

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2F');
  });

  it('opens the design system gallery with nobody signed in', async () => {
    configure(null);

    const harness = await RouterTestingHarness.create('/design-system');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Design system');
  });
});
