import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Layout } from '../../../core/layout/layout';
import { stubModalDialog, stubPopover } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { Toast } from '../../../core/toast/toast';
import type { CustomerPage } from './customers-api';
import { CustomerList } from './customer-list';
import { CustomersFacade } from './customers-facade';

const URL = '/api/registry/customers';

const answer = (total: number): CustomerPage => ({
  data: [
    {
      id: '1',
      companyName: 'Cantieri Edili Pescara S.r.l.',
      vatNumber: '01873420689',
      taxCode: null,
      address: 'Via Tiburtina Valeria 210, 65129 Pescara (PE)',
      status: 'Active',
      lastModifiedAt: '2026-05-14T12:00:00Z',
      version: 1,
    },
    {
      id: '2',
      companyName: 'Adriatic Logistics d.o.o.',
      vatNumber: null,
      taxCode: null,
      address: 'Obala 12, Spalato (HR)',
      status: 'Active',
      lastModifiedAt: '2026-11-09T12:00:00Z',
      version: 2,
    },
    {
      id: '3',
      companyName: 'Edilcave SpA',
      vatNumber: '01455280683',
      taxCode: null,
      address: null,
      status: 'Active',
      lastModifiedAt: '2026-09-02T12:00:00Z',
      version: 1,
    },
    {
      id: '4',
      companyName: 'Cantine Vestine S.r.l.',
      vatNumber: '02134760681',
      taxCode: null,
      address: "Contrada Fonte Ruccia 4, Città Sant'Angelo (PE)",
      status: 'Deactivated',
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

const none: CustomerPage = { ...answer(0), data: [] };

describe('CustomerList', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    stubPopover();
  });

  const render = () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        CustomersFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Layout, useValue: { openDrawer: () => undefined } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CustomerList);
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
  };

  const flush = async (fixture: ReturnType<typeof render>, body: CustomerPage) => {
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

  it('the top bar shows the section, the title, the count and "Nuovo cliente", the table has the five columns and the actions, and there are no stat cards', async () => {
    const fixture = render();
    await flush(fixture, answer(17));
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.pt-eyebrow')?.textContent).toBe('Anagrafiche · Clienti');
    expect(element.querySelector('h1')?.textContent).toBe('Clienti');
    expect(element.querySelector('.pt-topbar__heading .pt-muted')?.textContent).toBe('17 clienti');
    expect(element.querySelector('.pt-topbar__actions button')?.textContent?.trim()).toBe(
      'Nuovo cliente',
    );
    expect(Array.from(element.querySelectorAll('th')).map((th) => th.textContent?.trim())).toEqual([
      'Ragione sociale',
      'Partita IVA',
      'Sede',
      'Stato',
      'Ultima modifica',
      'Azioni',
    ]);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(element.querySelector('.pt-stat')).toBeNull();
  });

  it('one customer is counted in the singular', async () => {
    const fixture = render();
    await flush(fixture, answer(1));

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.pt-topbar__heading .pt-muted')
        ?.textContent,
    ).toBe('1 cliente');
  });

  it('the filter row has the search and the status filter starting on "tutti"', async () => {
    const fixture = render();
    await flush(fixture, answer(4));
    const { search, menus } = filterRow(fixture.nativeElement as HTMLElement);

    expect(search.getAttribute('placeholder')).toBe('Cerca nome, partita IVA o codice fiscale…');
    expect(search.getAttribute('maxlength')).toBe('100');
    expect(menus.map(chipText)).toEqual(['Stato: tutti']);
    expect(
      Array.from(menus[0].querySelectorAll('.pt-menu__item')).map((i) => i.textContent?.trim()),
    ).toEqual(['Tutti', 'Attivo', 'Disattivato']);
  });

  it('the VAT number is monospace, a missing VAT number or address is a dash, and the date has no time', async () => {
    const fixture = render();
    await flush(fixture, answer(4));
    const element = fixture.nativeElement as HTMLElement;

    expect(rowCells(element, 0)[1].querySelector('.pt-mono')?.textContent).toBe('01873420689');
    expect(text(rowCells(element, 1)[1])).toBe('—');
    expect(rowCells(element, 1)[1].querySelector('.pt-mono')).toBeNull();
    expect(text(rowCells(element, 2)[2])).toBe('—');
    expect(text(rowCells(element, 0)[2])).toBe('Via Tiburtina Valeria 210, 65129 Pescara (PE)');
    expect(text(rowCells(element, 1)[4])).toBe('09/11/2026');
    expect(text(rowCells(element, 3)[4])).toBe('03/11/2026');
  });

  it('the status is a pill, green for Attivo and red for Disattivato', async () => {
    const fixture = render();
    await flush(fixture, answer(4));
    const element = fixture.nativeElement as HTMLElement;
    const pill = (row: number) => rowCells(element, row)[3].querySelector('.pt-pill')!;

    expect(pill(0).textContent?.trim()).toBe('Attivo');
    expect(pill(0).classList.contains('pt-pill--success')).toBe(true);
    expect(pill(0).classList.contains('pt-pill--danger')).toBe(false);
    expect(pill(3).textContent?.trim()).toBe('Disattivato');
    expect(pill(3).classList.contains('pt-pill--danger')).toBe(true);
    expect(pill(3).classList.contains('pt-pill--success')).toBe(false);
  });

  it('every row has Modifica, an active customer has Disattiva and a deactivated one Riattiva', async () => {
    const fixture = render();
    await flush(fixture, answer(4));
    const element = fixture.nativeElement as HTMLElement;
    const actions = (row: number) =>
      Array.from(rowCells(element, row)[5].querySelectorAll('button')).map((b) =>
        b.textContent?.trim(),
      );

    expect(actions(0)).toEqual(['Modifica', 'Disattiva']);
    expect(actions(2)).toEqual(['Modifica', 'Disattiva']);
    expect(actions(3)).toEqual(['Modifica', 'Riattiva']);
  });

  it('every row button is described by the company name of its row', async () => {
    const fixture = render();
    await flush(fixture, answer(4));
    const element = fixture.nativeElement as HTMLElement;
    const descriptions = (row: number) =>
      Array.from(rowCells(element, row)[5].querySelectorAll('button')).map((b) =>
        element.querySelector(`[id="${b.getAttribute('aria-describedby')}"]`)?.textContent?.trim(),
      );

    expect(descriptions(0)).toEqual([text(rowCells(element, 0)[0]), text(rowCells(element, 0)[0])]);
    expect(descriptions(3)).toEqual([text(rowCells(element, 3)[0]), text(rowCells(element, 3)[0])]);
    expect(text(rowCells(element, 0)[0])).not.toBe(text(rowCells(element, 3)[0]));
  });

  it('with no customer and no search or filter, "Nessun cliente in anagrafica" with the hint replaces the table', async () => {
    const fixture = render();
    await flush(fixture, none);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe(
      'Nessun cliente in anagrafica',
    );
    expect(element.querySelector('.pt-empty .pt-muted')?.textContent).toBe(
      'Aggiungi il primo con "Nuovo cliente".',
    );
    expect(element.querySelector('main > .pt-card:not(.pt-empty)')).toBeNull();
  });

  it('with customers but no match, "Nessun cliente trovato" replaces the table and the filter row shows "Azzera filtri"', async () => {
    const fixture = render();
    await flush(fixture, answer(4));
    const element = fixture.nativeElement as HTMLElement;
    pick(filterRow(element).menus[0], 1);
    TestBed.tick();
    await flush(fixture, none);

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe(
      'Nessun cliente trovato',
    );
    expect(filterRow(element).clear()).toBeDefined();
  });

  it('while the list loads a loading indicator replaces the table', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toBe('Clienti');
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
    await flush(fixture, answer(4));

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(4);
  });

  it('picking a status asks the backend at once and "Tutti" removes the filter', async () => {
    const fixture = render();
    await flush(fixture, answer(4));
    const { menus } = filterRow(fixture.nativeElement as HTMLElement);

    pick(menus[0], 2);
    TestBed.tick();
    let request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('status')).toBe('Deactivated');
    request.flush(answer(4));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(chipText(menus[0])).toBe('Stato: Disattivato');

    pick(menus[0], 0);
    TestBed.tick();
    request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.has('status')).toBe(false);
    request.flush(answer(4));
  });

  it('typing sends one request with the text as typed after the delay and without Enter', async () => {
    const fixture = render();
    await flush(fixture, answer(4));
    const { search } = filterRow(fixture.nativeElement as HTMLElement);
    const type = (value: string) => {
      search.value = value;
      search.dispatchEvent(new Event('input'));
    };

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      type('pe');
      vi.advanceTimersByTime(200);
      type('it 0145');
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
    expect(requests[0].request.params.get('search')).toBe('it 0145');
    requests[0].flush(answer(1));
  });

  it('"Azzera filtri" shows only while a search or filter is set and clears both', async () => {
    const fixture = render();
    await flush(fixture, answer(4));
    const element = fixture.nativeElement as HTMLElement;
    const { search, menus, clear } = filterRow(element);
    expect(clear()).toBeUndefined();

    pick(menus[0], 1);
    TestBed.tick();
    await flush(fixture, answer(4));
    TestBed.inject(CustomersFacade).setSearch('zz9');
    TestBed.tick();
    await flush(fixture, none);
    expect(clear()).toBeDefined();

    clear()!.click();
    TestBed.tick();
    const request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.has('search')).toBe(false);
    expect(request.request.params.has('status')).toBe(false);
    request.flush(answer(4));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(search.value).toBe('');
    expect(menus.map(chipText)).toEqual(['Stato: tutti']);
    expect(clear()).toBeUndefined();
  });

  it('the list opens sorted by company name A to Z, asked of the backend, 20 per page', async () => {
    const fixture = render();
    const request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('sortColumn')).toBe('companyName');
    expect(request.request.params.get('sortDirection')).toBe('Ascending');
    expect(request.request.params.get('pageSize')).toBe('20');
    request.flush(answer(4));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th')).map((th) =>
        th.getAttribute('aria-sort'),
      ),
    ).toEqual(['ascending', null, null, null, null, null]);
  });

  it('only Ragione sociale and Ultima modifica are sortable; the other headers are plain text', async () => {
    const fixture = render();
    await flush(fixture, answer(4));
    const headers = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th'));

    expect(headers.map((th) => th.querySelector('button') !== null)).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
    ]);
    for (const index of [1, 2, 3, 5]) {
      expect(headers[index].hasAttribute('aria-sort')).toBe(false);
    }
  });

  it.each([
    ['Ragione sociale', 0, 'companyName', 'Descending'],
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
    await flush(fixture, answer(42));
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('tfoot .pt-label')?.textContent).toBe('Clienti 1–20 di 42');
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

    expect(element.querySelector('tfoot .pt-label')?.textContent).toBe('Clienti 21–40 di 42');
  });

  it('while the list is read again the table stays with a small indicator in the filter row', async () => {
    const fixture = render();
    await flush(fixture, answer(4));
    const element = fixture.nativeElement as HTMLElement;

    TestBed.inject(CustomersFacade).reload();
    TestBed.tick();
    fixture.detectChanges();

    expect(element.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
    expect(
      filterRow(element).row.querySelector('.pt-spinner--sm[role="status"]')?.textContent?.trim(),
    ).toBe('Aggiornamento…');
    http.expectOne((r) => r.url === URL).flush(answer(4));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('table')?.hasAttribute('aria-busy')).toBe(false);
    expect(element.querySelector('.pt-spinner')).toBeNull();
  });

  describe('customer form dialog', () => {
    beforeEach(() => {
      stubModalDialog();
    });

    it('"Nuovo cliente" opens the creation dialog over the list, which keeps its search, filter, sorting and page', async () => {
      const fixture = render();
      await flush(fixture, answer(50));
      const element = fixture.nativeElement as HTMLElement;
      const facade = TestBed.inject(CustomersFacade);
      facade.setSearch('edil');
      facade.setStatus('Active');
      facade.setSort('lastModifiedAt', 'Descending');
      TestBed.tick();
      await flush(fixture, answer(50));
      facade.setPage(2);
      TestBed.tick();
      await flush(fixture, answer(50));
      expect(element.querySelector('app-customer-form-dialog')).toBeNull();

      element.querySelector<HTMLButtonElement>('.pt-topbar__actions button')!.click();
      fixture.detectChanges();
      TestBed.tick();

      const dialog = element.querySelector('app-customer-form-dialog')!;
      expect(text(dialog.querySelector('.pt-title'))).toBe('Nuovo cliente');
      expect([
        facade.search(),
        facade.status(),
        facade.sortColumn(),
        facade.sortDirection(),
        facade.page(),
      ]).toEqual(['edil', 'Active', 'lastModifiedAt', 'Descending', 2]);
      expect(element.querySelector('table')).not.toBeNull();
      http.expectNone((r) => r.url === URL);
    });

    it('the "Modifica" of a row opens the dialog prefilled with that customer, and Annulla then a new open starts empty', async () => {
      const fixture = render();
      await flush(fixture, answer(4));
      const element = fixture.nativeElement as HTMLElement;

      Array.from(element.querySelectorAll('tbody tr'))[3]
        .querySelector<HTMLButtonElement>('button')!
        .click();
      fixture.detectChanges();
      TestBed.tick();

      expect(text(element.querySelector('app-customer-form-dialog .pt-title'))).toBe(
        'Modifica cliente',
      );
      expect(element.querySelector<HTMLInputElement>('#customer-name')!.value).toBe(
        'Cantine Vestine S.r.l.',
      );

      element.querySelector<HTMLButtonElement>('.pt-dialog__actions button')!.click();
      fixture.detectChanges();
      expect(element.querySelector('app-customer-form-dialog')).toBeNull();

      element.querySelector<HTMLButtonElement>('.pt-topbar__actions button')!.click();
      fixture.detectChanges();
      expect(element.querySelector<HTMLInputElement>('#customer-name')!.value).toBe('');
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

    it('"Disattiva" of a row opens the confirmation for that customer, and Annulla closes it', async () => {
      const fixture = render();
      await flush(fixture, answer(4));
      const element = fixture.nativeElement as HTMLElement;

      actionButton(element, 1, 'Disattiva').click();
      fixture.detectChanges();
      TestBed.tick();

      expect(text(element.querySelector('app-customer-deactivate-dialog .pt-title'))).toBe(
        'Disattivare il cliente Adriatic Logistics d.o.o.?',
      );
      expect(writes()).toHaveLength(0);

      element.querySelector<HTMLButtonElement>('.pt-dialog__actions button')!.click();
      fixture.detectChanges();
      expect(element.querySelector('app-customer-deactivate-dialog')).toBeNull();
    });

    it('confirming sends the version of the row, closes the dialog, toasts, and the list is asked again keeping its page', async () => {
      const fixture = render();
      await flush(fixture, answer(50));
      const element = fixture.nativeElement as HTMLElement;
      const facade = TestBed.inject(CustomersFacade);
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

      expect(element.querySelector('app-customer-deactivate-dialog')).toBeNull();
      expect(TestBed.inject(Toast).current()).toBe(
        'Cliente Cantieri Edili Pescara S.r.l. disattivato',
      );
      const reload = http.expectOne((r) => r.url === URL);
      expect(reload.request.params.get('page')).toBe('2');
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
      await flush(fixture, answer(4));
      const element = fixture.nativeElement as HTMLElement;

      actionButton(element, 3, 'Riattiva').click();
      fixture.detectChanges();

      const [post] = writes();
      expect(post.request.url).toBe(`${URL}/4/reactivate`);
      expect(post.request.body).toEqual({ version: 3 });
      expect(element.querySelector('dialog')).toBeNull();
      const running = rowCells(element, 3)[5].querySelectorAll('button')[1];
      expect(running.textContent?.trim()).toBe('Riattivazione…');
      expect(running.getAttribute('aria-disabled')).toBe('true');
      http.match(() => true);
    });

    it('on success a toast names the company, the row shows Attivo and Disattiva', async () => {
      const fixture = render();
      await flush(fixture, answer(4));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 3, 'Riattiva').click();

      writes()[0].flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      expect(TestBed.inject(Toast).current()).toBe('Cliente Cantine Vestine S.r.l. riattivato');
      const updated = answer(4);
      updated.data[3].status = 'Active';
      http.expectOne((r) => r.url === URL).flush(updated);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(text(rowCells(element, 3)[3])).toBe('Attivo');
      expect(text(rowCells(element, 3)[5].querySelectorAll('button')[1])).toBe('Disattiva');
    });

    it('a refused "Riattiva" shows the detail in a notice above the table, the list reloads, and the next action on the list removes the notice', async () => {
      const fixture = render();
      await flush(fixture, answer(4));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 3, 'Riattiva').click();

      writes()[0].flush(
        {
          errorCode: 'Registry.Customer.ConcurrentUpdate',
          detail: 'Il cliente è stato modificato da un altro utente nel frattempo.',
        },
        { status: 409, statusText: 'Conflict' },
      );
      await settle(fixture);

      const notice = element.querySelector('main > .pt-notice--danger');
      expect(text(notice)).toBe('Il cliente è stato modificato da un altro utente nel frattempo.');
      expect(element.querySelector('main')!.firstElementChild).toBe(notice);
      await flush(fixture, answer(4));

      element.querySelector<HTMLButtonElement>('th button')!.click();
      fixture.detectChanges();

      expect(element.querySelector('main > .pt-notice--danger')).toBeNull();
      http.match(() => true);
    });

    it('a failure without a detail shows the generic message above the table', async () => {
      const fixture = render();
      await flush(fixture, answer(4));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 3, 'Riattiva').click();

      writes()[0].flush(null, { status: 500, statusText: 'Server Error' });
      await settle(fixture);

      expect(text(element.querySelector('main > .pt-notice--danger'))).toBe(
        'Si è verificato un errore. Riprova tra poco.',
      );
      http.match(() => true);
    });

    it('a 409 on "Disattiva" shows the message in the dialog, which stays open, and the list reloads keeping its page', async () => {
      const fixture = render();
      await flush(fixture, answer(50));
      const element = fixture.nativeElement as HTMLElement;
      TestBed.inject(CustomersFacade).setPage(2);
      TestBed.tick();
      await flush(fixture, answer(50));
      actionButton(element, 0, 'Disattiva').click();
      fixture.detectChanges();
      TestBed.tick();
      element.querySelectorAll<HTMLButtonElement>('.pt-dialog__actions button')[1].click();
      fixture.detectChanges();

      writes()[0].flush(
        {
          errorCode: 'Registry.Customer.ConcurrentUpdate',
          detail: 'Il cliente è stato modificato da un altro utente nel frattempo.',
        },
        { status: 409, statusText: 'Conflict' },
      );
      await settle(fixture);

      expect(text(element.querySelector('app-customer-deactivate-dialog .pt-notice--danger'))).toBe(
        'Il cliente è stato modificato da un altro utente nel frattempo.',
      );
      const reload = http.expectOne((r) => r.url === URL);
      expect(reload.request.params.get('page')).toBe('2');
      reload.flush(answer(50));
    });
  });
});
