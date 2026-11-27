import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { routes } from '../../../app.routes';
import { CurrentUser } from '../../../core/auth/auth-api';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { userWithRole } from '../../../core/testing/dom-testing';
import { DriverHome } from './driver-home';
import { EndTripPage } from './end-trip-page';
import { PlannedTripPage } from './planned-trip-page';
import { TripEnded } from './trip-ended';
import type { Trip } from './trips-api';
import { TripsFacade } from './trips-facade';

const ENDED: Trip = {
  id: 't1',
  state: 'Ended',
  customer: { id: 'c1', companyName: 'Comune di Penne', vatNumber: null },
  vehicle: {
    id: 'v1',
    kind: 'StandaloneVehicle',
    licensePlate: 'XY123AB',
    description: 'Autospurgo Scania P410',
    requiresTrailer: false,
  },
  trailer: null,
  pickup: null,
  delivery: null,
  day: '2026-11-24',
  start: '07:30:00',
  end: '09:00:00',
  kilograms: null,
  kilometres: null,
  number: 1,
};

const driver = (driverId: string | null): CurrentUser => ({
  ...userWithRole('Driver'),
  driverId,
});

describe('Trips', () => {
  let http: HttpTestingController;
  let signOut: ReturnType<typeof vi.fn>;

  const setup = (user: CurrentUser) => {
    signOut = vi.fn(() => Promise.resolve());
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        {
          provide: Session,
          useValue: {
            wait: () => Promise.resolve(),
            user: signal(user).asReadonly(),
            signOut,
          },
        },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
  };

  const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim();

  it('an account without a driver sees only the unlinked screen and no request leaves', async () => {
    setup(driver(null));

    const harness = await RouterTestingHarness.create('/driver');
    harness.detectChanges();
    const element = harness.routeNativeElement as HTMLElement;

    expect(text(element.querySelector('.pt-brand__name'))).toBe('Priamus Trips');
    expect(text(element.querySelector('header button'))).toBe('Esci');
    const paragraphs = Array.from(element.querySelectorAll('main p')).map((p) => text(p));
    expect(paragraphs).toEqual([
      'Non puoi ancora registrare viaggi',
      'Il tuo account non è collegato a un autista attivo. Chiama la segreteria.',
    ]);
    expect(element.querySelector('a')).toBeNull();
    http.expectNone(() => true);
  });

  it('the unlinked screen is the same on any driver address', async () => {
    setup(driver(null));

    const harness = await RouterTestingHarness.create('/driver/new-trip');
    harness.detectChanges();

    expect(text(harness.routeNativeElement as HTMLElement)).toContain(
      'Non puoi ancora registrare viaggi',
    );
    http.expectNone(() => true);
  });

  it('"Esci" on the unlinked screen closes the session without a dialog', async () => {
    setup(driver(null));
    const harness = await RouterTestingHarness.create('/driver');
    harness.detectChanges();

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button')!.click();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(document.querySelector('dialog[open]')).toBeNull();
  });

  it('the unlinked screen is one centred column of at most 640px', async () => {
    setup(driver(null));
    const harness = await RouterTestingHarness.create('/driver');
    harness.detectChanges();

    const root = harness.routeNativeElement as HTMLElement;
    const column = root.querySelector('main')!;

    expect(root.classList).toContain('pt-driver');
    expect(column.classList).toContain('max-w-[640px]');
    expect(column.classList).toContain('mx-auto');
    expect(column.classList).toContain('w-full');
  });

  it('the real routes land on the home, the planned trip, the end page and the trip ended', async () => {
    setup(driver('d1'));
    const harness = await RouterTestingHarness.create();
    const lands = async (url: string, page: Type<unknown>) => {
      await harness.navigateByUrl(url);
      harness.detectChanges();
      expect(TestBed.inject(Router).url).toBe(url);
      expect(harness.routeDebugElement!.query(By.directive(page))).not.toBeNull();
    };

    await lands('/driver', DriverHome);
    await lands('/driver/trips/t1', PlannedTripPage);
    await lands('/driver/trips/t1/end', EndTripPage);

    const facade = harness.routeDebugElement!.injector.get(TripsFacade);
    const ended = facade.end('t1', { time: null, kilograms: null, kilometres: null });
    http.expectOne('/api/operations/driver/trips/t1/end').flush(ENDED);
    await ended;
    await lands('/driver/ended', TripEnded);
  });

  it.each([
    ['Admin', '/users'],
    ['BackOffice', '/customers'],
  ] as const)('sends a %s opening /driver to %s', async (role, landing) => {
    setup(userWithRole(role));

    await TestBed.inject(Router).navigateByUrl('/driver');

    expect(TestBed.inject(Router).url).toBe(landing);
  });
});
