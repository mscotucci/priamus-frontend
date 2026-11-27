import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import localeIt from '@angular/common/locales/it';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BackofficeTrips } from './backoffice-trips';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Layout } from '../../../core/layout/layout';
import { stubModalDialog, stubPopover } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import type { TripDetail, TripListItem, TripListResponse } from './backoffice-trips-api';
import { BackofficeTripsFacade, currentMonth } from './backoffice-trips-facade';
import { TripList } from './trip-list';

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

const item = (overrides: Partial<TripListItem>): TripListItem => ({
  id: 't1',
  state: 'Ended',
  number: 1251,
  day: '2026-11-27',
  start: '08:00:00',
  end: '10:00:00',
  addedAt: '2026-11-27T06:00:00Z',
  daysToExpiry: null,
  customer: { id: 'c1', companyName: 'Edilcave SpA', vatNumber: null },
  pickup: place('p1', 'Magazzino centrale'),
  delivery: place('p2', 'Cantiere A14'),
  driver: { id: 'd1', firstName: 'Marco', lastName: 'Di Lauro' },
  vehicle: vehicle('v1', 'PE-482-WF'),
  trailer: null,
  measureKind: 'Weight',
  quantity: 3520,
  unitPrice: 120,
  total: 422.4,
  nightPriceApplied: false,
  ...overrides,
});

const ended: TripListItem[] = [
  item({}),
  item({
    id: 't2',
    number: 1250,
    customer: { id: 'c2', companyName: 'Comune di Penne', vatNumber: null },
    pickup: null,
    delivery: null,
    driver: { id: 'd2', firstName: 'Franco', lastName: 'Esposito' },
    vehicle: vehicle('v2', 'PE-117-MR'),
    trailer: vehicle('v3', 'AB-29104'),
    measureKind: 'StartAndEnd',
    quantity: 330,
    unitPrice: 52,
    total: 331,
    nightPriceApplied: true,
  }),
  item({
    id: 't3',
    number: 1247,
    day: '2026-11-26',
    customer: { id: 'c3', companyName: 'Vivai Pedemontani', vatNumber: null },
    pickup: null,
    delivery: place('p3', 'Discarica Cerratina'),
    measureKind: 'StartOnly',
    quantity: null,
    unitPrice: 180,
    total: 180,
  }),
  item({
    id: 't4',
    number: 1246,
    customer: { id: 'c4', companyName: 'Cave Nord', vatNumber: null },
    measureKind: 'Distance',
    quantity: 120,
    unitPrice: 2.5,
    total: 300,
  }),
];

const response = (
  trips: TripListItem[],
  total = trips.length,
  figures: TripListResponse['figures'] = { trips: 128, customers: 17, amount: 38412.5 },
): TripListResponse => ({
  trips: {
    data: trips,
    totalCount: total,
    page: 1,
    pageSize: 20,
    totalPages: Math.max(1, Math.ceil(total / 20)),
    hasNextPage: false,
    hasPreviousPage: false,
  },
  figures,
});

const inProgress = item({
  id: 'p1',
  state: 'InProgress',
  number: null,
  day: '2026-11-27',
  start: '14:05:00',
  end: null,
  measureKind: null,
  quantity: null,
  unitPrice: null,
  total: null,
  nightPriceApplied: null,
});

const planned = (id: string, daysToExpiry: number): TripListItem =>
  item({
    id,
    state: 'Planned',
    number: null,
    day: null,
    start: null,
    end: null,
    addedAt: '2026-11-21T09:00:00Z',
    daysToExpiry,
    measureKind: null,
    quantity: null,
    unitPrice: null,
    total: null,
    nightPriceApplied: null,
  });

const detail = (trip: TripListItem): TripDetail => ({
  ...trip,
  endedOn: trip.day,
  expiresOn: null,
  requiredDocuments: [],
  calculation: null,
});

describe('TripList', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    stubPopover();
    stubModalDialog();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const render = () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        BackofficeTripsFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'it' },
        { provide: Layout, useValue: {} },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TripList);
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
  };

  const flushList = async (fixture: ReturnType<typeof render>, body: TripListResponse) => {
    http.expectOne((request) => request.url === URL).flush(body);
    await settle(fixture);
  };

  /** The filter menus read the Registry only once something is searched in them. */
  const flushOptions = async (fixture: ReturnType<typeof render>) => {
    http.expectNone((request) => request.url.startsWith('/api/registry/'));
    await settle(fixture);
  };

  /** Renders the page with the registry options and the first list answer already given. */
  const open = async (body: TripListResponse = response(ended, 128)) => {
    const fixture = render();
    await flushOptions(fixture);
    await flushList(fixture, body);
    return fixture;
  };

  const el = (fixture: ReturnType<typeof render>) => fixture.nativeElement as HTMLElement;

  const text = (element: Element | null | undefined) =>
    element?.textContent?.replace(/\s+/g, ' ').trim();

  const rowCells = (element: HTMLElement, row: number) =>
    Array.from(element.querySelectorAll('tbody tr')[row].querySelectorAll('td')).map(text);

  const headers = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('thead th')).map(text);

  const chip = (element: HTMLElement, label: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('.pt-view')).find(
      (button) => text(button) === label,
    )!;

  const filterChips = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('main > .pt-card .pt-filter__button')).map(text);

  const params = (request: ReturnType<HttpTestingController['expectOne']>) =>
    Object.fromEntries(
      request.request.params.keys().map((key) => [key, request.request.params.get(key)]),
    );

  const nextList = (fixture: ReturnType<typeof render>) => {
    TestBed.tick();
    fixture.detectChanges();
    return http.expectOne((request) => request.url === URL);
  };

  it('three view chips with no count, "Conclusi" selected on opening', async () => {
    const fixture = await open();
    const chips = Array.from(el(fixture).querySelectorAll<HTMLButtonElement>('.pt-view'));

    expect(chips.map(text)).toEqual(['Conclusi', 'In corso', 'Da fare']);
    expect(chips.map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ]);
  });

  it('the top bar says "Operatività", "Viaggi" and the period with the count of the selection', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 27, 10) });
    const fixture = await open();
    const element = el(fixture);

    expect(element.querySelector('.pt-breadcrumb')?.textContent?.trim()).toBe('Operatività');
    expect(element.querySelector('h1')?.textContent).toBe('Viaggi');
    expect(element.querySelector('.pt-topbar__heading .pt-muted')?.textContent).toBe(
      'Novembre 2026 · 128 viaggi',
    );
    expect(element.querySelector('.pt-view')).not.toBeNull();
    expect(element.querySelector('.pt-stat')).not.toBeNull();
    expect(element.querySelector('main > .pt-card .pt-search')).not.toBeNull();
    expect(element.querySelector('tbody')).not.toBeNull();
  });

  it('the list opens on the current month and its period chip names it', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 27, 10) });
    const fixture = render();
    await flushOptions(fixture);
    const month = currentMonth();
    const request = http.expectOne((r) => r.url === URL);

    expect(params(request)).toMatchObject({ view: 'Ended', from: month.from, to: month.to });
    expect(month).toEqual({ from: '2026-11-01', to: '2026-11-30' });

    request.flush(response(ended, 4));
    await settle(fixture);

    expect(filterChips(el(fixture))[0]).toBe('Periodo: Novembre 2026');
  });

  it('the three figures and the footer total come from the response, not from the rows', async () => {
    const fixture = await open();
    const element = el(fixture);
    const stats = Array.from(element.querySelectorAll('.pt-stat')).map(text);

    expect(stats).toEqual(['Viaggi128', 'Clienti17', 'Importo totale38.412,50 €']);
    expect(element.querySelector('.pt-stat--highlight')?.textContent).toContain('Importo totale');
    expect(text(element.querySelector('tfoot tr'))).toBe(
      'Totale dei 128 viaggi selezionati38.412,50 €',
    );
    expect(text(element.querySelector('tfoot .pt-label'))).toBe('Viaggi 1–20 di 128');
  });

  it('the footer total of a single trip is in the singular', async () => {
    const fixture = await open(response([item({})], 1, { trips: 1, customers: 1, amount: 422.4 }));

    expect(text(el(fixture).querySelector('tfoot tr'))).toBe(
      'Totale del viaggio selezionato422,40 €',
    );
  });

  it('"Conclusi" lists its columns and formats each trip', async () => {
    const fixture = await open();
    const element = el(fixture);

    expect(headers(element)).toEqual([
      'N.',
      'Data',
      'Cliente',
      'Luoghi',
      'Autista',
      'Mezzo',
      'Quantità',
      'Tariffa',
      'Importo',
    ]);
    expect(rowCells(element, 0)).toEqual([
      '1251',
      '27/11',
      'Edilcave SpA',
      'Magazzino centrale → Cantiere A14',
      'M. Di Lauro',
      'PE-482-WF',
      '3.520 kg',
      '120,00 €/ton',
      '422,40 €',
    ]);
    expect(rowCells(element, 1)).toEqual([
      '1250',
      '27/11',
      'Comune di Penne',
      '—Nessun luogo',
      'F. Esposito',
      'PE-117-MR + AB-29104',
      '5 h 30 min',
      '52,00 €/h Notte',
      '331,00 €',
    ]);
    expect(rowCells(element, 2).slice(3, 4)).toEqual(['Discarica Cerratina']);
    expect(rowCells(element, 2).slice(6)).toEqual(['1 viaggio', '180,00 €', '180,00 €']);
    expect(rowCells(element, 3).slice(6)).toEqual(['120 km', '2,50 €/km', '300,00 €']);
    expect(text(element.querySelector('main > p.pt-muted'))).toBe(
      'Importi calcolati con la tariffa del giorno del viaggio.',
    );
  });

  it('the pill "Notte" shows beside the rate of a trip priced at night, only there', async () => {
    const fixture = await open();
    const pills = Array.from(el(fixture).querySelectorAll('tbody .pt-pill'));

    expect(pills.map(text)).toEqual(['Notte']);
    expect(pills[0].closest('tr')?.querySelector('td')?.textContent?.trim()).toBe('1250');
  });

  it('the trip number opens the trip', async () => {
    const fixture = await open();
    const facade = TestBed.inject(BackofficeTripsFacade);
    const link = el(fixture).querySelector<HTMLButtonElement>('tbody .pt-link')!;

    expect(link.getAttribute('aria-describedby')).toBe('trip-t1');
    expect(el(fixture).querySelector('#trip-t1')?.textContent?.trim()).toBe('Edilcave SpA');

    link.click();
    TestBed.tick();
    expect(facade.openTripId()).toBe('t1');
    http.expectOne(`${URL}/t1`);
  });

  it('the trip number opens the trip in a drawer over the list', async () => {
    const fixture = await open();
    el(fixture).querySelector<HTMLButtonElement>('tbody .pt-link')!.click();
    TestBed.tick();
    http.expectOne(`${URL}/t1`).flush(detail(ended[0]));
    await settle(fixture);

    expect(text(el(fixture).querySelector('app-trip-drawer .pt-title'))).toBe('Viaggio n. 1251');
    expect(el(fixture).querySelectorAll('tbody tr')).toHaveLength(ended.length);
  });

  it('closing the drawer returns to the list with its search, sort, page and view unchanged, not read again', async () => {
    const fixture = await open(response(ended, 41));
    const facade = TestBed.inject(BackofficeTripsFacade);
    const field = el(fixture).querySelector<HTMLInputElement>('main > .pt-card .pt-search input')!;
    field.value = 'edil';
    field.dispatchEvent(new Event('input'));
    await new Promise<void>((resolve) => setTimeout(resolve, 350));
    nextList(fixture).flush(response(ended, 41));
    await settle(fixture);
    const amountHeader = () =>
      Array.from(el(fixture).querySelectorAll('thead th')).find(
        (th) => text(th.querySelector('button')) === 'Importo',
      )!;
    amountHeader().querySelector('button')!.click();
    nextList(fixture).flush(response(ended, 41));
    await settle(fixture);
    expect(amountHeader().getAttribute('aria-sort')).toBe('ascending');
    Array.from(el(fixture).querySelectorAll<HTMLButtonElement>('tfoot button'))
      .find((button) => text(button) === 'Successiva')!
      .click();
    nextList(fixture).flush(response(ended, 41));
    await settle(fixture);
    el(fixture).querySelector<HTMLButtonElement>('tbody .pt-link')!.click();
    TestBed.tick();
    http.expectOne(`${URL}/t1`).flush(detail(ended[0]));
    await settle(fixture);

    el(fixture)
      .querySelector<HTMLButtonElement>('app-trip-drawer .pt-drawer__head button')!
      .click();
    await settle(fixture);

    expect(el(fixture).querySelector('app-trip-drawer')).toBeNull();
    expect(facade.openTripId()).toBeNull();
    expect(facade.page()).toBe(2);
    expect(facade.view()).toBe('Ended');
    expect(field.value).toBe('edil');
    expect(facade.search()).toBe('edil');
    expect(amountHeader().getAttribute('aria-sort')).toBe('ascending');
    expect(el(fixture).querySelectorAll('tbody tr')).toHaveLength(ended.length);
    http.expectNone((request) => request.url === URL);
  });

  it('the four filters are searchable menus fed by the Registry, read only once something is searched', async () => {
    const fixture = render();
    http.expectNone((request) => request.url.startsWith('/api/registry/'));
    await flushList(fixture, response(ended, 4));
    const element = el(fixture);

    expect(element.querySelectorAll('main > .pt-card app-search-filter-menu')).toHaveLength(4);
    expect(element.querySelectorAll('main > .pt-card app-filter-menu')).toHaveLength(1);
    expect(filterChips(element).slice(1)).toEqual([
      'Cliente: tutti',
      'Autista: tutti',
      'Mezzo: tutti',
      'Luogo: tutti',
      'Modalità: tutti',
    ]);
    expect(filterChips(element)[0]).toMatch(/^Periodo: /);
  });

  it('picking a customer found by the search filters the list by it and its label shows on the chip', async () => {
    const fixture = render();
    await flushList(fixture, response(ended, 4));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const element = el(fixture);
    const menu = element.querySelector('app-search-filter-menu')!;
    const field = menu.querySelector<HTMLInputElement>('input[type="search"]')!;

    field.value = 'edil';
    field.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    TestBed.tick();
    const search = http.expectOne((request) => request.url === '/api/registry/customers');
    expect(search.request.params.get('search')).toBe('edil');
    expect(search.request.params.has('status')).toBe(false);
    search.flush({ data: [{ id: 'c1', companyName: 'Edilcave SpA' }] });
    await settle(fixture);
    const options = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="option"]'));

    expect(options.map(text)).toEqual(['Tutti', 'Edilcave SpA']);

    options[1].click();
    const request = nextList(fixture);
    expect(params(request)['customerId']).toBe('c1');
    request.flush(response([ended[0]], 1));
    await settle(fixture);

    expect(text(menu.querySelector('.pt-filter__button'))).toBe('Cliente: Edilcave SpA');
  });

  it('the mode menu offers "A ore", "A peso", "A km" and "A viaggio"', async () => {
    const fixture = await open();
    const menu = el(fixture).querySelector('main > .pt-card app-filter-menu')!;

    expect(Array.from(menu.querySelectorAll('[role="option"]')).map(text)).toEqual([
      'Tutti',
      'A ore',
      'A peso',
      'A km',
      'A viaggio',
    ]);
  });

  it('typing in the search reloads the list from the server with the text', async () => {
    const fixture = await open();
    const field = el(fixture).querySelector<HTMLInputElement>('main > .pt-card .pt-search input')!;

    expect(field.getAttribute('placeholder')).toBe('Cerca numero, cliente, luogo, targa…');

    field.value = 'edil';
    field.dispatchEvent(new Event('input'));
    http.expectNone((request) => request.url === URL);
    await new Promise<void>((resolve) => setTimeout(resolve, 350));
    const request = nextList(fixture);

    expect(params(request)['search']).toBe('edil');
    expect(params(request)['page']).toBe('1');
    request.flush(response([ended[0]], 1));
  });

  it('ordered by day newest first; Data and Importo sort, the columns with a filter do not', async () => {
    const fixture = await open();
    const element = el(fixture);
    const sortable = Array.from(element.querySelectorAll('thead th')).filter((th) =>
      th.querySelector('button'),
    );

    expect(sortable.map(text)).toEqual(['Data', 'Importo']);
    expect(sortable[0].getAttribute('aria-sort')).toBe('descending');
    expect(sortable[1].getAttribute('aria-sort')).toBeNull();

    sortable[1].querySelector('button')!.click();
    const request = nextList(fixture);
    expect(params(request)).toMatchObject({ sortColumn: 'total', sortDirection: 'Ascending' });
    request.flush(response(ended, 128));
    await settle(fixture);

    const after = Array.from(element.querySelectorAll('thead th'));
    expect(after[1].getAttribute('aria-sort')).toBeNull();
    expect(after[8].getAttribute('aria-sort')).toBe('ascending');

    after[8].querySelector('button')!.click();
    expect(params(nextList(fixture))).toMatchObject({
      sortColumn: 'total',
      sortDirection: 'Descending',
    });
  });

  it('"In corso" has no period, no mode, no figures and no amount columns', async () => {
    const fixture = await open();
    const element = el(fixture);

    chip(element, 'In corso').click();
    const request = nextList(fixture);
    expect(params(request)['view']).toBe('InProgress');
    expect(params(request)['from']).toBeUndefined();
    expect(params(request)['mode']).toBeUndefined();
    request.flush(response([inProgress], 1, null));
    await settle(fixture);

    expect(chip(element, 'In corso').getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('.pt-stat')).toBeNull();
    expect(element.querySelector('tfoot .pt-num')).toBeNull();
    expect(filterChips(element)).toEqual([
      'Cliente: tutti',
      'Autista: tutti',
      'Mezzo: tutti',
      'Luogo: tutti',
    ]);
    expect(element.querySelector('app-period-menu')).toBeNull();
    expect(headers(element)).toEqual([
      'Iniziato',
      'Cliente',
      'Luoghi',
      'Autista',
      'Mezzo',
      'Azioni',
    ]);
    expect(rowCells(element, 0)).toEqual([
      '27/11 14:05',
      'Edilcave SpA',
      'Magazzino centrale → Cantiere A14',
      'M. Di Lauro',
      'PE-482-WF',
      'Dettaglio',
    ]);
    expect(text(element.querySelector('.pt-topbar__heading .pt-muted'))).toBe('1 viaggio');
    expect(element.querySelector('main > p.pt-muted')).toBeNull();
  });

  it('"Da fare" shows when each trip was added and when it expires, a warning within 1 day', async () => {
    const fixture = await open();
    const element = el(fixture);

    chip(element, 'Da fare').click();
    const request = nextList(fixture);
    expect(params(request)['view']).toBe('Planned');
    request.flush(
      response([planned('a', 7), planned('b', 1), planned('c', 0), planned('d', 2)], 4, null),
    );
    await settle(fixture);

    expect(headers(element)).toEqual([
      'Inserito',
      'Cliente',
      'Luoghi',
      'Autista',
      'Mezzo',
      'Scade',
      'Azioni',
    ]);
    expect(rowCells(element, 0).slice(0, 1)).toEqual(['21/11']);
    expect(rowCells(element, 0).slice(5)).toEqual(['tra 7 giorni', 'Dettaglio']);
    expect(rowCells(element, 1)[5]).toBe('tra 1 giorno');
    expect(rowCells(element, 2)[5]).toBe('oggi');
    expect(rowCells(element, 3)[5]).toBe('tra 2 giorni');
    const warned = Array.from(element.querySelectorAll('tbody .pt-pill--warn')).map(text);
    expect(warned).toEqual(['tra 1 giorno', 'oggi']);
    expect(element.querySelector('app-period-menu')).toBeNull();
    expect(element.querySelector('.pt-stat')).toBeNull();
  });

  it('"Dettaglio" opens the trip of its row', async () => {
    const fixture = await open();
    chip(el(fixture), 'Da fare').click();
    nextList(fixture).flush(response([planned('a', 7)], 1, null));
    await settle(fixture);

    el(fixture).querySelector<HTMLButtonElement>('tbody .pt-btn')!.click();
    TestBed.tick();

    expect(TestBed.inject(BackofficeTripsFacade).openTripId()).toBe('a');
    http.expectOne(`${URL}/a`);
  });

  it('a selection with no trip says "Nessun viaggio trovato"', async () => {
    const fixture = await open(response([], 0, { trips: 0, customers: 0, amount: 0 }));
    const empty = el(fixture).querySelector('.pt-empty');

    expect(text(empty)).toBe(
      'Nessun viaggio trovatoProva a cambiare il periodo, la ricerca o i filtri.',
    );
    expect(el(fixture).querySelector('table')).toBeNull();
  });

  it('while loading it shows the spinner, on failure a notice with "Riprova" that reads again', async () => {
    const fixture = render();
    await flushOptions(fixture);

    expect(text(el(fixture).querySelector('.pt-spinner')?.parentElement)).toBe(
      'Caricamento viaggi…',
    );

    http
      .expectOne((request) => request.url === URL)
      .flush({}, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    const notice = el(fixture).querySelector('app-notice')!;

    expect(text(notice)).toContain('Si è verificato un errore. Riprova tra poco.');
    const retry = Array.from(notice.querySelectorAll('button')).find(
      (button) => text(button) === 'Riprova',
    )!;
    retry.click();
    nextList(fixture).flush(response(ended, 4));
    await settle(fixture);

    expect(el(fixture).querySelector('app-notice')).toBeNull();
    expect(el(fixture).querySelectorAll('tbody tr')).toHaveLength(4);
  });

  it('the list does not read again by itself, only on a change of view, filter, sort or page', async () => {
    const fixture = await open();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    await settle(fixture);
    http.expectNone((request) => request.url === URL);

    const next = Array.from(el(fixture).querySelectorAll<HTMLButtonElement>('tfoot button')).find(
      (button) => text(button) === 'Successiva',
    )!;
    next.click();

    expect(params(nextList(fixture))['page']).toBe('2');
  });
});

@Component({ template: '' })
class Elsewhere {}

describe('TripList opened again', () => {
  it('opening "Viaggi" again reads the list again', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'other', component: Elsewhere },
          { path: '', component: BackofficeTrips, children: [{ path: '', component: TripList }] },
        ]),
        { provide: LOCALE_ID, useValue: 'it' },
        { provide: Layout, useValue: {} },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    const http = TestBed.inject(HttpTestingController);
    const isList = (request: { url: string }) => request.url === URL;

    const harness = await RouterTestingHarness.create('/');
    TestBed.tick();
    http.expectOne(isList).flush(response(ended, 4));
    await settle(harness.fixture);

    await harness.navigateByUrl('/other');
    http.expectNone(isList);
    await harness.navigateByUrl('/');
    TestBed.tick();
    harness.fixture.detectChanges();

    http.expectOne(isList);
  });
});
