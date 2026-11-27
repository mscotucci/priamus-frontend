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
import {
  stubModalDialog,
  stubScrollIntoView,
  userWithRole,
} from '../../../core/testing/dom-testing';
import { press, settle } from '../../../core/testing/interaction-testing';
import { PlannedTripPage } from './planned-trip-page';
import { Trips } from './trips';
import type { Trip, TripRead } from './trips-api';

registerLocaleData(localeIt);

const BASE = '/api/operations/driver';
const TRIP_URL = `${BASE}/trips/t1`;
const NEW_TRIP_URL = `${BASE}/new-trip`;

const trip: Trip = {
  id: 't1',
  state: 'Planned',
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
  day: null,
  start: null,
  end: null,
  kilograms: null,
  kilometres: null,
  number: null,
};

const read = (extra: Partial<TripRead> = {}): TripRead => ({
  trip,
  daysToExpiry: 5,
  endAsks: null,
  proposedStart: null,
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
      { path: 'trips/:tripId', component: PlannedTripPage },
    ],
  },
];

describe('PlannedTripPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;
  let scrolled: Element[];

  beforeEach(() => {
    stubModalDialog();
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

  const open = async (body: TripRead = read(), inProgress = false) => {
    harness = await RouterTestingHarness.create('/driver/trips/t1');
    harness.detectChanges();
    http.expectOne(TRIP_URL).flush(body);
    http
      .expectOne(NEW_TRIP_URL)
      .flush({ vehicle: null, trailer: null, hasTripInProgress: inProgress });
    await settle(fixture());
    element = harness.routeNativeElement as HTMLElement;
  };

  const button = (label: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('.pt-bottombar button')).find(
      (candidate) => text(candidate) === label,
    )!;
  const buttons = () =>
    Array.from(element.querySelectorAll('.pt-bottombar button')).map((candidate) =>
      text(candidate),
    );

  const click = async (label: string) => {
    button(label).click();
    await settle(fixture());
  };

  const type = async (selector: string, value: string) => {
    const field = element.querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await settle(fixture());
  };

  const refuse = async (status: number, body: object | null = null) => {
    http
      .expectOne((request) => request.url === `${TRIP_URL}/start`)
      .flush(body, { status, statusText: 'Refused' });
    await settle(fixture());
  };

  it('shows the title, the rows of the trip, the expiry line and the three buttons', async () => {
    await open();

    expect(text(element.querySelector('.pt-appbar__title'))).toBe('Viaggio da fare');
    expect(
      Array.from(element.querySelectorAll('.pt-summary__row')).map((row) =>
        Array.from(row.querySelectorAll('dt, dd'))
          .map((part) => text(part))
          .join(' '),
      ),
    ).toEqual([
      'Cliente Comune di Penne',
      'Luoghi → Depuratore consortile, Loreto Aprutino',
      'Mezzo XY123AB · Autospurgo Scania P410',
    ]);
    expect(text(element.querySelector('main .pt-muted'))).toBe(
      'Se non lo inizi, questo viaggio viene eliminato tra 5 giorni.',
    );
    expect(buttons()).toEqual(['Inizia ora', 'Iniziato alle…', 'Elimina']);
    http.verify();
  });

  it.each([
    [0, 'Se non lo inizi, questo viaggio viene eliminato a fine giornata.'],
    [1, 'Se non lo inizi, questo viaggio viene eliminato domani.'],
    [2, 'Se non lo inizi, questo viaggio viene eliminato tra 2 giorni.'],
  ])('with %i days to expiry the page says "%s"', async (days, line) => {
    await open(read({ daysToExpiry: days }));

    expect(text(element.querySelector('main .pt-muted'))).toBe(line);
  });

  it('"Inizia ora" starts the trip now and goes to the home', async () => {
    await open();

    button('Inizia ora').click();
    const request = http.expectOne(`${TRIP_URL}/start`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ day: null, time: null });
    request.flush({ ...trip, state: 'InProgress' });
    await settle(fixture());

    expect(url()).toBe('/driver');
  });

  it('with another trip in progress the start buttons are gone, the notice shows and "Elimina" stays', async () => {
    await open(read(), true);

    expect(text(element.querySelector('.pt-notice--info'))).toBe(
      'Hai un viaggio in corso: termina quello prima di iniziare questo.',
    );
    expect(buttons()).toEqual(['Elimina']);
  });

  it('"Iniziato alle…" asks "Quando è iniziato?" with three cards and "Ora di inizio", and "Annulla" goes back', async () => {
    await open();

    await click('Iniziato alle…');

    expect(text(element.querySelector('.pt-field .pt-label'))).toBe('Quando è iniziato?');
    expect(
      Array.from(element.querySelectorAll('.pt-choice')).map((card) =>
        Array.from(card.querySelectorAll('span'))
          .map((part) => text(part))
          .join(' '),
      ),
    ).toEqual(['Oggi 24 nov', 'Ieri 23 nov', 'Altra …']);
    expect(element.querySelector('input[type="time"]')).not.toBeNull();
    expect(buttons()).toEqual(["Conferma l'inizio", 'Annulla']);

    await click('Annulla');

    expect(buttons()).toEqual(['Inizia ora', 'Iniziato alle…', 'Elimina']);
    http.verify();
  });

  it.each([
    ['with a place', trip, 'Comune di Penne → Depuratore consortile · XY123AB'],
    ['without places', { ...trip, delivery: null }, 'Comune di PenneXY123AB'],
  ])(
    'the line above "Quando è iniziato?" %s puts the separator only between places and plate',
    async (_case, shown, line) => {
      await open(read({ trip: shown }));

      await click('Iniziato alle…');

      expect(text(element.querySelector('main > p'))).toBe(line);
    },
  );

  it('the confirmation sends the day and the time typed and goes to the home', async () => {
    await open();
    await click('Iniziato alle…');

    element.querySelectorAll<HTMLInputElement>('.pt-choice input')[1].click();
    await settle(fixture());
    await type('input[type="time"]', '07:30');
    await click("Conferma l'inizio");

    const request = http.expectOne(`${TRIP_URL}/start`);
    expect(request.request.body).toEqual({ day: '2026-11-23', time: '07:30' });
    request.flush({ ...trip, state: 'InProgress' });
    await settle(fixture());

    expect(url()).toBe('/driver');
  });

  it('"Altra" takes a date field limited to today', async () => {
    await open();
    await click('Iniziato alle…');

    element.querySelectorAll<HTMLInputElement>('.pt-choice input')[2].click();
    await settle(fixture());
    const date = element.querySelector<HTMLInputElement>('input[type="date"]')!;
    expect(date.max).toBe('2026-11-24');
    await type('input[type="date"]', '2026-11-20');
    await type('input[type="time"]', '06:15');
    await click("Conferma l'inizio");

    expect(http.expectOne(`${TRIP_URL}/start`).request.body).toEqual({
      day: '2026-11-20',
      time: '06:15',
    });
  });

  it('with the day on today the time is proposed from the read, with its hint and no "Adesso"', async () => {
    await open(read({ proposedStart: '08:20:00' }));

    await click('Iniziato alle…');

    expect(element.querySelector<HTMLInputElement>('input[type="time"]')!.value).toBe('08:20');
    expect(text(element.querySelector('.pt-field__hint'))).toBe('Dalla fine del viaggio di prima.');
    expect(Array.from(element.querySelectorAll('button')).map((b) => text(b))).not.toContain(
      'Adesso',
    );

    await type('input[type="time"]', '08:45');

    expect(element.querySelector('.pt-field__hint')).toBeNull();
    await click("Conferma l'inizio");
    expect(http.expectOne(`${TRIP_URL}/start`).request.body).toEqual({
      day: '2026-11-24',
      time: '08:45',
    });
  });

  it('leaving "Oggi" empties a time still equal to the proposal and coming back proposes it again; a typed time stays', async () => {
    await open(read({ proposedStart: '08:20:00' }));
    await click('Iniziato alle…');
    const time = () => element.querySelector<HTMLInputElement>('input[type="time"]')!.value;
    const pick = async (index: number) => {
      element.querySelectorAll<HTMLInputElement>('.pt-choice input')[index].click();
      await settle(fixture());
    };

    await pick(1);
    expect(time()).toBe('');

    await pick(0);
    expect(time()).toBe('08:20');
    expect(text(element.querySelector('.pt-field__hint'))).toBe('Dalla fine del viaggio di prima.');

    await type('input[type="time"]', '08:45');
    await pick(1);
    await pick(0);
    expect(time()).toBe('08:45');
  });

  it('with no trip ended today the time starts empty and the confirmation waits for it', async () => {
    await open();

    await click('Iniziato alle…');

    expect(element.querySelector<HTMLInputElement>('input[type="time"]')!.value).toBe('');
    expect(button("Conferma l'inizio").disabled).toBe(true);
  });

  it.each([
    ['a time in the future', 'Operations.Trip.InTheFuture', "L'ora non può essere nel futuro."],
    [
      'a time that overlaps another trip',
      'Operations.Trip.Overlaps',
      "Hai già un viaggio dalle 08:00 alle 09:00 di quel giorno. Controlla l'ora.",
    ],
  ])(
    '%s: the refusal of the typed time shows under "Ora di inizio"',
    async (_case, errorCode, detail) => {
      await open();
      await click('Iniziato alle…');
      await type('input[type="time"]', '10:00');
      await click("Conferma l'inizio");

      await refuse(422, { errorCode, detail, status: 422 });

      expect(text(element.querySelector('.pt-field__error'))).toBe(detail);
      expect(element.querySelector('app-notice')).toBeNull();
      expect(url()).toBe('/driver/trips/t1');
    },
  );

  it('a 422 that is not about the time, on a typed start, shows as the notice and not under "Ora di inizio"', async () => {
    await open();
    await click('Iniziato alle…');
    await type('input[type="time"]', '10:00');
    await click("Conferma l'inizio");
    const detail = 'Hai un viaggio in corso: termina quello prima di iniziare questo.';

    await refuse(422, { errorCode: 'Operations.Trip.AnotherInProgress', detail, status: 422 });

    expect(text(element.querySelector('app-notice'))).toBe(detail);
    expect(element.querySelector('.pt-field__error')).toBeNull();
    expect(scrolled).toContain(element.querySelector('main > app-notice'));
  });

  it.each([
    ['the time is edited', async () => type('input[type="time"]', '09:45')],
    [
      'the day changes',
      async () => {
        element.querySelectorAll<HTMLInputElement>('.pt-choice input')[1].click();
        await settle(fixture());
      },
    ],
  ])(
    'the refusal of the server under "Ora di inizio" goes away when %s',
    async (_case, edit) => {
      await open();
      await click('Iniziato alle…');
      await type('input[type="time"]', '10:00');
      await click("Conferma l'inizio");
      await refuse(422, {
        errorCode: 'Operations.Trip.InTheFuture',
        detail: "L'ora non può essere nel futuro.",
        status: 422,
      });
      expect(element.querySelector('.pt-field__error')).not.toBeNull();

      await edit();

      expect(element.querySelector('.pt-field__error')).toBeNull();
    },
  );

  it('a start refused because the answers no longer hold says the trip is to be deleted and added again', async () => {
    await open();

    button('Inizia ora').click();
    await refuse(409);

    expect(text(element.querySelector('app-notice'))).toBe(
      'Questo viaggio non si può più iniziare: qualcosa è cambiato. Eliminalo e inseriscilo di nuovo.',
    );
    expect(buttons()).toEqual(['Inizia ora', 'Iniziato alle…', 'Elimina']);
  });

  it('any other refusal of a start shows the generic text and the driver stays', async () => {
    await open();

    button('Inizia ora').click();
    await refuse(500);

    expect(text(element.querySelector('app-notice'))).toBe(
      'Non è stato possibile iniziare il viaggio. Chiama la segreteria.',
    );
    expect(url()).toBe('/driver/trips/t1');
  });

  it('a start that does not reach the server says "Connessione persa. Riprova."', async () => {
    await open();

    button('Inizia ora').click();
    http
      .expectOne(`${TRIP_URL}/start`)
      .error(new ProgressEvent('error'), { status: 0, statusText: '' });
    await settle(fixture());

    expect(text(element.querySelector('app-notice'))).toBe('Connessione persa. Riprova.');
    expect(scrolled).toContain(element.querySelector('main > app-notice'));
  });

  it('"Elimina" asks for confirmation, deletes the trip and goes to the home', async () => {
    await open();

    await click('Elimina');
    expect(text(document.querySelector('dialog[open]'))).toContain('Eliminare il viaggio?');
    http.expectNone(TRIP_URL);

    await press(fixture(), 1);

    const request = http.expectOne(TRIP_URL);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture());

    expect(url()).toBe('/driver');
  });

  it('"Annulla" in the dialog deletes nothing', async () => {
    await open();

    await click('Elimina');
    await press(fixture(), 0);

    http.expectNone(TRIP_URL);
    expect(url()).toBe('/driver/trips/t1');
  });

  it('a delete that does not reach the server says "Connessione persa. Riprova."', async () => {
    await open();

    await click('Elimina');
    await press(fixture(), 1);
    http.expectOne(TRIP_URL).error(new ProgressEvent('error'), { status: 0, statusText: '' });
    await settle(fixture());

    expect(text(element.querySelector('app-notice'))).toBe('Connessione persa. Riprova.');
  });

  it('a trip the read no longer finds sends the driver to the home', async () => {
    harness = await RouterTestingHarness.create('/driver/trips/t1');
    harness.detectChanges();
    http.expectOne(TRIP_URL).flush(null, { status: 404, statusText: 'Not Found' });
    http.expectOne(NEW_TRIP_URL).flush({ vehicle: null, trailer: null, hasTripInProgress: false });
    await settle(fixture());
    await settle(fixture());

    expect(url()).toBe('/driver');
  });
});
