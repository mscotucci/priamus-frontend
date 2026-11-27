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
import type { RepeatableTrip, TripLocation, TripVehicle } from './new-trip-answers';
import type { DriverHome, Trip } from './trips-api';
import { DriverHome as DriverHomePage } from './driver-home';
import { Trips } from './trips';
import { TripsFacade } from './trips-facade';

registerLocaleData(localeIt);

const URL = '/api/operations/driver/home';

const HOME: DriverHome = {
  firstName: 'Marco',
  lastName: 'Di Tullio',
  inProgress: null,
  planned: [],
  repeatableTrips: [],
};

const vehicle = (plate: string, kind: TripVehicle['kind'] = 'Tractor'): TripVehicle => ({
  id: plate.toLowerCase(),
  kind,
  licensePlate: plate,
  description: `Mezzo ${plate}`,
  requiresTrailer: false,
});
const place = (name: string): TripLocation => ({ id: name, name, municipality: 'Penne' });
const trip = (company: string, extra: Partial<RepeatableTrip> = {}): RepeatableTrip => ({
  customer: { id: company, companyName: company, vatNumber: null },
  vehicle: vehicle('AB123CD'),
  trailer: vehicle('XA456ZZ', 'Trailer'),
  pickup: place('Magazzino A'),
  delivery: place('Cantiere X'),
  ...extra,
});

const tripDto = (company: string, extra: Partial<Trip> = {}): Trip => ({
  id: company.toLowerCase().replace(/\W+/g, '-'),
  state: 'Planned',
  customer: { id: company, companyName: company, vatNumber: null },
  vehicle: vehicle('AB123CD'),
  trailer: vehicle('XA456ZZ', 'Trailer'),
  pickup: { ...place('Magazzino A'), municipality: 'Penne' },
  delivery: { ...place('Cantiere X'), municipality: 'Chieti Scalo' },
  day: null,
  start: null,
  end: null,
  kilograms: null,
  kilometres: null,
  number: null,
  ...extra,
});
const started = (day: string, start: string, extra: Partial<Trip> = {}) =>
  tripDto('Calcestruzzi Vestina S.p.A.', { id: 't1', state: 'InProgress', day, start, ...extra });
const inProgress = (trip: Trip, endAsks: 'Nothing' | 'Kilograms' | 'Kilometres' = 'Nothing') => ({
  ...HOME,
  inProgress: { trip, endAsks },
});

const text = (element: Node | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();

@Component({ template: '' })
class OtherPage {}

// The driver area as the app wires it, without its guards and without the pages of other phases.
const routes = [
  {
    path: 'driver',
    component: Trips,
    children: [
      { path: '', component: DriverHomePage },
      { path: 'new-trip', component: OtherPage },
      { path: 'trips/:tripId/end', component: OtherPage },
    ],
  },
];

describe('DriverHome', () => {
  let http: HttpTestingController;
  let signOut: ReturnType<typeof vi.fn>;
  let scrolled: Element[];

  beforeEach(() => {
    stubModalDialog();
    scrolled = [];
    stubScrollIntoView((target) => scrolled.push(target));
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 23, 9, 0));
    signOut = vi.fn(() => Promise.resolve());
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
            signOut,
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

  const open = async (body: DriverHome = HOME) => {
    const harness = await RouterTestingHarness.create('/driver');
    harness.detectChanges();
    http.expectOne(URL).flush(body);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  };

  it('shows the brand and "Esci", the name from the API, today and the action, and nothing else', async () => {
    const element = await open();

    expect(text(element.querySelector('.pt-brand__name'))).toBe('Priamus Trips');
    expect(text(element.querySelector('header button'))).toBe('Esci');
    expect(text(element.querySelector('.pt-driver-name'))).toBe('Marco Di Tullio');
    expect(text(element.querySelector('.pt-driver-name + p'))).toBe('Lunedì 23 novembre');
    expect(text(element.querySelector('.pt-action__title'))).toBe('Nuovo viaggio');
    expect(text(element.querySelector('.pt-action__hint'))).toBe('Mezzo, cliente e luoghi');
    expect(element.querySelector('.pt-action')?.getAttribute('href')).toBe('/driver/new-trip');
    expect(element.querySelectorAll('main > *').length).toBe(2);
    http.verify();
  });

  it('asks the server for the home alone', async () => {
    const harness = await RouterTestingHarness.create('/driver');
    harness.detectChanges();

    const requests = http.match(() => true);

    expect(requests.map((r) => r.request.url)).toEqual([URL]);
  });

  it('"Esci" closes the session at once, with no dialog', async () => {
    const element = await open();

    element.querySelector<HTMLButtonElement>('header button')!.click();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(document.querySelector('dialog[open]')).toBeNull();
  });

  it('the home content is one centred column of at most 640px', async () => {
    const element = await open();

    const column = element.querySelector('main')!;

    expect(element.classList).toContain('pt-driver');
    expect(column.classList).toContain('max-w-[640px]');
    expect(column.classList).toContain('mx-auto');
    expect(column.classList).toContain('w-full');
  });

  it('shows a notice with "Riprova" when the home cannot be read, and reads it again', async () => {
    const harness = await RouterTestingHarness.create('/driver');
    harness.detectChanges();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    await harness.fixture.whenStable();
    harness.detectChanges();
    const element = harness.routeNativeElement as HTMLElement;

    expect(text(element.querySelector('app-notice'))).toContain('Si è verificato un errore');

    element.querySelector<HTMLButtonElement>('app-notice button')!.click();
    await new Promise<void>((resolve) => setTimeout(resolve));
    TestBed.tick();
    http.expectOne(URL).flush(HOME);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(text(element.querySelector('.pt-driver-name'))).toBe('Marco Di Tullio');
  });

  describe('Ripeti un viaggio', () => {
    const FIVE = [
      trip('Calcestruzzi Vestina S.p.A.'),
      trip('Comune di Penne', {
        pickup: null,
        delivery: place('Depuratore'),
        trailer: null,
        vehicle: vehicle('XY123AB', 'StandaloneVehicle'),
      }),
      trip('Ecoservizi Adriatica S.r.l.', { pickup: null, delivery: null }),
      trip('Terzo Cliente', { delivery: null }),
      trip('Quinto Cliente'),
    ];
    const cards = (element: HTMLElement) =>
      Array.from(element.querySelectorAll('section .pt-choice'));
    const company = (card: Element) =>
      card.querySelector('.min-w-0')!.firstChild!.textContent!.trim();
    const lines = (card: Element) =>
      Array.from(card.querySelectorAll('.pt-choice__hint')).map((hint) => text(hint));

    it('shows the section under the action with the first four trips: company, places in each shape, plates joined by "+"', async () => {
      const element = await open({ ...HOME, repeatableTrips: FIVE });

      expect(text(element.querySelector('.pt-section-title'))).toBe('Ripeti un viaggio');
      expect(element.querySelector('.pt-action + section')).not.toBeNull();
      expect(cards(element).map((card) => [company(card), ...lines(card)])).toEqual([
        ['Calcestruzzi Vestina S.p.A.', 'Magazzino A → Cantiere X', 'AB123CD + XA456ZZ'],
        ['Comune di Penne', '→ Depuratore', 'XY123AB'],
        ['Ecoservizi Adriatica S.r.l.', 'Senza luoghi', 'AB123CD + XA456ZZ'],
        ['Terzo Cliente', 'Magazzino A →', 'AB123CD + XA456ZZ'],
      ]);
      expect(lines(cards(element)[0])).toEqual(['Magazzino A → Cantiere X', 'AB123CD + XA456ZZ']);
      expect(
        Array.from(cards(element)[0].querySelectorAll('.pt-mono')).map((plate) => text(plate)),
      ).toEqual(['AB123CD', 'XA456ZZ']);
    });

    it('"Mostra tutti" shows every trip in the same order and goes away', async () => {
      const element = await open({ ...HOME, repeatableTrips: FIVE });

      const more = Array.from(element.querySelectorAll<HTMLButtonElement>('section .pt-link')).find(
        (button) => text(button) === 'Mostra tutti',
      )!;
      more.click();
      await new Promise<void>((resolve) => setTimeout(resolve));
      TestBed.tick();

      expect(cards(element)).toHaveLength(5);
      expect(company(cards(element)[4])).toBe('Quinto Cliente');
      expect(element.querySelector('section .pt-link')).toBeNull();
    });

    it('with four trips or fewer there is no "Mostra tutti"', async () => {
      const element = await open({ ...HOME, repeatableTrips: FIVE.slice(0, 4) });

      expect(cards(element)).toHaveLength(4);
      expect(element.querySelector('section .pt-link')).toBeNull();
    });

    it('a driver without trips sees no section', async () => {
      const element = await open();

      expect(element.querySelector('section')).toBeNull();
      expect(text(element)).not.toContain('Ripeti un viaggio');
    });

    it('a tap on a repeatable trip opens "Nuovo viaggio" and saves nothing', async () => {
      const harness = await RouterTestingHarness.create('/driver');
      harness.detectChanges();
      http.expectOne(URL).flush({ ...HOME, repeatableTrips: FIVE });
      await harness.fixture.whenStable();
      harness.detectChanges();

      (harness.routeNativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('section .pt-choice')!
        .click();
      await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/driver/new-trip'));

      expect(http.match((r) => r.method !== 'GET')).toEqual([]);
    });
  });

  describe('the trip in progress and the trips to do', () => {
    const END_URL = '/api/operations/driver/trips/t1/end';
    const DELETE_URL = '/api/operations/driver/trips/t1';
    const END_PAGE = '/driver/trips/t1/end';
    const TYPED_END_PAGE = '/driver/trips/t1/end?time=typed';
    const TODAY = '2026-11-23';
    const YESTERDAY = '2026-11-22';

    const openWith = async (body: DriverHome) => {
      const harness = await RouterTestingHarness.create('/driver');
      harness.detectChanges();
      http.expectOne(URL).flush(body);
      await harness.fixture.whenStable();
      harness.detectChanges();
      const facade = harness.routeDebugElement!.injector.get(TripsFacade);
      return {
        facade,
        fixture: harness.fixture,
        element: harness.routeNativeElement as HTMLElement,
        endUrl: () => TestBed.inject(Router).url,
        openEnded: vi.spyOn(facade, 'openEnded').mockResolvedValue(true),
      };
    };
    const button = (element: HTMLElement, label: string) =>
      Array.from(element.querySelectorAll<HTMLButtonElement>('main button')).find(
        (candidate) => text(candidate) === label,
      );
    const click = async (fixture: ComponentFixture<unknown>, target: HTMLElement | undefined) => {
      target!.click();
      await settle(fixture);
    };
    const titles = (element: HTMLElement) =>
      Array.from(element.querySelectorAll('.pt-section-title')).map((title) => text(title));
    const notice = (element: HTMLElement) => text(element.querySelector('app-notice'));
    const precedes = (first: Element, second: Element) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

    it('shows the trip in progress first, with its rows and its three buttons, then the action, then "Da fare"', async () => {
      const planned = { trip: tripDto('Comune di Penne'), daysToExpiry: 5 };
      const { element } = await openWith({
        ...inProgress(started(TODAY, '07:30:00')),
        planned: [planned],
      });

      const sections = element.querySelectorAll('main > section');
      expect(titles(element)).toEqual(['In corso', 'Da fare']);
      expect(precedes(sections[0], element.querySelector('.pt-action')!)).toBe(true);
      expect(precedes(element.querySelector('.pt-action')!, sections[1])).toBe(true);
      const rows = Array.from(element.querySelectorAll('.pt-summary__row')).map((row) => [
        text(row.querySelector('dt')),
        Array.from(row.querySelectorAll('dd')).map((value) => text(value)),
      ]);
      expect(rows).toEqual([
        ['Iniziato', ['Oggi alle 07:30']],
        ['Cliente', ['Calcestruzzi Vestina S.p.A.']],
        ['Luoghi', ['Magazzino A, Penne', '→ Cantiere X, Chieti Scalo']],
        ['Mezzo', ['AB123CD + XA456ZZ']],
      ]);
      expect(Array.from(sections[0].querySelectorAll('button')).map((b) => text(b))).toEqual([
        'Termina ora',
        'Terminato alle…',
        'Elimina',
      ]);
      http.verify();
    });

    it('tells yesterday with its date, and a trip without places', async () => {
      const { element } = await openWith(
        inProgress(started(YESTERDAY, '20:00:00', { pickup: null, delivery: null })),
      );

      const values = Array.from(element.querySelectorAll('.pt-summary dd')).map((v) => text(v));

      expect(values[0]).toBe('Ieri, domenica 22 novembre, alle 20:00');
      expect(values[2]).toBe('Senza luoghi');
    });

    it('"Termina ora" of a trip started today ends it at once, with no dialog, and shows the ended trip', async () => {
      const { fixture, element, openEnded } = await openWith(
        inProgress(started(TODAY, '07:30:00')),
      );

      await click(fixture, button(element, 'Termina ora'));

      expect(document.querySelector('dialog[open]')).toBeNull();
      const request = http.expectOne(END_URL);
      expect(request.request.body).toEqual({ time: null, kilograms: null, kilometres: null });
      request.flush(started(TODAY, '07:30:00', { state: 'Ended', end: '09:00:00', number: 1 }));
      await settle(fixture);
      expect(openEnded).toHaveBeenCalledTimes(1);
    });

    it('a trip whose end asks a measure goes to the end page without ending', async () => {
      const { fixture, element, endUrl } = await openWith(
        inProgress(started(TODAY, '07:30:00'), 'Kilograms'),
      );

      await click(fixture, button(element, 'Termina ora'));

      await vi.waitFor(() => expect(endUrl()).toBe(END_PAGE));
      http.verify();
    });

    it('a trip started yesterday asks first, with how long it would last, and ends only on "Termina ora"', async () => {
      const { fixture, element, openEnded } = await openWith(
        inProgress(started(YESTERDAY, '20:00:00')),
      );

      await click(fixture, button(element, 'Termina ora'));

      expect(text(element.querySelector('dialog p:not(.pt-title)'))).toBe(
        'Il viaggio è iniziato ieri alle 20:00. Terminando adesso dura 13 ore.',
      );
      expect(
        Array.from(element.querySelectorAll('.pt-dialog__actions button')).map((b) => text(b)),
      ).toEqual(["Scrivi l'ora di arrivo", 'Termina ora']);
      http.expectNone(END_URL);

      await press(fixture, 1);
      http
        .expectOne(END_URL)
        .flush(started(YESTERDAY, '20:00:00', { state: 'Ended', end: '09:00:00', number: 1 }));
      await settle(fixture);
      expect(openEnded).toHaveBeenCalledTimes(1);
    });

    it.each([['Kilograms' as const], ['Kilometres' as const]])(
      'a %s trip started yesterday asks first, and its "Termina ora" opens the end page without ending',
      async (asks) => {
        const { fixture, element, endUrl } = await openWith(
          inProgress(started(YESTERDAY, '20:00:00'), asks),
        );

        await click(fixture, button(element, 'Termina ora'));

        expect(text(element.querySelector('dialog p:not(.pt-title)'))).toBe(
          'Il viaggio è iniziato ieri alle 20:00. Terminando adesso dura 13 ore.',
        );
        expect(endUrl()).toBe('/driver');

        await press(fixture, 1);

        await vi.waitFor(() => expect(endUrl()).toBe(END_PAGE));
        http.verify();
      },
    );

    it.each([['Kilograms' as const], ['Kilometres' as const]])(
      '"Scrivi l\'ora di arrivo" of a %s trip started yesterday opens the typed end',
      async (asks) => {
        const { fixture, element, endUrl } = await openWith(
          inProgress(started(YESTERDAY, '20:00:00'), asks),
        );
        await click(fixture, button(element, 'Termina ora'));

        await press(fixture, 0);

        await vi.waitFor(() => expect(endUrl()).toBe(TYPED_END_PAGE));
        http.verify();
      },
    );

    it('a trip started today that asks a measure goes straight to the end page, with no dialog', async () => {
      const { fixture, element, endUrl } = await openWith(
        inProgress(started(TODAY, '07:30:00'), 'Kilograms'),
      );

      await click(fixture, button(element, 'Termina ora'));

      expect(document.querySelector('dialog[open]')).toBeNull();
      await vi.waitFor(() => expect(endUrl()).toBe(END_PAGE));
    });

    it('"Scrivi l\'ora di arrivo" opens the end page and ends nothing', async () => {
      const { fixture, element, endUrl } = await openWith(
        inProgress(started(YESTERDAY, '20:00:00')),
      );
      await click(fixture, button(element, 'Termina ora'));

      await press(fixture, 0);

      await vi.waitFor(() => expect(endUrl()).toBe(TYPED_END_PAGE));
      expect(element.querySelector('dialog')).toBeNull();
      http.verify();
    });

    it('after 24 hours there is no "Termina ora", only "Terminato alle…"', async () => {
      const { fixture, element, endUrl } = await openWith(
        inProgress(started(YESTERDAY, '08:00:00')),
      );

      expect(button(element, 'Termina ora')).toBeUndefined();
      await click(fixture, button(element, 'Terminato alle…'));

      await vi.waitFor(() => expect(endUrl()).toBe(TYPED_END_PAGE));
    });

    it('a trip started 23 hours ago still has "Termina ora"', async () => {
      const { element } = await openWith(inProgress(started(YESTERDAY, '10:00:00')));

      expect(button(element, 'Termina ora')).toBeDefined();
    });

    it("a refusal of the end shows the server's text on the home and the trip stays", async () => {
      const { fixture, element, openEnded } = await openWith(
        inProgress(started(TODAY, '07:30:00')),
      );
      await click(fixture, button(element, 'Termina ora'));

      http
        .expectOne(END_URL)
        .flush(
          { errorCode: 'Operations.Trip.Overlaps', detail: 'Hai già un viaggio dalle 08:00.' },
          { status: 422, statusText: 'Unprocessable' },
        );
      await settle(fixture);

      expect(notice(element)).toBe('Hai già un viaggio dalle 08:00.');
      expect(titles(element)).toContain('In corso');
      expect(openEnded).not.toHaveBeenCalled();
    });

    it('an end that fails for another reason tells to call the office', async () => {
      const { fixture, element } = await openWith(inProgress(started(TODAY, '07:30:00')));
      await click(fixture, button(element, 'Termina ora'));

      http.expectOne(END_URL).flush(null, { status: 500, statusText: 'Server Error' });
      await settle(fixture);

      expect(notice(element)).toBe(
        'Non è stato possibile terminare il viaggio. Chiama la segreteria.',
      );
      expect(titles(element)).toContain('In corso');
    });

    it('an end that is stale goes to the end page', async () => {
      const { fixture, element, endUrl } = await openWith(inProgress(started(TODAY, '07:30:00')));
      await click(fixture, button(element, 'Termina ora'));

      http.expectOne(END_URL).flush(null, { status: 409, statusText: 'Conflict' });
      await settle(fixture);

      await vi.waitFor(() => expect(endUrl()).toBe(END_PAGE));
    });

    it('an end the server cannot be reached for says "Connessione persa. Riprova."', async () => {
      const { fixture, element } = await openWith(inProgress(started(TODAY, '07:30:00')));
      await click(fixture, button(element, 'Termina ora'));

      http.expectOne(END_URL).error(new ProgressEvent('error'));
      await settle(fixture);

      expect(notice(element)).toBe('Connessione persa. Riprova.');
      expect(scrolled).toContain(element.querySelector('main > app-notice'));
    });

    it('a delete the server cannot be reached for says "Connessione persa. Riprova."', async () => {
      const { fixture, element } = await openWith(inProgress(started(TODAY, '07:30:00')));
      await click(fixture, button(element, 'Elimina'));
      await press(fixture, 1);

      http.expectOne(DELETE_URL).error(new ProgressEvent('error'));
      await settle(fixture);

      expect(notice(element)).toBe('Connessione persa. Riprova.');
      expect(titles(element)).toContain('In corso');
    });

    it('"Elimina" asks first and "Annulla" sends nothing', async () => {
      const { fixture, element } = await openWith(inProgress(started(TODAY, '07:30:00')));

      await click(fixture, button(element, 'Elimina'));

      expect(text(element.querySelector('dialog .pt-title'))).toBe('Eliminare il viaggio?');
      http.expectNone(DELETE_URL);

      await press(fixture, 0);

      expect(element.querySelector('dialog')).toBeNull();
      http.verify();
    });

    it('confirming removes the trip and reads the home again', async () => {
      const { fixture, element } = await openWith(inProgress(started(TODAY, '07:30:00')));
      await click(fixture, button(element, 'Elimina'));

      await press(fixture, 1);
      http.expectOne(DELETE_URL).flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);
      const reread = http.expectOne(URL);

      expect(element.querySelector('.pt-spinner')).not.toBeNull();
      expect(titles(element)).toEqual([]);

      reread.flush(HOME);
      await settle(fixture);

      expect(titles(element)).not.toContain('In corso');
      expect(element.querySelector('dialog')).toBeNull();
    });

    it('a delete answered stale tells so and reads the home again', async () => {
      const { fixture, element, facade } = await openWith(inProgress(started(TODAY, '07:30:00')));
      await click(fixture, button(element, 'Elimina'));

      await press(fixture, 1);
      http.expectOne(DELETE_URL).flush(null, { status: 409, statusText: 'Conflict' });
      await settle(fixture);
      http.expectOne(URL).flush(HOME);
      await settle(fixture);

      expect(notice(element)).toBe('Si è verificato un errore. Riprova tra poco.');
      expect(titles(element)).not.toContain('In corso');
      expect(scrolled).toEqual([element.querySelector('main > app-notice')]);

      facade.reloadHome();
      await settle(fixture);
      http.expectOne(URL).flush(HOME);
      await settle(fixture);

      expect(scrolled).toHaveLength(1);
    });

    describe('Da fare', () => {
      const PLANNED = [
        { trip: tripDto('Comune di Penne', { trailer: null }), daysToExpiry: 5 },
        {
          trip: tripDto('Ecoservizi Adriatica', { pickup: null, delivery: null }),
          daysToExpiry: 1,
        },
        { trip: tripDto('Terzo Cliente'), daysToExpiry: 0 },
      ];

      it('each planned trip is a card in the order received, a link to its page, with no button', async () => {
        const { element } = await openWith({ ...HOME, planned: PLANNED });

        const cards = Array.from(element.querySelectorAll('section .pt-choice'));

        expect(titles(element)).toEqual(['Da fare']);
        expect(cards.map((card) => text(card.querySelector('.min-w-0')!.firstChild))).toEqual([
          'Comune di Penne',
          'Ecoservizi Adriatica',
          'Terzo Cliente',
        ]);
        expect(cards.map((card) => card.getAttribute('href'))).toEqual([
          '/driver/trips/comune-di-penne',
          '/driver/trips/ecoservizi-adriatica',
          '/driver/trips/terzo-cliente',
        ]);
        expect(element.querySelector('section button')).toBeNull();
      });

      it('the last line of a card says when the trip expires', async () => {
        const { element } = await openWith({ ...HOME, planned: PLANNED });

        const lines = Array.from(element.querySelectorAll('section .pt-choice')).map((card) =>
          Array.from(card.querySelectorAll('.pt-choice__hint')).map((hint) => text(hint)),
        );

        expect(lines).toEqual([
          ['Magazzino A → Cantiere X', 'AB123CD', 'Scade tra 5 giorni'],
          ['Senza luoghi', 'AB123CD + XA456ZZ', 'Scade domani'],
          ['Magazzino A → Cantiere X', 'AB123CD + XA456ZZ', 'Scade oggi'],
        ]);
      });

      it('with no planned trip there is no section', async () => {
        const { element } = await openWith(HOME);

        expect(titles(element)).not.toContain('Da fare');
      });
    });

    it('"Ripeti un viaggio" comes last, after "Da fare"', async () => {
      const planned = [{ trip: tripDto('Comune di Penne'), daysToExpiry: 5 }];

      const { element } = await openWith({
        ...HOME,
        planned,
        repeatableTrips: [trip('Calcestruzzi Vestina S.p.A.')],
      });

      expect(titles(element)).toEqual(['Da fare', 'Ripeti un viaggio']);
    });

    it('"Ripeti un viaggio" is hidden while a trip is in progress', async () => {
      const { element } = await openWith({
        ...inProgress(started(TODAY, '07:30:00')),
        repeatableTrips: [trip('Calcestruzzi Vestina S.p.A.')],
      });

      expect(titles(element)).toEqual(['In corso']);
      expect(text(element)).not.toContain('Ripeti un viaggio');
    });
  });
});
