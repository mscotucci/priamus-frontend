import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeIt from '@angular/common/locales/it';
import { Component, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { CurrentUser } from '../../../core/auth/auth-api';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { userWithRole } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { MyTripsPage } from './my-trips-page';
import { Trips } from './trips';
import type { MyTrips, Trip } from './trips-api';

registerLocaleData(localeIt);

const URL = '/api/operations/driver/my-trips';

const vehicle = (plate: string, kind: Trip['vehicle']['kind'] = 'StandaloneVehicle') => ({
  id: plate,
  kind,
  licensePlate: plate,
  description: `Mezzo ${plate}`,
  requiresTrailer: false,
});

const ended = (
  id: string,
  number: number,
  day: string,
  extra: Partial<Trip> = {},
): MyTrips['trips'][number] => ({
  missingDocuments: 0,
  trip: tripOf(id, number, day, extra),
});

const tripOf = (id: string, number: number, day: string, extra: Partial<Trip>): Trip => ({
  id,
  state: 'Ended',
  customer: { id: `c-${id}`, companyName: `Cliente ${id}`, vatNumber: null },
  vehicle: vehicle('PE482WF'),
  trailer: null,
  pickup: null,
  delivery: null,
  day,
  start: '06:00:00',
  end: '07:30:00',
  kilograms: null,
  kilometres: null,
  number,
  ...extra,
});

const text = (element: Node | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();

@Component({ template: '' })
class HomeStub {}

// The driver area as the app wires it, without its guards and without the pages of other phases.
const routes = [
  {
    path: 'driver',
    component: Trips,
    children: [
      { path: '', component: HomeStub },
      { path: 'my-trips', component: MyTripsPage },
    ],
  },
];

describe('MyTripsPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
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

  const open = async (body: MyTrips | 'failure' | null = null) => {
    const harness = await RouterTestingHarness.create('/driver/my-trips');
    harness.detectChanges();
    if (body !== null) {
      const request = http.expectOne(URL);
      if (body === 'failure') {
        request.flush(null, { status: 500, statusText: 'Server Error' });
      } else {
        request.flush(body);
      }
    }
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  };

  const PAGE: MyTrips = {
    today: '2026-11-27',
    trips: [
      ended('a', 1251, '2026-11-27', {
        kilograms: 3520,
        start: '10:15:00',
        end: '11:40:00',
        pickup: { id: 'p', name: 'Magazzino centrale', municipality: 'Penne' },
        delivery: { id: 'd', name: 'Cantiere A14', municipality: 'Penne' },
      }),
      ended('b', 1248, '2026-11-27', {
        vehicle: vehicle('PE117MR', 'Tractor'),
        trailer: vehicle('AB29104', 'Trailer'),
      }),
      ended('c', 1247, '2026-11-26', {
        kilometres: 42,
        start: '15:20:00',
        end: '16:45:00',
        delivery: { id: 'd2', name: 'Discarica Cerratina', municipality: 'Penne' },
      }),
      ended('d', 1240, '2026-11-25', { start: '08:00:00', end: '08:45:00' }),
    ],
  };

  it('shows the bar with the back arrow and the title, then the intro', async () => {
    const element = await open(PAGE);

    expect(text(element.querySelector('h1'))).toBe('I miei viaggi');
    const back = element.querySelector<HTMLAnchorElement>('header a')!;
    expect(back.getAttribute('href')).toBe('/driver');
    expect(back.getAttribute('aria-label')).toBe('Torna alla home');
    expect(text(element.querySelector('main > p'))).toBe(
      'Viaggi conclusi negli ultimi 7 giorni. Tocca un viaggio per i suoi documenti.',
    );
    http.verify();
  });

  it('groups the trips by the day they started, titled from the server today, in the order sent', async () => {
    const element = await open(PAGE);

    const sections = Array.from(element.querySelectorAll('main section'));

    expect(sections.map((s) => text(s.querySelector('h2')))).toEqual([
      'Oggi, venerdì 27 novembre',
      'Ieri, giovedì 26 novembre',
      'Mercoledì 25 novembre',
    ]);
    expect(sections.map((s) => s.querySelectorAll('.pt-card').length)).toEqual([2, 1, 1]);
  });

  it('shows on each card the customer, the number, the places, the plates, the measure and the times', async () => {
    const element = await open(PAGE);

    const cards = Array.from(element.querySelectorAll('.pt-card')).map((card) =>
      Array.from(card.querySelectorAll('.min-w-0 > *')).map((line) => text(line)),
    );

    expect(cards).toEqual([
      [
        'Cliente a n. 1251',
        'Magazzino centrale → Cantiere A14',
        'PE482WF',
        '3.520 kg · 10:15 – 11:40',
      ],
      [
        'Cliente b n. 1248',
        'Nessun luogo',
        'PE117MR + AB29104',
        '1 ora e 30 minuti · 06:00 – 07:30',
      ],
      ['Cliente c n. 1247', '→ Discarica Cerratina', 'PE482WF', '42 km · 15:20 – 16:45'],
      ['Cliente d n. 1240', 'Nessun luogo', 'PE482WF', '45 minuti · 08:00 – 08:45'],
    ]);
  });

  it('lists what the API sends and never shows a price', async () => {
    const element = await open(PAGE);

    expect(element.querySelectorAll('.pt-card').length).toBe(PAGE.trips.length);
    expect(element.textContent).not.toContain('€');
  });

  it('every card is a link with a chevron to the documents of its trip, the trips of the window only', async () => {
    const element = await open(PAGE);

    const cards = Array.from(element.querySelectorAll<HTMLAnchorElement>('main a.pt-card'));
    expect(cards.map((card) => card.getAttribute('href'))).toEqual(
      PAGE.trips.map((item) => `/driver/trips/${item.trip.id}/documents`),
    );
    for (const card of cards) {
      expect(card.querySelector('use[href$="#chevron-right"]')).not.toBeNull();
    }
    expect(element.querySelectorAll('main button').length).toBe(0);
  });

  it('a card whose trip misses documents carries the pill "Manca un documento" or "Mancano <n> documenti", the others none', async () => {
    const element = await open({
      ...PAGE,
      trips: [
        { ...PAGE.trips[0], missingDocuments: 1 },
        { ...PAGE.trips[1], missingDocuments: 2 },
        PAGE.trips[2],
      ],
    });

    const pills = Array.from(element.querySelectorAll('.pt-card')).map((card) =>
      text(card.querySelector('.pt-pill--warn')),
    );
    expect(pills).toEqual(['Manca un documento', 'Mancano 2 documenti', undefined]);
  });

  it('says there is nothing to show when no trip ended in the last 7 days', async () => {
    const element = await open({ today: '2026-11-27', trips: [] });

    expect(text(element.querySelector('.pt-empty .pt-title'))).toBe(
      'Nessun viaggio concluso negli ultimi 7 giorni',
    );
    expect(text(element.querySelector('.pt-empty .pt-muted'))).toBe(
      'I viaggi compaiono qui quando li termini.',
    );
    expect(element.querySelector('h2')).toBeNull();
  });

  it('shows the spinner while loading', async () => {
    const harness = await RouterTestingHarness.create('/driver/my-trips');
    harness.detectChanges();
    const element = harness.routeNativeElement as HTMLElement;

    expect(text(element.querySelector('[role="status"]'))).toBe('Caricamento…');
    http.expectOne(URL);
  });

  it('shows a notice with "Riprova" when the read fails, and reads again', async () => {
    const element = await open('failure');

    expect(text(element.querySelector('app-notice'))).toContain('Si è verificato un errore');

    element.querySelector<HTMLButtonElement>('app-notice button')!.click();
    await settle();
    http.expectOne(URL).flush({ today: '2026-11-27', trips: [] });
    await settle();
    TestBed.tick();

    expect(element.querySelector('app-notice')).toBeNull();
    expect(text(element.querySelector('.pt-empty .pt-title'))).toBe(
      'Nessun viaggio concluso negli ultimi 7 giorni',
    );
  });
});
