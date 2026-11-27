import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import localeIt from '@angular/common/locales/it';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import type { TripDetail } from './backoffice-trips-api';
import { BackofficeTripsFacade } from './backoffice-trips-facade';
import { TripDrawer } from './trip-drawer';

registerLocaleData(localeIt);

const URL = '/api/operations/backoffice/trips';

const vehicle = (id: string, licensePlate: string) => ({
  id,
  licensePlate,
  description: 'Motrice',
  kind: 'Tractor' as const,
  requiresTrailer: false,
});

const place = (id: string, name: string) => ({ id, name, municipality: 'Pescara' });

const calculation: NonNullable<TripDetail['calculation']> = {
  amountAfterMinimum: 286,
  appliedNightCallFee: 45,
  baseAmount: 286,
  dayPrice: 40,
  isNight: true,
  minimumAmount: 104,
  minimumApplied: false,
  minimumKind: 'FixedMinimum',
  minimumOveragePrice: null,
  minimumThreshold: null,
  nightBandEnd: '06:00:00',
  nightBandStart: '22:00:00',
  nightCallFee: 45,
  nightPrice: 52,
  nightSurcharge: true,
  quantity: 330,
  rateDelivery: null,
  ratePickup: null,
  rateSource: 'Contract',
  rateVehicle: null,
  total: 331,
  unitPrice: 52,
};

const ended: TripDetail = {
  id: 't1',
  state: 'Ended',
  number: 1250,
  day: '2026-11-27',
  start: '22:10:00',
  end: '03:40:00',
  endedOn: '2026-11-28',
  expiresOn: null,
  daysToExpiry: null,
  addedAt: new Date(2026, 10, 26, 18, 2).toISOString(),
  customer: { id: 'c1', companyName: 'Comune di Penne', vatNumber: null },
  pickup: null,
  delivery: null,
  driver: { id: 'd1', firstName: 'Fabio', lastName: 'Esposito' },
  vehicle: vehicle('v1', 'PE-117-MR'),
  trailer: vehicle('v2', 'AB-29104'),
  measureKind: 'StartAndEnd',
  requiredDocuments: ['DeliveryNote', 'WasteForm'],
  calculation,
};

const inProgress: TripDetail = {
  ...ended,
  id: 't2',
  state: 'InProgress',
  number: null,
  day: '2026-11-27',
  start: '14:05:00',
  end: null,
  endedOn: null,
  pickup: place('p1', 'Magazzino centrale'),
  delivery: place('p2', 'Cantiere A14'),
  trailer: null,
  measureKind: null,
  requiredDocuments: [],
  calculation: null,
};

const planned = (daysToExpiry: number, expiresOn: string): TripDetail => ({
  ...inProgress,
  id: 't3',
  state: 'Planned',
  day: null,
  start: null,
  daysToExpiry,
  expiresOn,
  addedAt: new Date(2026, 10, 21, 16, 20).toISOString(),
});

describe('TripDrawer', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    stubModalDialog();
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        BackofficeTripsFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'it' },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  const open = async (trip: TripDetail) => {
    const fixture = TestBed.createComponent(TripDrawer);
    document.body.appendChild(fixture.nativeElement);
    TestBed.inject(BackofficeTripsFacade).openTrip(trip.id);
    await settle(fixture);
    http.expectOne(`${URL}/${trip.id}`).flush(trip);
    await settle(fixture);
    return fixture;
  };

  const el = (fixture: ReturnType<typeof TestBed.createComponent<TripDrawer>>) =>
    fixture.nativeElement as HTMLElement;

  const text = (element: Element | null | undefined) =>
    element?.textContent?.replace(/\s+/g, ' ').trim();

  /** The value of a field of the data grid, by its label. */
  const field = (element: HTMLElement, label: string) =>
    text(
      Array.from(element.querySelectorAll('dl > div'))
        .find((entry) => text(entry.querySelector('dt')) === label)
        ?.querySelector('dd'),
    );

  const calcRows = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('.pt-calc__row')).map((row) =>
      Array.from(row.children).map(text),
    );

  const timeline = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('.pt-timeline__item')).map((item) =>
      Array.from(item.querySelectorAll('p')).map(text),
    );

  it('an ended trip shows its data and the calculation it was saved with', async () => {
    const fixture = await open(ended);
    const element = el(fixture);

    expect(text(element.querySelector('.pt-drawer__head .pt-label'))).toBe('Dettaglio viaggio');
    expect(text(element.querySelector('.pt-drawer__head .pt-title'))).toBe('Viaggio n. 1250');
    expect(field(element, 'Cliente')).toBe('Comune di Penne');
    expect(field(element, 'Giorno')).toBe('27/11/2026');
    expect(field(element, 'Orari')).toBe('22:10 – 03:40');
    expect(field(element, 'Partenza')).toBe('—');
    expect(field(element, 'Consegna')).toBe('—');
    expect(field(element, 'Autista')).toBe('Fabio Esposito');
    expect(field(element, 'Mezzo')).toBe('PE-117-MR+ AB-29104');
    expect(calcRows(element)).toEqual([
      ['Modalità', 'A ore'],
      ['Fascia', 'Di notte · inizia alle 22:10, nella fascia notturna 22:00–06:00'],
      ['Tariffa', 'Del cliente'],
      ['Importo', '5 h 30 min × 52,00 €/h = 286,00 €'],
      ['Minimo', 'Minimo 104,00 €: non serve'],
      ['Chiamata notturna', '+ 45,00 € = 331,00 €'],
      ['Totale', '331,00 €'],
    ]);
    expect(text(element.querySelector('.pt-calc + p'))).toBe(
      'Tariffa del contratto in vigore il 27/11/2026, salvata sul viaggio quando è terminato.',
    );
    // the saved calculation is all it reads: no other request than the trip's own
    http.verify();
  });

  it('names the rate of a place and the pickup and delivery of a trip', async () => {
    const fixture = await open({
      ...ended,
      pickup: place('p1', 'Magazzino centrale'),
      delivery: place('p2', 'Cantiere A14'),
      calculation: {
        ...calculation,
        rateSource: 'LocationPair',
        ratePickup: place('p1', 'Magazzino centrale'),
        rateDelivery: place('p2', 'Cantiere A14'),
      },
    });
    const element = el(fixture);

    expect(field(element, 'Partenza')).toBe('Magazzino centrale');
    expect(field(element, 'Consegna')).toBe('Cantiere A14');
    expect(calcRows(element)[2]).toEqual([
      'Tariffa',
      'Della coppia Magazzino centrale, Pescara → Cantiere A14, Pescara',
    ]);
  });

  it('a night trip of a contract without the surcharge says the day price holds', async () => {
    const fixture = await open({
      ...ended,
      calculation: { ...calculation, nightSurcharge: false, appliedNightCallFee: null },
    });

    expect(calcRows(el(fixture))[1]).toEqual([
      'Fascia',
      'Di notte · il contratto non ha la maggiorazione notturna: vale il prezzo di giorno',
    ]);
  });

  it.each([
    [['DeliveryNote', 'WasteForm'], 'DDT, formulario rifiuti'],
    [[], 'Nessuno'],
  ])(
    'lists the documents the trip required (%j), or "Nessuno"',
    async (documents, shown) => {
      const fixture = await open({ ...ended, requiredDocuments: documents });

      expect(field(el(fixture), 'Documenti richiesti')).toBe(shown);
    },
  );

  it('the timeline of an ended trip has the three steps with date, time and driver', async () => {
    const fixture = await open(ended);

    expect(timeline(el(fixture))).toEqual([
      ['Inserito', '26/11 18:02 · Fabio Esposito'],
      ['Iniziato', '27/11 22:10'],
      ['Terminato', '28/11 03:40 · importo calcolato'],
    ]);
  });

  it('a trip in progress shows its end as "…" and says when the amount comes', async () => {
    const fixture = await open(inProgress);
    const element = el(fixture);

    expect(text(element.querySelector('.pt-drawer__head .pt-label'))).toBe('Dettaglio viaggio');
    expect(text(element.querySelector('.pt-drawer__head .pt-title'))).toBe('Viaggio in corso');
    expect(field(element, 'Orari')).toBe('14:05 – …');
    expect(field(element, 'Documenti richiesti')).toBeUndefined();
    expect(text(element.querySelector('.pt-notice--info'))).toBe(
      "L'importo si calcola quando l'autista termina il viaggio.",
    );
    expect(element.querySelector('.pt-calc')).toBeNull();
    expect(timeline(element)).toEqual([
      ['Inserito', '26/11 18:02 · Fabio Esposito'],
      ['Iniziato', '27/11 14:05'],
    ]);
  });

  it.each([
    [0, '2026-11-27', "Scade oggi, 27/11, se l'autista non lo inizia."],
    [1, '2026-11-28', "Scade domani, 28/11, se l'autista non lo inizia."],
    [5, '2026-12-02', "Scade il 02/12, se l'autista non lo inizia."],
  ])(
    'a planned trip with %s days left shows no day and no times, and a warning with its expiry',
    async (days, expiresOn, warning) => {
      const fixture = await open(planned(days, expiresOn));
      const element = el(fixture);

      expect(text(element.querySelector('.pt-drawer__head .pt-label'))).toBe('Dettaglio viaggio');
      expect(text(element.querySelector('.pt-drawer__head .pt-title'))).toBe('Viaggio da fare');
      expect(field(element, 'Giorno')).toBeUndefined();
      expect(field(element, 'Orari')).toBeUndefined();
      expect(text(element.querySelector('.pt-notice--warn'))).toBe(warning);
      expect(timeline(element)).toEqual([['Inserito', '21/11 16:20 · Fabio Esposito']]);
    },
  );

  it('is read only, with no foot and no link, and closes with its X', async () => {
    const fixture = await open(ended);
    const element = el(fixture);

    expect(element.querySelector('.pt-drawer__foot')).toBeNull();
    expect(element.querySelector('a')).toBeNull();
    expect(element.querySelector('.pt-drawer__body input, .pt-drawer__body textarea')).toBeNull();

    element.querySelector<HTMLButtonElement>('.pt-drawer__head button')!.click();

    expect(TestBed.inject(BackofficeTripsFacade).openTripId()).toBeNull();
  });

  it('shows a spinner while the trip is read', async () => {
    const fixture = TestBed.createComponent(TripDrawer);
    document.body.appendChild(fixture.nativeElement);
    TestBed.inject(BackofficeTripsFacade).openTrip('t1');
    await settle(fixture);

    expect(text(el(fixture).querySelector('[role="status"]'))).toBe('Caricamento viaggio…');
    expect(el(fixture).querySelector('dl')).toBeNull();
    http.expectOne(`${URL}/t1`);
  });

  it('a trip that is gone says so and the list reads again', async () => {
    const facade = TestBed.inject(BackofficeTripsFacade);
    facade.loadList();
    TestBed.tick();
    http.expectOne((request) => request.url === URL).flush({ trips: { data: [], totalCount: 0 } });
    const fixture = TestBed.createComponent(TripDrawer);
    document.body.appendChild(fixture.nativeElement);
    facade.openTrip('t1');
    await settle(fixture);

    http
      .expectOne(`${URL}/t1`)
      .flush({ errorCode: 'Operations.Trip.NotFound' }, { status: 404, statusText: 'Not Found' });
    await settle(fixture);

    expect(text(el(fixture).querySelector('.pt-notice'))).toBe("Questo viaggio non c'è più.");
    http.expectOne((request) => request.url === URL);
  });

  it('when the trip cannot be read it says so with "Riprova", which reads the trip again', async () => {
    const fixture = TestBed.createComponent(TripDrawer);
    document.body.appendChild(fixture.nativeElement);
    TestBed.inject(BackofficeTripsFacade).openTrip(ended.id);
    await settle(fixture);

    http.expectOne(`${URL}/${ended.id}`).flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    const notice = el(fixture).querySelector('app-notice')!;

    expect(text(notice)).toContain('Si è verificato un errore. Riprova tra poco.');
    http.expectNone((request) => request.url === URL);
    const retry = Array.from(notice.querySelectorAll('button')).find(
      (button) => text(button) === 'Riprova',
    )!;
    retry.click();
    await settle(fixture);
    http.expectOne(`${URL}/${ended.id}`).flush(ended);
    await settle(fixture);

    expect(el(fixture).querySelector('app-notice')).toBeNull();
    expect(text(el(fixture).querySelector('.pt-drawer__head .pt-title'))).toBe('Viaggio n. 1250');
  });
});
