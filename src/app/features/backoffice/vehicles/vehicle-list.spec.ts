import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Layout } from '../../../core/layout/layout';
import { stubModalDialog, stubPopover } from '../../../core/testing/dom-testing';
import { Toast } from '../../../core/toast/toast';
import { settle } from '../../../core/testing/interaction-testing';
import type { VehiclePage } from './vehicles-api';
import { VehicleList } from './vehicle-list';
import { VehiclesFacade } from './vehicles-facade';

const URL = '/api/registry/vehicles';

const answer = (total: number): VehiclePage => ({
  data: [
    {
      id: '1',
      licensePlate: 'AB456CD',
      description: 'Iveco Stralis 480',
      type: 'Tractor',
      requiresTrailer: true,
      status: 'Active',
      lastModifiedAt: '2026-05-14T12:00:00Z',
      version: 1,
    },
    {
      id: '2',
      licensePlate: 'EF789GH',
      description: 'Volvo FH 500 scarrabile',
      type: 'Tractor',
      requiresTrailer: false,
      status: 'Active',
      lastModifiedAt: '2026-05-14T12:00:00Z',
      version: 1,
    },
    {
      id: '3',
      licensePlate: 'FG012HJ',
      description: 'Autospurgo Scania P410',
      type: 'StandaloneVehicle',
      requiresTrailer: false,
      status: 'Active',
      lastModifiedAt: '2026-09-02T12:00:00Z',
      version: 1,
    },
    {
      id: '4',
      licensePlate: 'XA123BC',
      description: 'Semirimorchio walking floor Kraker',
      type: 'Trailer',
      requiresTrailer: false,
      status: 'Active',
      lastModifiedAt: '2026-05-14T12:00:00Z',
      version: 1,
    },
    {
      id: '5',
      licensePlate: 'CZ334KL',
      description: 'Iveco Eurocargo cassonato',
      type: 'Tractor',
      requiresTrailer: false,
      status: 'Decommissioned',
      lastModifiedAt: '2026-11-03T12:00:00Z',
      version: 3,
    },
  ],
  totalCount: total,
  page: 1,
  pageSize: 20,
  totalPages: 2,
  hasNextPage: true,
  hasPreviousPage: false,
});

const none: VehiclePage = { ...answer(0), data: [] };

describe('VehicleList', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    stubPopover();
  });

  const render = () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        VehiclesFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Layout, useValue: { openDrawer: () => undefined } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = createFixture();
    return fixture;
  };

  const createFixture = () => {
    const fixture = TestBed.createComponent(VehicleList);
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
  };

  const flush = async (fixture: ReturnType<typeof render>, body: VehiclePage) => {
    http.expectOne((r) => r.url === URL).flush(body);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const text = (element: Element | null | undefined) =>
    element?.textContent?.replace(/\s+/g, ' ').trim();

  const rowCells = (element: HTMLElement, row: number) =>
    Array.from(element.querySelectorAll('tbody tr')[row].querySelectorAll('td'));

  const chipText = (menu: Element) => text(menu.querySelector('.pt-filter__button'));

  const pick = (menu: Element, index: number) =>
    menu.querySelectorAll<HTMLElement>('.pt-menu__item')[index].click();

  const filterRow = (element: HTMLElement) => {
    const row = element.querySelector('main > .pt-card')!;
    return {
      row,
      search: row.querySelector<HTMLInputElement>('.pt-search input')!,
      menus: Array.from(row.querySelectorAll('app-filter-menu')),
      clear: () =>
        Array.from(row.querySelectorAll('button')).find(
          (b) => b.textContent?.trim() === 'Azzera filtri',
        ),
    };
  };

  it('the top bar shows the section, the title, the count and "Nuovo mezzo", and the table has the seven columns', async () => {
    const fixture = render();
    await flush(fixture, answer(42));
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.pt-breadcrumb')?.textContent?.trim()).toBe('Anagrafiche');
    expect(element.querySelector('h1')?.textContent).toBe('Mezzi');
    expect(element.querySelector('.pt-topbar__heading .pt-muted')?.textContent).toBe('42 mezzi');
    expect(element.querySelector('.pt-topbar__actions button')?.textContent?.trim()).toBe(
      'Nuovo mezzo',
    );
    expect(Array.from(element.querySelectorAll('th')).map((th) => th.textContent?.trim())).toEqual([
      'Targa',
      'Descrizione',
      'Tipologia',
      'Rimorchio',
      'Stato',
      'Ultima modifica',
      'Azioni',
    ]);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(element.querySelector('.pt-stat')).toBeNull();
  });

  it('one vehicle is counted in the singular', async () => {
    const fixture = render();
    await flush(fixture, answer(1));

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.pt-topbar__heading .pt-muted')
        ?.textContent,
    ).toBe('1 mezzo');
  });

  it('the plate is monospace, the type is Italian and the date has no time', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const element = fixture.nativeElement as HTMLElement;

    expect(rowCells(element, 0)[0].querySelector('.pt-mono')?.textContent).toBe('AB456CD');
    expect([0, 1, 2, 3].map((row) => text(rowCells(element, row)[2]))).toEqual([
      'Motrice',
      'Motrice',
      'Autonomo',
      'Rimorchio',
    ]);
    expect(text(rowCells(element, 2)[5])).toBe('02/09/2026');
    expect(text(rowCells(element, 4)[5])).toBe('03/11/2026');
  });

  it('Rimorchio reads Obbligatorio or Facoltativo for a tractor and a dash otherwise', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const element = fixture.nativeElement as HTMLElement;

    expect([0, 1, 2, 3].map((row) => text(rowCells(element, row)[3]))).toEqual([
      'Obbligatorio',
      'Facoltativo',
      '—',
      '—',
    ]);
  });

  it('the status is a pill, green for Attivo and red for Dismesso', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const element = fixture.nativeElement as HTMLElement;
    const pill = (row: number) => rowCells(element, row)[4].querySelector('.pt-pill')!;

    expect(pill(0).textContent?.trim()).toBe('Attivo');
    expect(pill(0).classList.contains('pt-pill--success')).toBe(true);
    expect(pill(0).classList.contains('pt-pill--danger')).toBe(false);
    expect(pill(4).textContent?.trim()).toBe('Dismesso');
    expect(pill(4).classList.contains('pt-pill--danger')).toBe(true);
    expect(pill(4).classList.contains('pt-pill--success')).toBe(false);
  });

  it('every row has Modifica, an active vehicle has Dismetti and a decommissioned one Riattiva', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const element = fixture.nativeElement as HTMLElement;
    const actions = (row: number) =>
      Array.from(rowCells(element, row)[6].querySelectorAll('button')).map((b) =>
        b.textContent?.trim(),
      );

    expect(actions(0)).toEqual(['Modifica', 'Dismetti']);
    expect(actions(3)).toEqual(['Modifica', 'Dismetti']);
    expect(actions(4)).toEqual(['Modifica', 'Riattiva']);
  });

  it('every row button is described by the plate of its row', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const element = fixture.nativeElement as HTMLElement;
    const descriptions = (row: number) =>
      Array.from(rowCells(element, row)[6].querySelectorAll('button')).map((b) =>
        element.querySelector(`[id="${b.getAttribute('aria-describedby')}"]`)?.textContent?.trim(),
      );

    expect(descriptions(0)).toEqual(['AB456CD', 'AB456CD']);
    expect(descriptions(4)).toEqual([text(rowCells(element, 4)[0]), text(rowCells(element, 4)[0])]);
    expect(text(rowCells(element, 4)[0])).not.toBe('AB456CD');
  });

  it('with no vehicle and no search or filter, "Nessun mezzo in anagrafica" with the hint replaces the table', async () => {
    const fixture = render();
    await flush(fixture, none);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe(
      'Nessun mezzo in anagrafica',
    );
    expect(element.querySelector('.pt-empty .pt-muted')?.textContent).toBe(
      'Aggiungi il primo con "Nuovo mezzo".',
    );
    expect(element.querySelector('main > .pt-card:not(.pt-empty)')).toBeNull();
  });

  it('with vehicles but no match, "Nessun mezzo trovato" replaces the table and the filter row shows "Azzera filtri"', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const element = fixture.nativeElement as HTMLElement;
    pick(filterRow(element).menus[0], 2);
    TestBed.tick();
    await flush(fixture, none);

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe('Nessun mezzo trovato');
    expect(filterRow(element).clear()).toBeDefined();
  });

  it('while the list loads a loading indicator replaces the table', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toBe('Mezzi');
    expect(element.querySelector('.pt-spinner')).not.toBeNull();
    expect(element.querySelector('table')).toBeNull();
  });

  it('a failed load shows a danger notice with "Riprova" in place of the table, and "Riprova" loads again', async () => {
    const fixture = render();
    http.expectOne((r) => r.url === URL).flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('table')).toBeNull();
    const notice = element.querySelector('.pt-notice--danger')!;
    expect(notice.textContent).toContain('Si è verificato un errore. Riprova tra poco.');
    const retry = notice.querySelector('button')!;
    expect(retry.textContent?.trim()).toBe('Riprova');

    retry.click();
    TestBed.tick();
    await flush(fixture, answer(5));

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(5);
  });

  it('the filter row has the search and the type and status filters, status starting on "tutti"', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const { search, menus } = filterRow(fixture.nativeElement as HTMLElement);
    const items = (menu: Element) =>
      Array.from(menu.querySelectorAll('.pt-menu__item')).map((i) => i.textContent?.trim());

    expect(search.getAttribute('aria-label')).toBe('Cerca targa o descrizione');
    expect(menus.map(chipText)).toEqual(['Tipologia: tutti', 'Stato: tutti']);
    expect(items(menus[0])).toEqual(['Tutti', 'Motrice', 'Rimorchio', 'Autonomo']);
    expect(items(menus[1])).toEqual(['Tutti', 'Attivo', 'Dismesso']);
  });

  it('the search input is limited to 100 characters, the most the backend accepts', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const { search } = filterRow(fixture.nativeElement as HTMLElement);

    expect(search.getAttribute('maxlength')).toBe('100');
  });

  it('picking a type or a status asks the backend at once and "Tutti" removes the filter', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const { menus } = filterRow(fixture.nativeElement as HTMLElement);

    pick(menus[0], 2);
    TestBed.tick();
    let request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('type')).toBe('Trailer');
    request.flush(answer(5));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(chipText(menus[0])).toBe('Tipologia: Rimorchio');

    pick(menus[1], 2);
    TestBed.tick();
    request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('type')).toBe('Trailer');
    expect(request.request.params.get('status')).toBe('Decommissioned');
    request.flush(answer(5));
    await fixture.whenStable();
    fixture.detectChanges();

    pick(menus[0], 0);
    TestBed.tick();
    request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.has('type')).toBe(false);
    expect(request.request.params.get('status')).toBe('Decommissioned');
    request.flush(answer(5));
  });

  it('typing sends one request after the delay and without Enter', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const { search } = filterRow(fixture.nativeElement as HTMLElement);
    const type = (value: string) => {
      search.value = value;
      search.dispatchEvent(new Event('input'));
    };

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      type('a');
      vi.advanceTimersByTime(200);
      type('ab');
      TestBed.tick();
      http.expectNone((r) => r.url === URL);
      vi.advanceTimersByTime(299);
      TestBed.tick();
      http.expectNone((r) => r.url === URL);
      vi.advanceTimersByTime(1);
    } finally {
      vi.useRealTimers();
    }
    TestBed.tick();
    const requests = http.match((r) => r.url === URL);

    expect(requests).toHaveLength(1);
    requests[0].flush(answer(5));
  });

  it('the search text is sent as typed, the backend does the matching', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const { search } = filterRow(fixture.nativeElement as HTMLElement);

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      search.value = 'ab 456';
      search.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);
    } finally {
      vi.useRealTimers();
    }
    TestBed.tick();
    const request = http.expectOne((r) => r.url === URL);

    expect(request.request.params.get('search')).toBe('ab 456');
    request.flush(answer(1));
  });

  it('"Azzera filtri" shows only while a search or filter is set and clears all three', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const element = fixture.nativeElement as HTMLElement;
    const { search, menus, clear } = filterRow(element);
    expect(clear()).toBeUndefined();

    pick(menus[0], 1);
    TestBed.tick();
    await flush(fixture, answer(5));
    pick(menus[1], 1);
    TestBed.tick();
    await flush(fixture, answer(5));
    TestBed.inject(VehiclesFacade).setSearch('zz9');
    TestBed.tick();
    await flush(fixture, none);
    expect(clear()).toBeDefined();

    clear()!.click();
    TestBed.tick();
    const request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.has('search')).toBe(false);
    expect(request.request.params.has('type')).toBe(false);
    expect(request.request.params.has('status')).toBe(false);
    request.flush(answer(5));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(search.value).toBe('');
    expect(menus.map(chipText)).toEqual(['Tipologia: tutti', 'Stato: tutti']);
    expect(clear()).toBeUndefined();
  });

  it('the list opens sorted by plate A to Z, asked of the backend, 20 per page', async () => {
    const fixture = render();
    const request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('sortColumn')).toBe('licensePlate');
    expect(request.request.params.get('sortDirection')).toBe('Ascending');
    expect(request.request.params.get('pageSize')).toBe('20');
    request.flush(answer(5));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th')).map((th) =>
        th.getAttribute('aria-sort'),
      ),
    ).toEqual(['ascending', null, null, null, null, null, null]);
  });

  it('the footer shows the range and the pager, and the next page is asked of the backend', async () => {
    const fixture = render();
    await flush(fixture, answer(42));
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('tfoot .pt-label')?.textContent).toBe('Mezzi 1–20 di 42');
    expect(element.querySelector('tfoot .pt-paging .pt-muted')?.textContent).toBe('Pagina 1 di 3');
    const buttons = element.querySelectorAll<HTMLButtonElement>('tfoot button');
    expect(buttons[0].disabled).toBe(true);

    buttons[1].click();
    TestBed.tick();
    const request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ ...answer(42), page: 2, hasPreviousPage: true });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('tfoot .pt-label')?.textContent).toBe('Mezzi 21–40 di 42');
  });

  it('a header sorts by that column, pressed again inverts, and only the sorted header carries the direction', async () => {
    const fixture = render();
    await flush(fixture, answer(42));
    const element = fixture.nativeElement as HTMLElement;
    const sorts = () =>
      Array.from(element.querySelectorAll('th')).map((th) => th.getAttribute('aria-sort'));
    const press = async (direction: string) => {
      element.querySelectorAll('th')[5].querySelector('button')!.click();
      TestBed.tick();
      const request = http.expectOne((r) => r.url === URL);
      expect(request.request.params.get('sortColumn')).toBe('lastModifiedAt');
      expect(request.request.params.get('sortDirection')).toBe(direction);
      request.flush(answer(42));
      await fixture.whenStable();
      fixture.detectChanges();
    };

    await press('Ascending');
    expect(sorts()).toEqual([null, null, null, null, null, 'ascending', null]);
    await press('Descending');
    expect(sorts()).toEqual([null, null, null, null, null, 'descending', null]);
  });

  it('Tipologia, Rimorchio, Stato and the actions column are plain headers; Targa, Descrizione and Ultima modifica sort', async () => {
    const fixture = render();
    await flush(fixture, answer(5));
    const headers = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th'));

    expect(headers.map((th) => th.querySelector('button') !== null)).toEqual([
      true,
      true,
      false,
      false,
      false,
      true,
      false,
    ]);
    for (const index of [2, 3, 4, 6]) {
      expect(headers[index].hasAttribute('aria-sort')).toBe(false);
    }
  });

  it.each([
    ['Targa', 0, 'licensePlate', 'Descending'],
    ['Descrizione', 1, 'description', 'Ascending'],
    ['Ultima modifica', 5, 'lastModifiedAt', 'Ascending'],
  ])(
    '%s sorts on the first click and inverts on the second',
    async (_name, index, column, firstDirection) => {
      const fixture = render();
      await flush(fixture, answer(42));
      const element = fixture.nativeElement as HTMLElement;
      const press = async () => {
        element.querySelectorAll('th')[index].querySelector('button')!.click();
        TestBed.tick();
        const request = http.expectOne((r) => r.url === URL);
        const result = [
          request.request.params.get('sortColumn'),
          request.request.params.get('sortDirection'),
        ];
        request.flush(answer(42));
        await fixture.whenStable();
        fixture.detectChanges();
        return result;
      };

      expect(await press()).toEqual([column, firstDirection]);
      expect(await press()).toEqual([
        column,
        firstDirection === 'Ascending' ? 'Descending' : 'Ascending',
      ]);
    },
  );

  describe('vehicle form dialog', () => {
    beforeEach(() => {
      stubModalDialog();
    });

    it('"Nuovo mezzo" opens the creation dialog over the list, which keeps its search, filters, sorting and page', async () => {
      const fixture = render();
      await flush(fixture, answer(50));
      const element = fixture.nativeElement as HTMLElement;
      const facade = TestBed.inject(VehiclesFacade);
      facade.setType('Tractor');
      facade.setSort('description', 'Descending');
      TestBed.tick();
      await flush(fixture, answer(50));
      facade.setPage(2);
      TestBed.tick();
      await flush(fixture, answer(50));
      expect(element.querySelector('app-vehicle-form-dialog')).toBeNull();

      element.querySelector<HTMLButtonElement>('.pt-topbar__actions button')!.click();
      fixture.detectChanges();
      TestBed.tick();

      const dialog = element.querySelector('app-vehicle-form-dialog')!;
      expect(text(dialog.querySelector('.pt-title'))).toBe('Nuovo mezzo');
      expect([facade.type(), facade.sortColumn(), facade.sortDirection(), facade.page()]).toEqual([
        'Tractor',
        'description',
        'Descending',
        2,
      ]);
      expect(element.querySelector('table')).not.toBeNull();
      http.expectNone((r) => r.url === URL);
    });

    it('the "Modifica" of a row opens the dialog prefilled with that vehicle, and Annulla then a new open starts empty', async () => {
      const fixture = render();
      await flush(fixture, answer(5));
      const element = fixture.nativeElement as HTMLElement;

      Array.from(element.querySelectorAll('tbody tr'))[1]
        .querySelector<HTMLButtonElement>('button')!
        .click();
      fixture.detectChanges();
      TestBed.tick();

      expect(text(element.querySelector('app-vehicle-form-dialog .pt-title'))).toBe(
        'Modifica mezzo EF789GH',
      );
      expect(element.querySelector<HTMLInputElement>('#vehicle-plate')!.value).toBe('EF789GH');

      element.querySelector<HTMLButtonElement>('.pt-dialog__actions button')!.click();
      fixture.detectChanges();
      expect(element.querySelector('app-vehicle-form-dialog')).toBeNull();

      element.querySelector<HTMLButtonElement>('.pt-topbar__actions button')!.click();
      fixture.detectChanges();
      expect(element.querySelector<HTMLInputElement>('#vehicle-plate')!.value).toBe('');
    });
  });

  describe('decommission and reactivate', () => {
    beforeEach(() => {
      stubModalDialog();
    });

    const actionButton = (element: HTMLElement, row: number, label: string) =>
      Array.from(rowCells(element, row)[6].querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === label,
      )!;
    const writes = () => http.match((r) => r.url.startsWith(URL) && r.method === 'POST');

    it('"Dismetti" of a row opens the confirmation for that vehicle, and Annulla closes it', async () => {
      const fixture = render();
      await flush(fixture, answer(5));
      const element = fixture.nativeElement as HTMLElement;

      actionButton(element, 1, 'Dismetti').click();
      fixture.detectChanges();
      TestBed.tick();

      expect(text(element.querySelector('app-vehicle-decommission-dialog .pt-title'))).toBe(
        'Dismettere il mezzo EF789GH?',
      );
      expect(writes()).toHaveLength(0);

      element.querySelector<HTMLButtonElement>('.pt-dialog__actions button')!.click();
      fixture.detectChanges();
      expect(element.querySelector('app-vehicle-decommission-dialog')).toBeNull();
    });

    it('confirming sends the version of the row, closes the dialog, toasts, and the list is asked again keeping its page', async () => {
      const fixture = render();
      await flush(fixture, answer(50));
      const element = fixture.nativeElement as HTMLElement;
      const facade = TestBed.inject(VehiclesFacade);
      facade.setPage(2);
      TestBed.tick();
      await flush(fixture, answer(50));

      actionButton(element, 0, 'Dismetti').click();
      fixture.detectChanges();
      TestBed.tick();
      element.querySelectorAll<HTMLButtonElement>('.pt-dialog__actions button')[1].click();
      fixture.detectChanges();
      const [post] = writes();
      expect(post.request.url).toBe(`${URL}/1/decommission`);
      expect(post.request.body).toEqual({ version: 1 });
      post.flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      expect(element.querySelector('app-vehicle-decommission-dialog')).toBeNull();
      expect(TestBed.inject(Toast).current()).toBe('Mezzo AB456CD dismesso');
      const reload = http.expectOne((r) => r.url === URL);
      expect(reload.request.params.get('page')).toBe('2');
      reload.flush(answer(50));
    });

    it('while the list is read again after a write the table stays, with a small indicator at the end of the filters, and the row keeps its button', async () => {
      const fixture = render();
      await flush(fixture, answer(5));
      const element = fixture.nativeElement as HTMLElement;
      const opener = actionButton(element, 0, 'Dismetti');

      opener.click();
      fixture.detectChanges();
      TestBed.tick();
      element.querySelectorAll<HTMLButtonElement>('.pt-dialog__actions button')[1].click();
      fixture.detectChanges();
      writes()[0].flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      const reload = http.expectOne((r) => r.url === URL);
      const filters = element.querySelector('main > .pt-card')!;
      expect(element.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
      expect(filters.querySelector('.pt-spinner--sm[role="status"]')?.textContent?.trim()).toBe(
        'Aggiornamento…',
      );
      expect(element.contains(opener)).toBe(true);

      const updated = answer(5);
      updated.data[0].status = 'Decommissioned';
      reload.flush(updated);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element.querySelector('table')?.hasAttribute('aria-busy')).toBe(false);
      expect(element.querySelector('.pt-spinner')).toBeNull();
      // the same button now reactivates: the status change does not replace it
      expect(element.contains(opener)).toBe(true);
      expect(opener.textContent?.trim()).toBe('Riattiva');
    });

    it('"Riattiva" sends at once the version of the row, with no confirmation, and reads Riattivazione… while it runs', async () => {
      const fixture = render();
      await flush(fixture, answer(5));
      const element = fixture.nativeElement as HTMLElement;

      actionButton(element, 4, 'Riattiva').click();
      fixture.detectChanges();

      const [post] = writes();
      expect(post.request.url).toBe(`${URL}/5/reactivate`);
      expect(post.request.body).toEqual({ version: 3 });
      expect(element.querySelector('dialog')).toBeNull();
      const running = Array.from(rowCells(element, 4)[6].querySelectorAll('button')).pop()!;
      expect(running.textContent?.trim()).toBe('Riattivazione…');
      // aria-disabled, not disabled: the button keeps the focus while it runs
      expect(running.getAttribute('aria-disabled')).toBe('true');
      expect(running.disabled).toBe(false);
      http.match(() => true);
    });

    it('on success a toast names the plate and the list is asked again', async () => {
      const fixture = render();
      await flush(fixture, answer(5));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 4, 'Riattiva').click();

      writes()[0].flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      expect(TestBed.inject(Toast).current()).toBe('Mezzo CZ334KL riattivato');
      http.expectOne((r) => r.url === URL).flush(answer(5));
    });

    it('a refused "Riattiva" shows the detail in a notice above the table, the list reloads, and the next action on the list removes the notice', async () => {
      const fixture = render();
      await flush(fixture, answer(5));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 4, 'Riattiva').click();

      writes()[0].flush(
        {
          errorCode: 'Registry.Vehicle.ConcurrentUpdate',
          detail: 'Il mezzo è stato modificato da un altro utente nel frattempo.',
        },
        { status: 409, statusText: 'Conflict' },
      );
      await settle(fixture);

      const notice = element.querySelector('main > .pt-notice--danger');
      expect(text(notice)).toBe('Il mezzo è stato modificato da un altro utente nel frattempo.');
      expect(element.querySelector('main')!.firstElementChild).toBe(notice);
      await flush(fixture, answer(5));
      expect(actionButton(element, 4, 'Riattiva').disabled).toBe(false);

      element.querySelector<HTMLButtonElement>('th button')!.click();
      fixture.detectChanges();

      expect(element.querySelector('main > .pt-notice--danger')).toBeNull();
      http.match(() => true);
    });

    it('a failure without a detail shows the generic message above the table', async () => {
      const fixture = render();
      await flush(fixture, answer(5));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 4, 'Riattiva').click();

      writes()[0].flush(null, { status: 500, statusText: 'Server Error' });
      await settle(fixture);

      expect(text(element.querySelector('main > .pt-notice--danger'))).toBe(
        'Si è verificato un errore. Riprova tra poco.',
      );
      http.match(() => true);
    });
  });
});
