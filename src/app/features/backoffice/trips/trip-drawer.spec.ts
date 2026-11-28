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

const URL_BASE = '/api/operations/backoffice/trips';

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
  documents: [],
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
  documents: [],
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
    http.expectOne(`${URL_BASE}/${trip.id}`).flush(trip);
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
    http.expectOne(`${URL_BASE}/t1`);
  });

  it('a trip that is gone says so and the list reads again', async () => {
    const facade = TestBed.inject(BackofficeTripsFacade);
    facade.loadList();
    TestBed.tick();
    http
      .expectOne((request) => request.url === URL_BASE)
      .flush({ trips: { data: [], totalCount: 0 } });
    const fixture = TestBed.createComponent(TripDrawer);
    document.body.appendChild(fixture.nativeElement);
    facade.openTrip('t1');
    await settle(fixture);

    http
      .expectOne(`${URL_BASE}/t1`)
      .flush({ errorCode: 'Operations.Trip.NotFound' }, { status: 404, statusText: 'Not Found' });
    await settle(fixture);

    expect(text(el(fixture).querySelector('.pt-notice'))).toBe("Questo viaggio non c'è più.");
    http.expectOne((request) => request.url === URL_BASE);
  });

  it('when the trip cannot be read it says so with "Riprova", which reads the trip again', async () => {
    const fixture = TestBed.createComponent(TripDrawer);
    document.body.appendChild(fixture.nativeElement);
    TestBed.inject(BackofficeTripsFacade).openTrip(ended.id);
    await settle(fixture);

    http
      .expectOne(`${URL_BASE}/${ended.id}`)
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    const notice = el(fixture).querySelector('app-notice')!;

    expect(text(notice)).toContain('Si è verificato un errore. Riprova tra poco.');
    http.expectNone((request) => request.url === URL_BASE);
    const retry = Array.from(notice.querySelectorAll('button')).find(
      (button) => text(button) === 'Riprova',
    )!;
    retry.click();
    await settle(fixture);
    http.expectOne(`${URL_BASE}/${ended.id}`).flush(ended);
    await settle(fixture);

    expect(el(fixture).querySelector('app-notice')).toBeNull();
    expect(text(el(fixture).querySelector('.pt-drawer__head .pt-title'))).toBe('Viaggio n. 1250');
  });
  describe('documents section', () => {
    const FILE_URL = `${URL_BASE}/t1/attachments`;
    const at = (hour: number, minute: number) => new Date(2026, 10, 28, hour, minute).toISOString();
    const withDocuments: TripDetail = {
      ...ended,
      documents: [
        {
          document: 'DeliveryNote',
          required: true,
          attachments: [
            { id: 'a1', fileKind: 'Jpeg', addedAt: at(7, 41) },
            { id: 'a2', fileKind: 'Jpeg', addedAt: at(7, 42) },
          ],
        },
        { document: 'WasteForm', required: true, attachments: [] },
        {
          document: 'DeliverySlip',
          required: false,
          attachments: [{ id: 'a3', fileKind: 'Pdf', addedAt: at(9, 20) }],
        },
      ],
    };
    let revokeUrl: ReturnType<typeof vi.fn<(url: string) => void>>;

    beforeEach(() => {
      let count = 0;
      revokeUrl = vi.fn<(url: string) => void>();
      vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:file-${++count}`);
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeUrl);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const section = (element: HTMLElement) =>
      Array.from(element.querySelectorAll('p.pt-label')).find(
        (label) => text(label) === 'Documenti',
      )?.parentElement ?? undefined;

    it('shows each document with its pill, the thumbnails and the PDF line of its files', async () => {
      const fixture = await open(withDocuments);
      http.expectOne(`${FILE_URL}/a1/file`).flush(new Blob(['1'], { type: 'image/jpeg' }));
      http.expectOne(`${FILE_URL}/a2/file`).flush(new Blob(['2'], { type: 'image/jpeg' }));
      await settle(fixture);
      const documents = section(el(fixture))!;

      expect(Array.from(documents.querySelectorAll('strong')).map(text)).toEqual([
        'DDT',
        'Formulario rifiuti',
        'Bolla',
      ]);
      expect(Array.from(documents.querySelectorAll('.pt-pill')).map(text)).toEqual([
        'Richiesto',
        'Richiesto · mancante',
      ]);
      expect(documents.querySelector('.pt-pill--success')).not.toBeNull();
      expect(documents.querySelector('.pt-pill--warn')).not.toBeNull();
      expect(documents.querySelectorAll('.pt-thumb')).toHaveLength(2);
      expect(Array.from(documents.querySelector('.pt-file')!.children).map(text)).toEqual([
        '',
        'PDF 1',
        '28/11 09:20',
      ]);
      expect(documents.querySelector('a')).toBeNull();
    });

    it('says "Nessuno richiesto e nessuno allegato." when there is nothing', async () => {
      const fixture = await open(ended);

      expect(text(section(el(fixture))!.querySelector('p.pt-muted'))).toBe(
        'Nessuno richiesto e nessuno allegato.',
      );
    });

    it('shows no section for a planned trip', async () => {
      const fixture = await open(planned(3, '2026-12-02'));

      expect(section(el(fixture))).toBeUndefined();
    });

    it('shows a trip in progress with the documents its contract requires', async () => {
      const fixture = await open({
        ...inProgress,
        id: 't1',
        documents: [{ document: 'DeliveryNote', required: true, attachments: [] }],
      });

      expect(text(section(el(fixture))!.querySelector('.pt-pill--warn'))).toBe(
        'Richiesto · mancante',
      );
    });
    it('releases the object URLs when the drawer goes away', async () => {
      const fixture = await open({ ...withDocuments, documents: [withDocuments.documents[0]] });
      http.expectOne(`${FILE_URL}/a1/file`).flush(new Blob(['1']));
      http.expectOne(`${FILE_URL}/a2/file`).flush(new Blob(['2']));
      await settle(fixture);

      fixture.destroy();

      expect(revokeUrl).toHaveBeenCalledWith('blob:file-1');
      expect(revokeUrl).toHaveBeenCalledWith('blob:file-2');
    });

    it('releases the object URLs when the drawer changes trip', async () => {
      const fixture = await open({ ...withDocuments, documents: [withDocuments.documents[0]] });
      http.expectOne(`${FILE_URL}/a1/file`).flush(new Blob(['1']));
      http.expectOne(`${FILE_URL}/a2/file`).flush(new Blob(['2']));
      await settle(fixture);
      expect(revokeUrl).not.toHaveBeenCalled();

      TestBed.inject(BackofficeTripsFacade).openTrip('t9');
      await settle(fixture);

      expect(revokeUrl).toHaveBeenCalledWith('blob:file-1');
      expect(revokeUrl).toHaveBeenCalledWith('blob:file-2');
      http.expectOne(`${URL_BASE}/t9`);
    });

    it('tells a file that could not be opened with the generic notice in the section, for that trip only', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null);
      const fixture = await open({ ...withDocuments, documents: [withDocuments.documents[2]] });
      expect(section(el(fixture))!.querySelector('app-notice')).toBeNull();

      el(fixture).querySelector<HTMLElement>('.pt-file')!.click();
      await settle(fixture);

      expect(text(section(el(fixture))!.querySelector('app-notice'))).toBe(
        'Si è verificato un errore. Riprova tra poco.',
      );
      http.expectNone(`${FILE_URL}/a3/file`);

      TestBed.inject(BackofficeTripsFacade).openTrip('t9');
      await settle(fixture);
      http.expectOne(`${URL_BASE}/t9`).flush({ ...withDocuments, id: 't9' });
      await settle(fixture);

      expect(section(el(fixture))!.querySelector('app-notice')).toBeNull();
    });

    it('forgets a notice about a file that could not be opened when the drawer shows another trip, and back again', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null);
      const withPdf = { ...withDocuments, documents: [withDocuments.documents[2]] };
      const fixture = await open(withPdf);
      el(fixture).querySelector<HTMLElement>('.pt-file')!.click();
      await settle(fixture);
      expect(section(el(fixture))!.querySelector('app-notice')).not.toBeNull();

      const facade = TestBed.inject(BackofficeTripsFacade);
      facade.openTrip('t9');
      await settle(fixture);
      http.expectOne(`${URL_BASE}/t9`).flush({ ...withPdf, id: 't9' });
      await settle(fixture);
      facade.openTrip('t1');
      await settle(fixture);
      http.expectOne(`${URL_BASE}/t1`).flush(withPdf);
      await settle(fixture);

      expect(section(el(fixture))!.querySelector('app-notice')).toBeNull();
    });

    it('removes the notice when a file opens afterwards', async () => {
      const tab = { opener: {} as unknown, location: { href: '' }, close: vi.fn() };
      vi.spyOn(window, 'open')
        .mockReturnValueOnce(null)
        .mockReturnValue(tab as unknown as Window);
      const fixture = await open({ ...withDocuments, documents: [withDocuments.documents[2]] });
      el(fixture).querySelector<HTMLElement>('.pt-file')!.click();
      await settle(fixture);
      expect(section(el(fixture))!.querySelector('app-notice')).not.toBeNull();

      el(fixture).querySelector<HTMLElement>('.pt-file')!.click();
      http.expectOne(`${FILE_URL}/a3/file`).flush(new Blob(['pdf']));
      await settle(fixture);

      expect(tab.location.href).toBe('blob:file-1');
      expect(section(el(fixture))!.querySelector('app-notice')).toBeNull();
    });
  });
});
