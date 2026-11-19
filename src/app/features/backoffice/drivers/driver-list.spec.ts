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
import { DriverList } from './driver-list';
import type { DriverListPage } from './drivers-api';
import { DriversFacade } from './drivers-facade';

const URL = '/api/registry/drivers';

const answer = (total: number): DriverListPage => ({
  data: [
    {
      id: '1',
      firstName: 'Marco',
      lastName: "D'Angelo",
      phone: '333 418 2291',
      account: { userId: 'u1', username: 'm.dangelo', isDisabled: false },
      status: 'Active',
      lastModifiedAt: '2026-11-12T12:00:00Z',
      version: 1,
    },
    {
      id: '2',
      firstName: 'Luca',
      lastName: 'Di Febo',
      phone: null,
      account: null,
      status: 'Active',
      lastModifiedAt: '2026-11-18T12:00:00Z',
      version: 2,
    },
    {
      id: '3',
      firstName: 'Andrea',
      lastName: 'Rossetti',
      phone: '328 556 0043',
      account: { userId: 'u3', username: 'a.rossetti', isDisabled: true },
      status: 'Deactivated',
      lastModifiedAt: '2026-11-03T12:00:00Z',
      version: 3,
    },
  ],
  totalCount: total,
  page: 1,
  pageSize: 20,
  totalPages: 3,
  hasNextPage: true,
  hasPreviousPage: false,
});

const none: DriverListPage = { ...answer(0), data: [] };

describe('DriverList', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    stubPopover();
    stubModalDialog();
  });

  const render = () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        DriversFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Layout, useValue: { openDrawer: () => undefined } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DriverList);
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
  };

  const flush = async (fixture: ReturnType<typeof render>, body: DriverListPage) => {
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

  it('the top bar shows the section, the title, the count and "Nuovo autista", the table has its columns and the actions, and there are no stat cards', async () => {
    const fixture = render();
    await flush(fixture, answer(9));
    const element = fixture.nativeElement as HTMLElement;
    const { search } = filterRow(element);

    expect(element.querySelector('.pt-breadcrumb')?.textContent?.trim()).toBe('Anagrafiche');
    expect(element.querySelector('h1')?.textContent).toBe('Autisti');
    expect(element.querySelector('.pt-topbar__heading .pt-muted')?.textContent).toBe('9 autisti');
    expect(element.querySelector('.pt-topbar__actions button')?.textContent?.trim()).toBe(
      'Nuovo autista',
    );
    expect(search.getAttribute('placeholder')).toBe('Cerca nome, cognome o telefono…');
    expect(Array.from(element.querySelectorAll('th')).map((th) => th.textContent?.trim())).toEqual([
      'Autista',
      'Telefono',
      'Account',
      'Stato',
      'Ultima modifica',
      'Azioni',
    ]);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(element.querySelector('.pt-stat')).toBeNull();
  });

  it('one driver is counted in the singular', async () => {
    const fixture = render();
    await flush(fixture, answer(1));

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.pt-topbar__heading .pt-muted')
        ?.textContent,
    ).toBe('1 autista');
  });

  it('the name reads last name first, a missing phone is a dash, and the date has no time', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;

    expect(text(rowCells(element, 0)[0])).toBe("D'Angelo Marco");
    expect(text(rowCells(element, 0)[1])).toBe('333 418 2291');
    expect(text(rowCells(element, 1)[1])).toBe('—');
    expect(text(rowCells(element, 0)[4])).toBe('12/11/2026');
    expect(text(rowCells(element, 2)[4])).toBe('03/11/2026');
  });

  it('the account is the user name in monospace, "· disabilitato" when disabled, "Nessun accesso" when absent', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;

    expect(rowCells(element, 0)[2].querySelector('.pt-mono')?.textContent).toBe('m.dangelo');
    expect(text(rowCells(element, 0)[2])).toBe('m.dangelo');
    expect(rowCells(element, 2)[2].querySelector('.pt-mono')?.textContent).toBe('a.rossetti');
    expect(text(rowCells(element, 2)[2])).toBe('a.rossetti · disabilitato');
    expect(rowCells(element, 2)[2].querySelector('.pt-muted')?.textContent?.trim()).toBe(
      '· disabilitato',
    );
    expect(text(rowCells(element, 1)[2])).toBe('Nessun accesso');
    expect(rowCells(element, 1)[2].classList.contains('pt-muted')).toBe(true);
    expect(rowCells(element, 1)[2].querySelector('.pt-mono')).toBeNull();
  });

  it('the status is a pill, green for Attivo and red for Disattivato', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;
    const pill = (row: number) => rowCells(element, row)[3].querySelector('.pt-pill')!;

    expect(pill(0).textContent?.trim()).toBe('Attivo');
    expect(pill(0).classList.contains('pt-pill--success')).toBe(true);
    expect(pill(0).classList.contains('pt-pill--danger')).toBe(false);
    expect(pill(2).textContent?.trim()).toBe('Disattivato');
    expect(pill(2).classList.contains('pt-pill--danger')).toBe(true);
    expect(pill(2).classList.contains('pt-pill--success')).toBe(false);
  });

  it('every row has Modifica, an active driver has Disattiva and a deactivated one Riattiva', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;
    const actions = (row: number) =>
      Array.from(rowCells(element, row)[5].querySelectorAll('button')).map((b) =>
        b.textContent?.trim(),
      );

    expect(actions(0)).toEqual(['Modifica', 'Disattiva']);
    expect(actions(1)).toEqual(['Modifica', 'Disattiva']);
    expect(actions(2)).toEqual(['Modifica', 'Riattiva']);
  });

  it('every row button is described by the cell that names the driver of its row', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;
    const descriptions = (row: number) =>
      Array.from(rowCells(element, row)[5].querySelectorAll('button')).map((b) =>
        element.querySelector(`[id="${b.getAttribute('aria-describedby')}"]`)?.textContent?.trim(),
      );

    expect(descriptions(0)).toEqual(["D'Angelo Marco", "D'Angelo Marco"]);
    expect(descriptions(2)).toEqual(['Rossetti Andrea', 'Rossetti Andrea']);
  });

  it('with no driver and no search or filter, "Nessun autista in anagrafica" with the hint replaces the table', async () => {
    const fixture = render();
    await flush(fixture, none);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe(
      'Nessun autista in anagrafica',
    );
    expect(element.querySelector('.pt-empty .pt-muted')?.textContent).toBe(
      'Aggiungi il primo con "Nuovo autista".',
    );
    expect(element.querySelector('main > .pt-card:not(.pt-empty)')).toBeNull();
  });

  it('with drivers but no match, "Nessun autista trovato" replaces the table and the filter row shows "Azzera filtri"', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;
    pick(filterRow(element).menus[0], 1);
    TestBed.tick();
    await flush(fixture, none);

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe(
      'Nessun autista trovato',
    );
    expect(filterRow(element).clear()).toBeDefined();
  });

  it('while the list loads a loading indicator replaces the table', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toBe('Autisti');
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

    TestBed.inject(DriversFacade).reload();
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

  it('the status filter offers tutti, Attivo and Disattivato, starts on "tutti" and applies at once', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const { menus } = filterRow(fixture.nativeElement as HTMLElement);

    expect(menus.map(chipText)).toEqual(['Stato: tutti']);
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
      type('fe');
      vi.advanceTimersByTime(200);
      type('febo');
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
    expect(requests[0].request.params.get('search')).toBe('febo');
    requests[0].flush(answer(1));
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
    TestBed.inject(DriversFacade).setSearch('zz9');
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

  it('the list opens sorted by name A to Z, asked of the backend, 20 per page', async () => {
    const fixture = render();
    const request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('sortColumn')).toBe('name');
    expect(request.request.params.get('sortDirection')).toBe('Ascending');
    expect(request.request.params.get('pageSize')).toBe('20');
    request.flush(answer(3));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th')).map((th) =>
        th.getAttribute('aria-sort'),
      ),
    ).toEqual(['ascending', null, null, null, null, null]);
  });

  it('only Autista and Ultima modifica are sortable; the other headers are plain text', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
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
    ['Autista', 0, 'name', 'Descending'],
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

    expect(element.querySelector('tfoot .pt-label')?.textContent).toBe('Autisti 1–20 di 42');
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

    expect(element.querySelector('tfoot .pt-label')?.textContent).toBe('Autisti 21–40 di 42');
  });

  it('"Nuovo autista" opens the dialog over the list, which keeps its search, filter, sorting and page', async () => {
    const fixture = render();
    await flush(fixture, answer(42));
    const element = fixture.nativeElement as HTMLElement;
    const facade = fixture.debugElement.injector.get(DriversFacade);
    facade.setSearch('feb');
    facade.setStatus('Active');
    facade.setSort('lastModifiedAt', 'Descending');
    facade.setPage(2);
    TestBed.tick();
    http.match((r) => r.url === URL).forEach((r) => r.flush({ ...answer(42), page: 2 }));
    await fixture.whenStable();
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.pt-topbar__actions button')!.click();
    fixture.detectChanges();
    TestBed.tick();

    expect(element.querySelector('app-driver-form-dialog .pt-title')?.textContent?.trim()).toBe(
      'Nuovo autista',
    );
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    expect([facade.search(), facade.status(), facade.sortColumn(), facade.page()]).toEqual([
      'feb',
      'Active',
      'lastModifiedAt',
      2,
    ]);
    http.match(() => true);
  });

  it('"Modifica" opens the dialog on the driver of its row, and closing it leaves the list as it was', async () => {
    const fixture = render();
    await flush(fixture, answer(3));
    const element = fixture.nativeElement as HTMLElement;

    rowCells(element, 2)[5].querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    TestBed.tick();

    const dialog = element.querySelector('app-driver-form-dialog')!;
    expect(dialog.querySelector('.pt-title')?.textContent?.trim()).toBe('Modifica autista');
    expect(dialog.querySelector<HTMLInputElement>('#driver-last')!.value).toBe('Rossetti');
    expect(dialog.querySelector<HTMLInputElement>('#driver-first')!.value).toBe('Andrea');

    dialog.querySelector<HTMLButtonElement>('.pt-dialog__actions button')!.click();
    fixture.detectChanges();

    expect(element.querySelector('app-driver-form-dialog')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    http.match(() => true);
  });

  describe('deactivate and reactivate', () => {
    const actionButton = (element: HTMLElement, row: number, label: string) =>
      Array.from(rowCells(element, row)[5].querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === label,
      )!;
    const writes = () => http.match((r) => r.url.startsWith(URL) && r.method === 'POST');
    const conflict = {
      errorCode: 'Registry.Driver.ConcurrentUpdate',
      detail: "L'autista è stato modificato da un altro utente. Ricarica la lista e riprova.",
    };

    it('"Disattiva" of a row opens the confirmation for that driver, and Annulla closes it', async () => {
      const fixture = render();
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;

      actionButton(element, 1, 'Disattiva').click();
      fixture.detectChanges();
      TestBed.tick();

      expect(text(element.querySelector('app-driver-deactivate-dialog .pt-title'))).toBe(
        "Disattivare l'autista Luca Di Febo?",
      );
      expect(writes()).toHaveLength(0);

      element.querySelector<HTMLButtonElement>('.pt-dialog__actions button')!.click();
      fixture.detectChanges();
      expect(element.querySelector('app-driver-deactivate-dialog')).toBeNull();
    });

    it('confirming sends the version of the row, closes the dialog, toasts, and the list is asked again keeping its page', async () => {
      const fixture = render();
      await flush(fixture, answer(50));
      const element = fixture.nativeElement as HTMLElement;
      TestBed.inject(DriversFacade).setPage(2);
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

      expect(element.querySelector('app-driver-deactivate-dialog')).toBeNull();
      expect(TestBed.inject(Toast).current()).toBe("Autista Marco D'Angelo disattivato");
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
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;

      actionButton(element, 2, 'Riattiva').click();
      fixture.detectChanges();

      const [post] = writes();
      expect(post.request.url).toBe(`${URL}/3/reactivate`);
      expect(post.request.body).toEqual({ version: 3 });
      expect(element.querySelector('dialog')).toBeNull();
      const running = rowCells(element, 2)[5].querySelectorAll('button')[1];
      expect(running.textContent?.trim()).toBe('Riattivazione…');
      expect(running.getAttribute('aria-disabled')).toBe('true');
      http.match(() => true);
    });

    it('on success a toast names the driver, the row shows Attivo and Disattiva', async () => {
      const fixture = render();
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 2, 'Riattiva').click();

      writes()[0].flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      expect(TestBed.inject(Toast).current()).toBe('Autista Andrea Rossetti riattivato');
      const updated = answer(3);
      updated.data[2].status = 'Active';
      http.expectOne((r) => r.url === URL).flush(updated);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(text(rowCells(element, 2)[3])).toBe('Attivo');
      expect(text(rowCells(element, 2)[5].querySelectorAll('button')[1])).toBe('Disattiva');
    });

    it('a refused "Riattiva" shows the detail in a notice above the table, the list reloads, and the next action on the list removes the notice', async () => {
      const fixture = render();
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 2, 'Riattiva').click();

      writes()[0].flush(conflict, { status: 409, statusText: 'Conflict' });
      await settle(fixture);

      const notice = element.querySelector('main > .pt-notice--danger');
      expect(text(notice)).toBe(conflict.detail);
      expect(element.querySelector('main')!.firstElementChild).toBe(notice);
      await flush(fixture, answer(3));

      element.querySelector<HTMLButtonElement>('th button')!.click();
      fixture.detectChanges();

      expect(element.querySelector('main > .pt-notice--danger')).toBeNull();
      http.match(() => true);
    });

    it('a failure without a detail shows the generic message above the table', async () => {
      const fixture = render();
      await flush(fixture, answer(3));
      const element = fixture.nativeElement as HTMLElement;
      actionButton(element, 2, 'Riattiva').click();

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
      TestBed.inject(DriversFacade).setPage(2);
      TestBed.tick();
      await flush(fixture, answer(50));
      actionButton(element, 0, 'Disattiva').click();
      fixture.detectChanges();
      TestBed.tick();
      element.querySelectorAll<HTMLButtonElement>('.pt-dialog__actions button')[1].click();
      fixture.detectChanges();

      writes()[0].flush(conflict, { status: 409, statusText: 'Conflict' });
      await settle(fixture);

      expect(text(element.querySelector('app-driver-deactivate-dialog .pt-notice--danger'))).toBe(
        conflict.detail,
      );
      const reload = http.expectOne((r) => r.url === URL);
      expect(reload.request.params.get('page')).toBe('2');
      reload.flush(answer(50));
    });
  });
});
