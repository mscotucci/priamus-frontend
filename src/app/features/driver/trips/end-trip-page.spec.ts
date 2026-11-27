import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeIt from '@angular/common/locales/it';
import { Component, LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { CurrentUser } from '../../../core/auth/auth-api';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubScrollIntoView, userWithRole } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { EndTripPage } from './end-trip-page';
import { Trips } from './trips';
import { TripsFacade } from './trips-facade';
import type { Trip, TripRead } from './trips-api';

registerLocaleData(localeIt);

const BASE = '/api/operations/driver';
const TRIP_URL = `${BASE}/trips/t1`;

const trip: Trip = {
  id: 't1',
  state: 'InProgress',
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
  delivery: { id: 'l1', name: 'Depuratore consortile', municipality: 'Loreto Aprutino' },
  day: '2026-11-24',
  start: '07:30:00',
  end: null,
  kilograms: null,
  kilometres: null,
  number: null,
};

const read = (endAsks: TripRead['endAsks'], extra: Partial<Trip> = {}): TripRead => ({
  trip: { ...trip, ...extra },
  daysToExpiry: null,
  endAsks,
  proposedStart: null,
});

const text = (element: Node | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();

@Component({ template: '' })
class StubPage {}

// The driver area as the app wires it, without its guards and without the pages of other phases.
const routes = [
  {
    path: 'driver',
    component: Trips,
    children: [
      { path: '', component: StubPage },
      { path: 'trips/:tripId/end', component: EndTripPage },
      { path: 'ended', component: StubPage },
    ],
  },
];

describe('EndTripPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;
  let scrolled: Element[];

  beforeEach(() => {
    scrolled = [];
    stubScrollIntoView((target) => scrolled.push(target));
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 24, 9, 0));
    const user: CurrentUser = { ...userWithRole('Driver'), driverId: 'd1' };
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: LOCALE_ID, useValue: 'it' },
        {
          provide: Session,
          useValue: {
            wait: () => Promise.resolve(),
            user: signal(user).asReadonly(),
            signOut: () => Promise.resolve(),
          },
        },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const fixture = () => harness.fixture as ComponentFixture<unknown>;
  const url = () => TestBed.inject(Router).url;

  const open = async (body: TripRead, query = '') => {
    harness = await RouterTestingHarness.create(`/driver/trips/t1/end${query}`);
    harness.detectChanges();
    http.expectOne(TRIP_URL).flush(body);
    await settle(fixture());
    element = harness.routeNativeElement as HTMLElement;
  };

  const button = () => element.querySelector<HTMLButtonElement>('.pt-bottombar button')!;
  const labels = () =>
    Array.from(element.querySelectorAll('main .pt-label')).map((label) => text(label));
  const errors = () =>
    Array.from(element.querySelectorAll('.pt-field__error')).map((error) => text(error));

  const type = async (selector: string, value: string) => {
    const field = element.querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await settle(fixture());
  };
  const leave = async (selector: string) => {
    element.querySelector<HTMLInputElement>(selector)!.dispatchEvent(new Event('blur'));
    await settle(fixture());
  };

  const send = async () => {
    button().click();
    await settle(fixture());
    return http.expectOne(`${TRIP_URL}/end`);
  };
  const refuse = async (status: number, body: object | null = null) => {
    (await send()).flush(body, { status, statusText: 'Refused' });
    await settle(fixture());
  };

  it('by weight it shows the customer, the places, the start, "Peso trasportato" with its unit and hint, and "Termina ora"', async () => {
    await open(read('Kilograms'));

    expect(text(element.querySelector('.pt-appbar__title'))).toBe('Termina il viaggio');
    expect(text(element.querySelector('main p'))).toBe(
      'Comune di Penne → Depuratore consortile · iniziato oggi alle 07:30',
    );
    expect(labels()).toEqual(['Peso trasportato']);
    expect(text(element.querySelector('.pt-input-group__addon'))).toBe('kg');
    expect(text(element.querySelector('.pt-field__hint'))).toBe('In chili, come sulla pesata.');
    expect(element.querySelector('input[type="time"]')).toBeNull();
    expect(text(button())).toBe('Termina ora');
    expect(button().disabled).toBe(true);
    http.verify();
  });

  it('a trip without places starts its line with the start, with no separator before it', async () => {
    await open(read('Kilograms', { delivery: null }));

    expect(text(element.querySelector('main p'))).toBe('Comune di Penne iniziato oggi alle 07:30');
  });

  it('by distance it asks "Chilometri percorsi" in km', async () => {
    await open(read('Kilometres'));

    expect(labels()).toEqual(['Chilometri percorsi']);
    expect(text(element.querySelector('.pt-input-group__addon'))).toBe('km');
    expect(element.querySelector('.pt-field__hint')).toBeNull();
  });

  it('"Termina ora" sends the measure with no time and goes to the trip ended', async () => {
    await open(read('Kilograms'));
    await type('input[inputmode="numeric"]', '12300');

    expect(button().disabled).toBe(false);
    const request = await send();
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ time: null, kilograms: 12300, kilometres: null });
    request.flush({ ...trip, state: 'Ended', end: '10:45:00', kilograms: 12300, number: 1248 });
    await settle(fixture());

    expect(url()).toBe('/driver/ended');
  });

  it('by distance the kilometres are sent', async () => {
    await open(read('Kilometres'));
    await type('input[inputmode="numeric"]', '85');

    expect((await send()).request.body).toEqual({ time: null, kilograms: null, kilometres: 85 });
  });

  it('a trip that asks nothing ends at once with "Termina ora"', async () => {
    await open(read('Nothing'));

    expect(labels()).toEqual([]);
    expect(text(button())).toBe('Termina ora');
    expect(button().disabled).toBe(false);
    expect((await send()).request.body).toEqual({ time: null, kilograms: null, kilometres: null });
  });

  it('a typed end shows "Ora di fine" before the measure, and "Conferma la fine"', async () => {
    await open(read('Kilograms'), '?time=typed');

    expect(labels()).toEqual(['Ora di fine', 'Peso trasportato']);
    expect(element.querySelector('input[type="time"]')).not.toBeNull();
    expect(text(button())).toBe('Conferma la fine');
    expect(button().disabled).toBe(true);

    await type('input[type="time"]', '10:45');
    expect(text(element.querySelector('.pt-field__hint'))).toBe('Durata: 3 ore e 15 minuti');
    await type('input[inputmode="numeric"]', '12300');

    expect((await send()).request.body).toEqual({
      time: '10:45',
      kilograms: 12300,
      kilometres: null,
    });
  });

  it('a typed end on a trip that asks nothing needs only the time', async () => {
    await open(read('Nothing'), '?time=typed');

    expect(labels()).toEqual(['Ora di fine']);
    expect(button().disabled).toBe(true);

    await type('input[type="time"]', '08:00');

    expect(button().disabled).toBe(false);
    expect((await send()).request.body).toEqual({
      time: '08:00',
      kilograms: null,
      kilometres: null,
    });
  });

  it('a typed end earlier than the start is the day after, and the duration says so', async () => {
    await open(read('Nothing'), '?time=typed');

    await type('input[type="time"]', '07:00');

    expect(text(element.querySelector('.pt-field__hint'))).toBe('Durata: 23 ore e 30 minuti');
    expect(button().disabled).toBe(false);
  });

  it('a trip started 24 hours ago or more asks the end time without the query', async () => {
    await open(read('Nothing', { day: '2026-11-23', start: '09:00:00' }));

    expect(labels()).toEqual(['Ora di fine']);
    expect(text(button())).toBe('Conferma la fine');
    expect(text(element.querySelector('main p'))).toContain('iniziato ieri alle 09:00');
  });

  it('a trip started less than 24 hours ago does not ask the end time', async () => {
    await open(read('Nothing', { day: '2026-11-23', start: '09:01:00' }));

    expect(labels()).toEqual([]);
    expect(text(button())).toBe('Termina ora');
  });

  it.each([
    ['Kilograms', 'abc', 'Scrivi i chili, senza virgola.'],
    ['Kilograms', '0', 'Scrivi i chili, senza virgola.'],
    ['Kilograms', '100000', 'Al massimo 99.999 kg.'],
    ['Kilometres', '12,5', 'Scrivi i chilometri, senza virgola.'],
    ['Kilometres', '10000', 'Al massimo 9.999 km.'],
  ] as const)(
    '%s typed "%s" shows "%s" once left, the button disabled',
    async (asks, value, message) => {
      await open(read(asks));
      const selector = 'input[inputmode="numeric"]';

      await type(selector, value);
      expect(errors()).toEqual([]);

      await leave(selector);

      expect(errors()).toEqual([message]);
      expect(button().disabled).toBe(true);
    },
  );

  it('an end equal to the start shows "L\'ora di fine deve essere diversa dall\'ora di inizio."', async () => {
    await open(read('Nothing'), '?time=typed');

    await type('input[type="time"]', '07:30');
    await leave('input[type="time"]');

    expect(errors()).toEqual(["L'ora di fine deve essere diversa dall'ora di inizio."]);
    expect(element.querySelector('.pt-field__hint')).toBeNull();
    expect(button().disabled).toBe(true);
    http.verify();
  });

  it.each([
    ['a time in the future', "L'ora non può essere nel futuro."],
    ['a time that overlaps another trip', "Hai già un viaggio dalle 08:00 alle 09:00 di quel giorno. Controlla l'ora."],
  ])('%s: the refusal of the typed time shows under "Ora di fine"', async (_case, detail) => {
    await open(read('Nothing'), '?time=typed');
    await type('input[type="time"]', '10:00');

    await refuse(422, { errorCode: 'Operations.Trip.Rule', detail, status: 422 });

    expect(errors()).toEqual([detail]);
    expect(element.querySelector('app-notice')).toBeNull();
    expect(url()).toContain('/driver/trips/t1/end');
  });

  it('the refusal under "Ora di fine" goes away when the time is edited', async () => {
    await open(read('Nothing'), '?time=typed');
    await type('input[type="time"]', '10:00');
    await refuse(422, {
      errorCode: 'Operations.Trip.Rule',
      detail: "L'ora non può essere nel futuro.",
      status: 422,
    });
    expect(errors()).toEqual(["L'ora non può essere nel futuro."]);

    await type('input[type="time"]', '09:00');

    expect(errors()).toEqual([]);
    expect(element.querySelector<HTMLInputElement>('input[type="time"]')!.value).toBe('09:00');
  });

  it('a refusal that is no rule says to call the office, the trip still in progress and the fields kept', async () => {
    await open(read('Kilograms'));
    await type('input[inputmode="numeric"]', '12300');

    await refuse(500);

    expect(text(element.querySelector('app-notice'))).toBe(
      'Non è stato possibile terminare il viaggio. Chiama la segreteria.',
    );
    expect(element.querySelector<HTMLInputElement>('input[inputmode="numeric"]')!.value).toBe(
      '12300',
    );
    expect(url()).toContain('/driver/trips/t1/end');
  });

  it('with no connection the page says so and keeps the fields', async () => {
    await open(read('Kilograms'), '?time=typed');
    await type('input[type="time"]', '10:45');
    await type('input[inputmode="numeric"]', '12300');

    (await send()).error(new ProgressEvent('error'));
    await settle(fixture());

    expect(text(element.querySelector('app-notice'))).toBe('Connessione persa. Riprova.');
    expect(scrolled).toContain(element.querySelector('main > app-notice'));
    expect(element.querySelector<HTMLInputElement>('input[type="time"]')!.value).toBe('10:45');
    expect(element.querySelector<HTMLInputElement>('input[inputmode="numeric"]')!.value).toBe(
      '12300',
    );
    expect(button().disabled).toBe(false);
  });

  it('a stale end reads the trip again and shows the fields it now asks, the typed time kept', async () => {
    await open(read('Nothing'), '?time=typed');
    await type('input[type="time"]', '10:45');

    await refuse(409);
    http.expectOne(TRIP_URL).flush(read('Kilograms'));
    await settle(fixture());

    expect(labels()).toEqual(['Ora di fine', 'Peso trasportato']);
    expect(element.querySelector<HTMLInputElement>('input[type="time"]')!.value).toBe('10:45');
    expect(element.querySelector('app-notice')).toBeNull();
    expect(url()).toContain('/driver/trips/t1/end');
  });

  it('a stale end whose trip read again asks the same says the trip has just started, when it started a minute ago', async () => {
    await open(read('Kilograms', { start: '08:59:00' }));
    await type('input[inputmode="numeric"]', '12300');

    await refuse(409);
    expect(element.querySelector('app-notice')).toBeNull();
    http.expectOne(TRIP_URL).flush(read('Kilograms', { start: '08:59:00' }));
    await settle(fixture());

    expect(text(element.querySelector('app-notice'))).toBe(
      'Il viaggio è appena iniziato: terminalo tra un minuto.',
    );
    expect(scrolled).toContain(element.querySelector('main > app-notice'));
    expect(element.querySelector<HTMLInputElement>('input[inputmode="numeric"]')!.value).toBe(
      '12300',
    );
    expect(url()).toContain('/driver/trips/t1/end');
  });

  it('a stale end whose trip read again asks the same, on a trip started long ago, says to call the office', async () => {
    await open(read('Kilograms'));
    await type('input[inputmode="numeric"]', '12300');

    await refuse(409);
    http.expectOne(TRIP_URL).flush(read('Kilograms'));
    await settle(fixture());

    expect(text(element.querySelector('app-notice'))).toBe(
      'Non è stato possibile terminare il viaggio. Chiama la segreteria.',
    );
    expect(url()).toContain('/driver/trips/t1/end');
  });

  it.each([
    [
      '1:59 ago',
      new Date(2026, 10, 24, 9, 0, 59),
      '08:59:00',
      'Il viaggio è appena iniziato: terminalo tra un minuto.',
    ],
    [
      '2:00 ago',
      new Date(2026, 10, 24, 9, 1, 0),
      '08:59:00',
      'Non è stato possibile terminare il viaggio. Chiama la segreteria.',
    ],
    [
      'after the device clock',
      new Date(2026, 10, 24, 9, 0),
      '09:05:00',
      'Il viaggio è appena iniziato: terminalo tra un minuto.',
    ],
  ])(
    'a stale end unchanged by the re-read, on a trip started %s, tells the right text',
    async (_when, now, start, expected) => {
      await open(read('Nothing', { start }));
      vi.setSystemTime(now);

      await refuse(409);
      http.expectOne(TRIP_URL).flush(read('Nothing', { start }));
      await settle(fixture());

      expect(text(element.querySelector('app-notice'))).toBe(expected);
    },
  );

  it('a stale end whose re-read fails leaves no stale notice for a later read', async () => {
    await open(read('Kilograms'));
    await type('input[inputmode="numeric"]', '12300');
    await refuse(409);
    http.expectOne(TRIP_URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture());

    harness.routeDebugElement!.injector.get(TripsFacade).needTrip('t1');
    await settle(fixture());
    http.expectOne(TRIP_URL).flush(read('Kilograms'));
    await settle(fixture());

    expect(element.querySelector('app-notice')).toBeNull();
  });

  it('the notice of a stale end goes away with the next try', async () => {
    await open(read('Nothing'));
    await refuse(409);
    http.expectOne(TRIP_URL).flush(read('Nothing'));
    await settle(fixture());
    expect(element.querySelector('app-notice')).not.toBeNull();

    button().click();
    await settle(fixture());

    expect(element.querySelector('app-notice')).toBeNull();
    http.expectOne(`${TRIP_URL}/end`);
  });

  it('a "Termina ora" refused after 24 hours is read again and asks the time', async () => {
    await open(read('Nothing', { start: '09:00:30' }));
    expect(labels()).toEqual([]);

    vi.setSystemTime(new Date(2026, 10, 25, 9, 1));
    await refuse(409);
    http.expectOne(TRIP_URL).flush(read('Nothing', { start: '09:00:30' }));
    await settle(fixture());

    expect(labels()).toEqual(['Ora di fine']);
    expect(text(button())).toBe('Conferma la fine');
  });

  it('a trip that is not in progress sends the driver to the home', async () => {
    await open(read(null, { state: 'Planned', day: null, start: null }));
    await settle(fixture());

    expect(url()).toBe('/driver');
  });

  it('a trip that does not exist sends the driver to the home', async () => {
    harness = await RouterTestingHarness.create('/driver/trips/t1/end');
    harness.detectChanges();
    http.expectOne(TRIP_URL).flush(null, { status: 404, statusText: 'Not Found' });
    await settle(fixture());
    await settle(fixture());

    expect(url()).toBe('/driver');
  });
});
