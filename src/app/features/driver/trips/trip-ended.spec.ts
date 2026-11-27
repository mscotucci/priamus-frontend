import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeIt from '@angular/common/locales/it';
import { LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { routes } from '../../../app.routes';
import { CurrentUser } from '../../../core/auth/auth-api';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubScrollIntoView, userWithRole } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import type { Trip } from './trips-api';
import { TripsFacade } from './trips-facade';

registerLocaleData(localeIt);

const TRIP: Trip = {
  id: 'trip',
  state: 'Ended',
  number: 1248,
  customer: { id: 'c1', companyName: 'Calcestruzzi Vestina S.p.A.', vatNumber: null },
  day: '2026-11-23',
  vehicle: {
    id: 't1',
    kind: 'Tractor',
    licensePlate: 'AB123CD',
    description: 'Scania R450',
    requiresTrailer: false,
  },
  trailer: {
    id: 'r1',
    kind: 'Trailer',
    licensePlate: 'XA456ZZ',
    description: 'Ribaltabile Menci',
    requiresTrailer: false,
  },
  pickup: { id: 'l1', name: 'Magazzino A', municipality: 'Penne' },
  delivery: { id: 'l2', name: 'Cantiere X', municipality: 'Chieti Scalo' },
  start: '07:30:00',
  end: '10:45:00',
  kilograms: null,
  kilometres: null,
};

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();

describe('TripEnded', () => {
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

  const flushHome = () =>
    http.match('/api/operations/driver/home').forEach((request) =>
      request.flush({
        firstName: 'Marco',
        lastName: 'Di Tullio',
        inProgress: null,
        planned: [],
        repeatableTrips: [],
      }),
    );

  /** Opens the page the way an end does: the facade holds the trip just ended, then the route is entered. */
  const open = async (trip: Partial<Trip> = {}) => {
    const harness = await RouterTestingHarness.create('/driver');
    await settle(harness.fixture);
    flushHome();
    const facade = harness.routeDebugElement!.injector.get(TripsFacade);
    const ending = facade.end('trip', { time: '10:45', kilograms: null, kilometres: null });
    http.expectOne('/api/operations/driver/trips/trip/end').flush({ ...TRIP, ...trip });
    await ending;
    await harness.navigateByUrl('/driver/ended');
    await settle(harness.fixture);
    return { harness, element: harness.routeNativeElement as HTMLElement };
  };

  const rows = ({ element }: Awaited<ReturnType<typeof open>>) =>
    Array.from(element.querySelectorAll('.pt-summary__row')).map((row) => ({
      icon: row.querySelector('.pt-tile use')?.getAttribute('href'),
      label: text(row.querySelector('dt')),
      values: Array.from(row.querySelectorAll('dd')).map((value) => text(value)),
    }));

  const press = (opened: Awaited<ReturnType<typeof open>>, label: string) =>
    Array.from(opened.element.querySelectorAll<HTMLButtonElement>('.pt-bottombar button'))
      .find((button) => text(button) === label)!
      .click();

  it('shows "Viaggio n. <number>" and the trip day under the title "Viaggio concluso"', async () => {
    const opened = await open();

    expect(text(opened.element.querySelector('.pt-appbar__title'))).toBe('Viaggio concluso');
    expect(text(opened.element.querySelector('.pt-driver-name'))).toBe('Viaggio n. 1248');
    expect(text(opened.element.querySelector('.pt-driver-name + .pt-muted'))).toBe(
      'lunedì 23 novembre 2026',
    );
    expect(opened.element.querySelector('.pt-tile--success')).not.toBeNull();
  });

  it('one row per item with its icon: times with their duration, customer, locations, vehicle and trailer', async () => {
    const opened = await open();

    expect(rows(opened)).toEqual([
      { icon: 'icons.svg#clock', label: 'Orari', values: ['07:30 – 10:45 · 3 ore e 15 minuti'] },
      { icon: 'icons.svg#building', label: 'Cliente', values: ['Calcestruzzi Vestina S.p.A.'] },
      {
        icon: 'icons.svg#pin',
        label: 'Luoghi',
        values: ['Magazzino A, Penne', '→ Cantiere X, Chieti Scalo'],
      },
      {
        icon: 'icons.svg#truck',
        label: 'Mezzo',
        values: ['AB123CD · Scania R450', 'XA456ZZ · Ribaltabile Menci'],
      },
    ]);
    expect(
      Array.from(opened.element.querySelectorAll('.pt-summary .pt-mono')).map((plate) =>
        text(plate),
      ),
    ).toEqual(['AB123CD', 'XA456ZZ']);
  });

  it('by weight a row "Peso" follows the times, in the Italian number format', async () => {
    const opened = await open({ kilograms: 12300 });

    expect(rows(opened).slice(0, 2)).toEqual([
      { icon: 'icons.svg#clock', label: 'Orari', values: ['07:30 – 10:45 · 3 ore e 15 minuti'] },
      { icon: 'icons.svg#scale', label: 'Peso', values: ['12.300 kg'] },
    ]);
  });

  it('by distance a row "Chilometri" follows the times', async () => {
    const opened = await open({ kilometres: 48 });

    expect(rows(opened).slice(0, 2)).toEqual([
      { icon: 'icons.svg#clock', label: 'Orari', values: ['07:30 – 10:45 · 3 ore e 15 minuti'] },
      { icon: 'icons.svg#ruler', label: 'Chilometri', values: ['48 km'] },
    ]);
  });

  it('a trip ended after midnight shows its duration across the two days', async () => {
    const opened = await open({ start: '22:10:00', end: '01:40:00' });

    expect(rows(opened)[0].values).toEqual(['22:10 – 01:40 · 3 ore e 30 minuti']);
  });

  it('without locations the row is left out, without a trailer the vehicle has one line', async () => {
    const opened = await open({ pickup: null, delivery: null, trailer: null });

    expect(rows(opened).map((row) => row.label)).toEqual(['Orari', 'Cliente', 'Mezzo']);
    expect(rows(opened)[2].values).toEqual(['AB123CD · Scania R450']);
  });

  it('a trip with one location shows it alone', async () => {
    const opened = await open({ pickup: null });

    expect(rows(opened)[2].values).toEqual(['Consegna: Cantiere X, Chieti Scalo']);
  });

  it('has "Stesso giro" and "Torna alla home" and no way into the ended trip', async () => {
    const opened = await open();

    const bar = opened.element.querySelector('.pt-bottombar')!;
    expect(Array.from(bar.querySelectorAll('button, a')).map((control) => text(control))).toEqual([
      'Stesso giro',
      'Torna alla home',
    ]);
    expect(opened.element.querySelector('main a, main button, main input')).toBeNull();
  });

  it.each([
    ['a weight trip', { kilograms: 12300 }],
    ['a distance trip', { kilometres: 48 }],
    ['a trip with no measure', {}],
  ] as [string, Partial<Trip>][])(
    'shows no amount and no text of day or night for %s',
    async (_name, trip) => {
      const opened = await open(trip);

      expect(text(opened.element)).not.toMatch(/€|euro|importo|prezzo|notturn|diurn|notte/i);
    },
  );

  it('from 900px the content is one centred column of 640px, the two buttons side by side at its end', async () => {
    const opened = await open();

    const column = opened.element.querySelector('main')!;
    const bar = opened.element.querySelector('.pt-bottombar')!;
    const buttons = bar.firstElementChild!;

    for (const name of ['max-w-[640px]', 'mx-auto', 'w-full']) {
      expect(column.classList).toContain(name);
      expect(buttons.classList).toContain(name);
    }
    expect(bar.classList).toContain('min-[900px]:static');
    expect(buttons.classList).toContain('min-[900px]:grid-cols-2');
  });

  it('after "Torna alla home" the ended trip cannot be opened again: its address goes back to the home', async () => {
    const opened = await open();

    press(opened, 'Torna alla home');
    await settle(opened.harness.fixture);
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/driver'));
    flushHome();

    await opened.harness.navigateByUrl('/driver/ended');
    await settle(opened.harness.fixture);
    flushHome();
    await opened.harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/driver');
    expect(text(opened.harness.routeNativeElement)).not.toContain('Viaggio concluso');
  });

  it('without an ended trip it goes to the home and shows nothing of a trip', async () => {
    const harness = await RouterTestingHarness.create('/driver/ended');
    await settle(harness.fixture);
    flushHome();
    await settle(harness.fixture);

    expect(TestBed.inject(Router).url).toBe('/driver');
    expect(text(harness.routeNativeElement)).not.toContain('Viaggio concluso');
  });

  describe('starting another trip', () => {
    beforeEach(() => {
      stubScrollIntoView();
    });

    it('"Stesso giro" opens "Nuovo viaggio" from the trip just ended, checked against the registry, and nothing is saved', async () => {
      const opened = await open();
      press(opened, 'Stesso giro');
      await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/driver/new-trip'));
      await settle(opened.harness.fixture);

      http
        .expectOne('/api/operations/driver/new-trip')
        .flush({ vehicle: TRIP.vehicle, trailer: null, hasTripInProgress: false });
      await settle(opened.harness.fixture);
      const check = http.expectOne((r) => r.url === '/api/operations/driver/answers-check');
      const contract = http.expectOne((r) => r.url === '/api/operations/driver/trip-questions');
      expect(check.request.params.get('vehicleId')).toBe('t1');
      expect(check.request.params.get('trailerId')).toBe('r1');
      expect(check.request.params.get('customerId')).toBe('c1');
      expect(check.request.params.get('pickupLocationId')).toBe('l1');
      expect(check.request.params.get('deliveryLocationId')).toBe('l2');
      check.flush({ vehicle: true, trailer: true, customer: true, pickup: true, delivery: true });
      contract.flush({
        locationsAsked: 'Both',
        places: [{ pickup: TRIP.pickup, delivery: TRIP.delivery }],
        lastPlace: null,
      });
      await settle(opened.harness.fixture);

      expect(text(opened.harness.routeNativeElement as HTMLElement)).toContain('AB123CD + XA456ZZ');
      expect(http.match((r) => r.method === 'PUT')).toEqual([]);
      http.match(() => true);
    });
  });
});
