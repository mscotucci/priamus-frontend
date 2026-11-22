import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Layout } from '../../../core/layout/layout';
import { stubModalDialog, stubPopover } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { Toast } from '../../../core/toast/toast';
import type { LocationListPage } from './locations-api';
import { LocationList } from './location-list';
import { LocationsFacade } from './locations-facade';

const URL = '/api/registry/locations';

const answer = (total: number): LocationListPage => ({
  data: [
    {
      id: '1',
      name: 'Cantiere A14',
      municipality: 'Chieti Scalo',
      address: 'Via Erasmo Piaggio, uscita Chieti-Pescara',
      status: 'Active',
      lastModifiedAt: '2026-11-20T12:00:00Z',
      version: 1,
    },
    {
      id: '2',
      name: 'Cantiere SP49',
      municipality: 'Spoltore',
      address: null,
      status: 'Deactivated',
      lastModifiedAt: '2026-10-02T12:00:00Z',
      version: 3,
    },
    {
      id: '3',
      name: 'Magazzino centrale',
      municipality: 'Pescara',
      address: 'Via Tiburtina Valeria 210',
      status: 'Active',
      lastModifiedAt: '2026-11-09T12:00:00Z',
      version: 2,
    },
  ],
  totalCount: total,
  page: 1,
  pageSize: 20,
  totalPages: 2,
  hasNextPage: true,
  hasPreviousPage: false,
});

const none: LocationListPage = { ...answer(0), data: [] };

describe('LocationList', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    stubPopover();
  });

  const render = () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        LocationsFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Layout, useValue: { openDrawer: () => undefined } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(LocationList);
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
  };

  const flush = async (fixture: ReturnType<typeof render>, body: LocationListPage) => {
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

  it('the top bar shows the section, the title, the count and "Nuovo luogo", the filter row and the table have their parts, and there are no stat cards or saved views', async () => {
    const fixture = render();
    await flush(fixture, answer(24));
    const element = fixture.nativeElement as HTMLElement;
    const { search, menus } = filterRow(element);

    expect(element.querySelector('.pt-breadcrumb')?.textContent?.trim()).toBe('Anagrafiche');
    expect(element.querySelector('h1')?.textContent).toBe('Luoghi');
    expect(element.querySelector('.pt-topbar__heading .pt-muted')?.textContent).toBe('24 luoghi');
    expect(element.querySelector('.pt-topbar__actions button')?.textContent?.trim()).toBe(
      'Nuovo luogo',
    );
    expect(search.getAttribute('placeholder')).toBe('Cerca nome, comune o indirizzo…');
    expect(search.getAttribute('maxlength')).toBe('100');
    expect(menus.map(chipText)).toEqual(['Stato: tutti']);
    expect(Array.from(element.querySelectorAll('th')).map((th) => th.textContent?.trim())).toEqual([
      'Nome',
      'Comune',
      'Indirizzo',
      'Stato',
      'Ultima modifica',
      'Azioni',
    ]);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(element.querySelector('.pt-stat')).toBeNull();
    expect(element.querySelector('[role="tablist"], .pt-tabs')).toBeNull();
  });

  it('one location is counted in the singular', async () => {
    const fixture = render();
    await flush(fixture, answer(1));

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.pt-topbar__heading .pt-muted')
        ?.textContent,
    ).toBe('1 luogo');
  });

  it('a missing address is a dash, the date has no time and the status is a pill, green for Attivo and red for Disattivato', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;
    const pill = (row: number) => rowCells(element, row)[3].querySelector('.pt-pill')!;

    expect(text(rowCells(element, 0)[2])).toBe('Via Erasmo Piaggio, uscita Chieti-Pescara');
    expect(text(rowCells(element, 1)[2])).toBe('—');
    expect(text(rowCells(element, 0)[4])).toBe('20/11/2026');
    expect(text(rowCells(element, 1)[4])).toBe('02/10/2026');
    expect(pill(0).textContent?.trim()).toBe('Attivo');
    expect(pill(0).classList.contains('pt-pill--success')).toBe(true);
    expect(pill(0).classList.contains('pt-pill--danger')).toBe(false);
    expect(pill(1).textContent?.trim()).toBe('Disattivato');
    expect(pill(1).classList.contains('pt-pill--danger')).toBe(true);
    expect(pill(1).classList.contains('pt-pill--success')).toBe(false);
  });

  it('every row has Modifica, an active location has Disattiva and a deactivated one Riattiva, each described by the name cell of its row', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;
    const buttons = (row: number) =>
      Array.from(rowCells(element, row)[5].querySelectorAll('button'));
    const descriptions = (row: number) =>
      buttons(row).map((b) =>
        element.querySelector(`[id="${b.getAttribute('aria-describedby')}"]`)?.textContent?.trim(),
      );

    expect(buttons(0).map((b) => b.textContent?.trim())).toEqual(['Modifica', 'Disattiva']);
    expect(buttons(1).map((b) => b.textContent?.trim())).toEqual(['Modifica', 'Riattiva']);
    expect(buttons(2).map((b) => b.textContent?.trim())).toEqual(['Modifica', 'Disattiva']);
    expect(descriptions(0)).toEqual(['Cantiere A14', 'Cantiere A14']);
    expect(descriptions(1)).toEqual(['Cantiere SP49', 'Cantiere SP49']);
  });

  it('with no location and no search or filter, "Nessun luogo in anagrafica" with the hint replaces the table', async () => {
    const fixture = render();
    await flush(fixture, none);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe(
      'Nessun luogo in anagrafica',
    );
    expect(element.querySelector('.pt-empty .pt-muted')?.textContent).toBe(
      'Aggiungi il primo con "Nuovo luogo".',
    );
    expect(element.querySelector('main > .pt-card:not(.pt-empty)')).toBeNull();
  });

  it('with locations but no match, "Nessun luogo trovato" replaces the table and the filter row shows "Azzera filtri"', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;
    pick(filterRow(element).menus[0], 1);
    TestBed.tick();
    await flush(fixture, none);

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe('Nessun luogo trovato');
    expect(filterRow(element).clear()).toBeDefined();
  });

  it('while the list loads a loading indicator replaces the table', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toBe('Luoghi');
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
    await flush(fixture, answer(3));

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('while the list is read again the table stays with a small indicator in the filter row', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;

    TestBed.inject(LocationsFacade).reload();
    TestBed.tick();
    fixture.detectChanges();

    expect(element.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
    expect(
      filterRow(element).row.querySelector('.pt-spinner--sm[role="status"]')?.textContent?.trim(),
    ).toBe('Aggiornamento…');
    http.expectOne((r) => r.url === URL).flush(answer(3));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('table')?.hasAttribute('aria-busy')).toBe(false);
    expect(element.querySelector('.pt-spinner')).toBeNull();
  });

  it('the status filter offers tutti, Attivo and Disattivato, starts on "tutti", applies at once on pick and "Tutti" removes it', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const { menus } = filterRow(fixture.nativeElement as HTMLElement);

    expect(chipText(menus[0])).toBe('Stato: tutti');
    expect(
      Array.from(menus[0].querySelectorAll('.pt-menu__item')).map((i) => i.textContent?.trim()),
    ).toEqual(['Tutti', 'Attivo', 'Disattivato']);

    pick(menus[0], 2);
    TestBed.tick();
    let request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('status')).toBe('Deactivated');
    request.flush(answer(3));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(chipText(menus[0])).toBe('Stato: Disattivato');

    pick(menus[0], 0);
    TestBed.tick();
    request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.has('status')).toBe(false);
    request.flush(answer(3));
  });

  it('typing sends one request with the text as typed after the delay and without Enter', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const { search } = filterRow(fixture.nativeElement as HTMLElement);
    const type = (value: string) => {
      search.value = value;
      search.dispatchEvent(new Event('input'));
    };

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      type('spo');
      vi.advanceTimersByTime(200);
      type('spolt');
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
    expect(requests[0].request.params.get('search')).toBe('spolt');
    requests[0].flush(answer(2));
  });

  it('"Azzera filtri" shows only while a search or filter is set and clears both', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;
    const { search, menus, clear } = filterRow(element);
    expect(clear()).toBeUndefined();

    pick(menus[0], 1);
    TestBed.tick();
    await flush(fixture, answer(3));
    TestBed.inject(LocationsFacade).setSearch('zz9');
    TestBed.tick();
    await flush(fixture, none);
    expect(clear()).toBeDefined();

    clear()!.click();
    TestBed.tick();
    const request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.has('search')).toBe(false);
    expect(request.request.params.has('status')).toBe(false);
    request.flush(answer(3));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(search.value).toBe('');
    expect(menus.map(chipText)).toEqual(['Stato: tutti']);
    expect(clear()).toBeUndefined();
  });

  it('the list opens sorted by name A to Z, asked of the backend', async () => {
    const fixture = render();
    const request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('sortColumn')).toBe('name');
    expect(request.request.params.get('sortDirection')).toBe('Ascending');
    request.flush(answer(3));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th')).map((th) =>
        th.getAttribute('aria-sort'),
      ),
    ).toEqual(['ascending', null, null, null, null, null]);
  });

  it('only Nome, Comune and Ultima modifica are sortable; the other headers are plain text', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const headers = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th'));

    expect(headers.map((th) => th.querySelector('button') !== null)).toEqual([
      true,
      true,
      false,
      false,
      true,
      false,
    ]);
    for (const index of [2, 3, 5]) {
      expect(headers[index].hasAttribute('aria-sort')).toBe(false);
    }
  });

  it.each([
    ['Nome', 0, 'name', 'Descending'],
    ['Comune', 1, 'municipality', 'Ascending'],
    ['Ultima modifica', 4, 'lastModifiedAt', 'Ascending'],
  ])(
    '%s sorts on the first click, inverts on the second and carries aria-sort',
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
      const inverted = firstDirection === 'Ascending' ? 'Descending' : 'Ascending';

      expect(await press()).toEqual([column, firstDirection]);
      expect(element.querySelectorAll('th')[index].getAttribute('aria-sort')).toBe(
        firstDirection.toLowerCase(),
      );
      expect(await press()).toEqual([column, inverted]);
      expect(element.querySelectorAll('th')[index].getAttribute('aria-sort')).toBe(
        inverted.toLowerCase(),
      );
    },
  );

  it('the footer shows the range and the pager, and the next page is asked of the backend', async () => {
    const fixture = render();
    await flush(fixture, answer(24));
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('tfoot .pt-label')?.textContent).toBe('Luoghi 1–20 di 24');
    expect(element.querySelector('tfoot .pt-paging .pt-muted')?.textContent).toBe('Pagina 1 di 2');
    const buttons = element.querySelectorAll<HTMLButtonElement>('tfoot button');
    expect(buttons[0].disabled).toBe(true);

    buttons[1].click();
    TestBed.tick();
    const request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ ...answer(24), page: 2, hasPreviousPage: true });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('tfoot .pt-label')?.textContent).toBe('Luoghi 21–24 di 24');
  });
  describe('location form dialog', () => {
    beforeEach(() => {
      stubModalDialog();
    });

    it('"Nuovo luogo" opens the creation dialog over the list, which keeps its search, filter, sorting and page', async () => {
      const fixture = render();
      await flush(fixture, answer(50));
      const element = fixture.nativeElement as HTMLElement;
      const facade = TestBed.inject(LocationsFacade);
      facade.setSearch('spolt');
      facade.setStatus('Active');
      facade.setSort('lastModifiedAt', 'Descending');
      TestBed.tick();
      await flush(fixture, answer(50));
      facade.setPage(2);
      TestBed.tick();
      await flush(fixture, answer(50));
      expect(element.querySelector('app-location-form-dialog')).toBeNull();

      element.querySelector<HTMLButtonElement>('.pt-topbar__actions button')!.click();
      fixture.detectChanges();
      TestBed.tick();

      const dialog = element.querySelector('app-location-form-dialog')!;
      expect(text(dialog.querySelector('.pt-title'))).toBe('Nuovo luogo');
      expect([
        facade.search(),
        facade.status(),
        facade.sortColumn(),
        facade.sortDirection(),
        facade.page(),
      ]).toEqual(['spolt', 'Active', 'lastModifiedAt', 'Descending', 2]);
      expect(element.querySelector('table')).not.toBeNull();
      http.expectNone((r) => r.url === URL);
    });

    it('"Modifica" of a row opens the dialog prefilled with that location', async () => {
      const fixture = render();
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;

      rowCells(element, 1)[5].querySelectorAll('button')[0].click();
      fixture.detectChanges();
      TestBed.tick();

      const dialog = element.querySelector('app-location-form-dialog')!;
      expect(text(dialog.querySelector('.pt-title'))).toBe('Modifica luogo');
      expect(dialog.querySelector<HTMLInputElement>('#location-name')!.value).toBe('Cantiere SP49');
      expect(dialog.querySelector<HTMLInputElement>('#location-municipality')!.value).toBe(
        'Spoltore',
      );
    });

    it('after a save the dialog closes and the table stays with the small indicator while the list reloads', async () => {
      const fixture = render();
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;
      rowCells(element, 0)[5].querySelectorAll('button')[0].click();
      fixture.detectChanges();
      TestBed.tick();

      element
        .querySelector('app-location-form-dialog form')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(fixture);
      http
        .expectOne((r) => r.method === 'PUT')
        .flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      expect(element.querySelector('app-location-form-dialog')).toBeNull();
      expect(element.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
      expect(element.querySelector('.pt-spinner--sm[role="status"]')).not.toBeNull();
      http.expectOne((r) => r.url === URL && r.method === 'GET').flush(answer(3));
    });
  });

  describe('deactivate and reactivate', () => {
    beforeEach(() => {
      stubModalDialog();
    });

    const actionButton = (element: HTMLElement, row: number, label: string) =>
      Array.from(rowCells(element, row)[5].querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === label,
      )!;
    const writes = () => http.match((r) => r.url.startsWith(URL) && r.method === 'POST');
    const conflict = {
      errorCode: 'Registry.Location.ConcurrentUpdate',
      detail: 'Il luogo è stato modificato da un altro utente nel frattempo.',
    };

    it('"Disattiva" of a row opens the confirmation for that location, and Annulla closes it', async () => {
      const fixture = render();
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;

      actionButton(element, 0, 'Disattiva').click();
      fixture.detectChanges();
      TestBed.tick();

      expect(text(element.querySelector('app-location-deactivate-dialog .pt-title'))).toBe(
        'Disattivare il luogo Cantiere A14, Chieti Scalo?',
      );
      expect(writes()).toHaveLength(0);

      element.querySelector<HTMLButtonElement>('.pt-dialog__actions button')!.click();
      fixture.detectChanges();
      expect(element.querySelector('app-location-deactivate-dialog')).toBeNull();
    });

    it('confirming sends the version of the row, closes the dialog, toasts, and the list is asked again keeping its state', async () => {
      const fixture = render();
      await flush(fixture, answer(50));
      const element = fixture.nativeElement as HTMLElement;
      const facade = TestBed.inject(LocationsFacade);
      facade.setSearch('cantiere');
      facade.setStatus('Active');
      facade.setSort('municipality', 'Descending');
      TestBed.tick();
      await flush(fixture, answer(50));
      facade.setPage(2);
      TestBed.tick();
      await flush(fixture, answer(50));

      actionButton(element, 0, 'Disattiva').click();
      fixture.detectChanges();
      TestBed.tick();
      element.querySelectorAll<HTMLButtonElement>('.pt-dialog__actions button')[1].click();
      fixture.detectChanges();
      const [post] = writes();
      expect(post.request.url).toBe(`${URL}/1/deactivate`);
      expect(post.request.body).toEqual({ version: 1 });
      post.flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      expect(element.querySelector('app-location-deactivate-dialog')).toBeNull();
      expect(TestBed.inject(Toast).current()).toBe('Luogo Cantiere A14, Chieti Scalo disattivato');
      const reload = http.expectOne((r) => r.url === URL);
      expect(reload.request.params.get('page')).toBe('2');
      expect(reload.request.params.get('search')).toBe('cantiere');
      expect(reload.request.params.get('status')).toBe('Active');
      expect(reload.request.params.get('sortColumn')).toBe('municipality');
      expect(reload.request.params.get('sortDirection')).toBe('Descending');
      const updated = answer(50);
      updated.data[0].status = 'Deactivated';
      reload.flush(updated);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(text(rowCells(element, 0)[3])).toBe('Disattivato');
      expect(text(rowCells(element, 0)[5].querySelectorAll('button')[1])).toBe('Riattiva');
    });

    it('"Riattiva" sends at once the version of the row, with no confirmation, and reads Riattivazione… while it runs', async () => {
      const fixture = render();
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;

      actionButton(element, 1, 'Riattiva').click();
      fixture.detectChanges();

      const [post] = writes();
      expect(post.request.url).toBe(`${URL}/2/reactivate`);
      expect(post.request.body).toEqual({ version: 3 });
      expect(element.querySelector('dialog')).toBeNull();
      const running = rowCells(element, 1)[5].querySelectorAll('button')[1];
      expect(running.textContent?.trim()).toBe('Riattivazione…');
      expect(running.getAttribute('aria-disabled')).toBe('true');
      http.match(() => true);
    });

    it('on success a toast names the location, the row shows Attivo and Disattiva', async () => {
      const fixture = render();
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 1, 'Riattiva').click();

      writes()[0].flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      expect(TestBed.inject(Toast).current()).toBe('Luogo Cantiere SP49, Spoltore riattivato');
      const updated = answer(3);
      updated.data[1].status = 'Active';
      http.expectOne((r) => r.url === URL).flush(updated);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(text(rowCells(element, 1)[3])).toBe('Attivo');
      expect(text(rowCells(element, 1)[5].querySelectorAll('button')[1])).toBe('Disattiva');
    });

    it('a refused "Riattiva" shows the detail in a notice above the table, and the next action on the list removes it', async () => {
      const fixture = render();
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 1, 'Riattiva').click();

      writes()[0].flush(
        { errorCode: 'Registry.Location.NotFound', detail: 'Luogo non trovato.' },
        { status: 404, statusText: 'Not Found' },
      );
      await settle(fixture);

      const notice = element.querySelector('main > .pt-notice--danger');
      expect(text(notice)).toBe('Luogo non trovato.');
      expect(element.querySelector('main')!.firstElementChild).toBe(notice);

      element.querySelector<HTMLButtonElement>('th button')!.click();
      fixture.detectChanges();

      expect(element.querySelector('main > .pt-notice--danger')).toBeNull();
      http.match(() => true);
    });

    it('a failure of "Riattiva" without a detail shows the generic message above the table', async () => {
      const fixture = render();
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 1, 'Riattiva').click();

      writes()[0].flush(null, { status: 500, statusText: 'Server Error' });
      await settle(fixture);

      expect(text(element.querySelector('main > .pt-notice--danger'))).toBe(
        'Si è verificato un errore. Riprova tra poco.',
      );
      http.match(() => true);
    });

    it('a 409 on "Riattiva" shows the message above the table and the list reloads keeping its page', async () => {
      const fixture = render();
      await flush(fixture, answer(50));
      const element = fixture.nativeElement as HTMLElement;
      TestBed.inject(LocationsFacade).setPage(2);
      TestBed.tick();
      await flush(fixture, answer(50));
      actionButton(element, 1, 'Riattiva').click();

      writes()[0].flush(conflict, { status: 409, statusText: 'Conflict' });
      await settle(fixture);

      expect(text(element.querySelector('main > .pt-notice--danger'))).toBe(conflict.detail);
      const reload = http.expectOne((r) => r.url === URL);
      expect(reload.request.params.get('page')).toBe('2');
      reload.flush(answer(50));
    });

    it('a 409 on "Disattiva" shows the message in the dialog, which stays open, and the list reloads keeping its page', async () => {
      const fixture = render();
      await flush(fixture, answer(50));
      const element = fixture.nativeElement as HTMLElement;
      TestBed.inject(LocationsFacade).setPage(2);
      TestBed.tick();
      await flush(fixture, answer(50));
      actionButton(element, 0, 'Disattiva').click();
      fixture.detectChanges();
      TestBed.tick();
      element.querySelectorAll<HTMLButtonElement>('.pt-dialog__actions button')[1].click();
      fixture.detectChanges();

      writes()[0].flush(conflict, { status: 409, statusText: 'Conflict' });
      await settle(fixture);

      expect(text(element.querySelector('app-location-deactivate-dialog .pt-notice--danger'))).toBe(
        conflict.detail,
      );
      const reload = http.expectOne((r) => r.url === URL);
      expect(reload.request.params.get('page')).toBe('2');
      reload.flush(answer(50));
    });

    it('a 409 on "Modifica" shows the message in the edit dialog, which stays open, and the list reloads keeping its page', async () => {
      const fixture = render();
      await flush(fixture, answer(50));
      const element = fixture.nativeElement as HTMLElement;
      TestBed.inject(LocationsFacade).setPage(2);
      TestBed.tick();
      await flush(fixture, answer(50));
      actionButton(element, 0, 'Modifica').click();
      fixture.detectChanges();
      TestBed.tick();
      element
        .querySelector('app-location-form-dialog form')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(fixture);

      http
        .expectOne((r) => r.method === 'PUT')
        .flush(conflict, { status: 409, statusText: 'Conflict' });
      await settle(fixture);

      expect(text(element.querySelector('app-location-form-dialog .pt-notice--danger'))).toBe(
        conflict.detail,
      );
      const reload = http.expectOne((r) => r.url === URL && r.method === 'GET');
      expect(reload.request.params.get('page')).toBe('2');
      reload.flush(answer(50));
    });
  });
});
