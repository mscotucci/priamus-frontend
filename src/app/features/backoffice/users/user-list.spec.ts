import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { routes } from '../../../app.routes';
import { Session } from '../../../core/auth/session';
import type { CurrentUser } from '../../../core/auth/auth-api';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog, stubPopover } from '../../../core/testing/dom-testing';
import { Layout } from '../../../core/layout/layout';
import type { UserPage } from './users-api';
import { UsersFacade } from './users-facade';
import { UserList } from './user-list';
import { settle } from '../../../core/testing/interaction-testing';

const URL = '/api/identity/users';

const answer = (total: number): UserPage => ({
  data: [
    {
      id: '1',
      username: 'admin',
      role: 'Admin',
      status: 'Active',
      createdAt: '2026-05-12T12:00:00Z',
      lastModifiedAt: '2026-05-12T12:00:00Z',
      version: 1,
    },
    {
      id: '2',
      username: 'a.rossetti',
      role: 'Driver',
      status: 'Active',
      createdAt: '2026-05-14T12:00:00Z',
      lastModifiedAt: '2026-05-14T12:00:00Z',
      version: 2,
    },
    {
      id: '3',
      username: 'f.esposito',
      role: 'BackOffice',
      status: 'Disabled',
      createdAt: '2026-05-14T12:00:00Z',
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

describe('UserList', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    stubPopover();
  });

  const render = () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        UsersFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Layout, useValue: { openDrawer: () => undefined } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UserList);
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
  };

  const respond = async (fixture: ReturnType<typeof render>, total: number) => {
    http.expectOne((r) => r.url === URL).flush(answer(total));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('shows the section, the title, the count and the action in the top bar, and the columns of the table', async () => {
    const fixture = render();
    await respond(fixture, 23);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.pt-breadcrumb')?.textContent?.trim()).toBe('Sistema');
    expect(element.querySelector('h1')?.textContent).toBe('Utenti');
    expect(element.querySelector('.pt-topbar__heading .pt-muted')?.textContent).toBe('23 utenti');
    expect(element.querySelector('.pt-topbar__actions button')?.textContent?.trim()).toBe(
      'Nuovo utente',
    );
    const headers = Array.from(element.querySelectorAll('th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual([
      'Nome utente',
      'Ruolo',
      'Stato',
      'Creato il',
      'Ultima modifica',
      'Azioni',
    ]);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(element.querySelector('.pt-stat')).toBeNull();
  });

  it('writes the count of one user in the singular', async () => {
    const fixture = render();
    await respond(fixture, 1);

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.pt-topbar__heading .pt-muted')
        ?.textContent,
    ).toBe('1 utente');
  });

  it('shows Italian dates without the time', async () => {
    const fixture = render();
    await respond(fixture, 3);
    const cells = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr:nth-child(3) td'),
    ).map((td) => td.textContent?.trim());

    expect(cells[3]).toBe('14/05/2026');
    expect(cells[4]).toBe('03/11/2026');
  });

  it('a row button is described by the user name of its row', async () => {
    const fixture = render();
    await respond(fixture, 3);
    const element = fixture.nativeElement as HTMLElement;
    const description = (row: number) => {
      const button = element.querySelector(`tbody tr:nth-child(${row}) td:last-child button`)!;
      return element
        .querySelector(`[id="${button.getAttribute('aria-describedby')}"]`)
        ?.textContent?.trim();
    };

    expect(description(2)).toBe('a.rossetti');
    expect(description(3)).toBe('f.esposito');
  });

  it('shows roles and statuses with their Italian names', async () => {
    const fixture = render();
    await respond(fixture, 3);
    const rows = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'),
    ).map((row) =>
      Array.from(row.querySelectorAll('td'))
        .slice(1, 3)
        .map((td) => td.textContent?.trim()),
    );

    expect(rows).toEqual([
      ['Amministratore', 'Attivo'],
      ['Autista', 'Attivo'],
      ['Segreteria', 'Disabilitato'],
    ]);
  });

  it('the status is a pill, green for Attivo and red for Disabilitato, and the role is plain text', async () => {
    const fixture = render();
    await respond(fixture, 3);
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    const pill = (row: number) => rows[row].querySelectorAll('td')[2].querySelector('.pt-pill');

    expect(pill(0)?.classList.contains('pt-pill--success')).toBe(true);
    expect(pill(0)?.classList.contains('pt-pill--danger')).toBe(false);
    expect(pill(2)?.classList.contains('pt-pill--danger')).toBe(true);
    expect(pill(2)?.classList.contains('pt-pill--success')).toBe(false);
    expect(rows[0].querySelectorAll('td')[1].querySelector('.pt-pill')).toBeNull();
  });

  it('while the list loads the title stays and a loading indicator replaces the table', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toBe('Utenti');
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
    await respond(fixture, 3);

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('the list opens sorted by user name A to Z, asked of the backend, and the header shows it', async () => {
    const fixture = render();
    const request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('sortColumn')).toBe('username');
    expect(request.request.params.get('sortDirection')).toBe('Ascending');
    request.flush(answer(3));
    await fixture.whenStable();
    fixture.detectChanges();
    const headers = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th')).map(
      (th) => th.getAttribute('aria-sort'),
    );

    expect(headers).toEqual(['ascending', null, null, null, null, null]);
  });

  it('a column header sorts by that column, pressed again inverts, and only the sorted header carries the direction', async () => {
    const fixture = render();
    await respond(fixture, 23);
    const element = fixture.nativeElement as HTMLElement;
    const sorts = () =>
      Array.from(element.querySelectorAll('th')).map((th) => th.getAttribute('aria-sort'));
    const last = (calls: TestRequest) => [
      calls.request.params.get('sortColumn'),
      calls.request.params.get('sortDirection'),
    ];

    element.querySelectorAll('th')[4].querySelector('button')!.click();
    TestBed.tick();
    const first = http.expectOne((r) => r.url === URL);
    expect(last(first)).toEqual(['lastModifiedAt', 'Ascending']);
    first.flush(answer(23));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(sorts()).toEqual([null, null, null, null, 'ascending', null]);

    element.querySelectorAll('th')[4].querySelector('button')!.click();
    TestBed.tick();
    const second = http.expectOne((r) => r.url === URL);
    expect(last(second)).toEqual(['lastModifiedAt', 'Descending']);
    second.flush(answer(23));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(sorts()).toEqual([null, null, null, null, 'descending', null]);
  });

  it('Ruolo and Stato are plain headers without a button or aria-sort, the others are sort controls', async () => {
    const fixture = render();
    await respond(fixture, 3);
    const headers = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('th'));

    expect(headers.map((th) => th.querySelector('button') !== null)).toEqual([
      true,
      false,
      false,
      true,
      true,
      false,
    ]);
    expect(headers.map((th) => th.textContent?.trim())).toEqual([
      'Nome utente',
      'Ruolo',
      'Stato',
      'Creato il',
      'Ultima modifica',
      'Azioni',
    ]);
    expect(headers[1].hasAttribute('aria-sort')).toBe(false);
    expect(headers[2].hasAttribute('aria-sort')).toBe(false);
  });

  it.each([
    ['Nome utente', 0, 'username', 'Descending'],
    ['Creato il', 3, 'createdAt', 'Ascending'],
    ['Ultima modifica', 4, 'lastModifiedAt', 'Ascending'],
  ])(
    '%s sorts on the first click and inverts on the second',
    async (_name, index, column, firstDirection) => {
      const fixture = render();
      await respond(fixture, 23);
      const element = fixture.nativeElement as HTMLElement;
      const press = async () => {
        element.querySelectorAll('th')[index].querySelector('button')!.click();
        TestBed.tick();
        const request = http.expectOne((r) => r.url === URL);
        const result = [
          request.request.params.get('sortColumn'),
          request.request.params.get('sortDirection'),
        ];
        request.flush(answer(23));
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

  it('the footer shows the range and the pager, and the next page is asked of the backend', async () => {
    const fixture = render();
    await respond(fixture, 23);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('tfoot .pt-label')?.textContent).toBe('Utenti 1–20 di 23');
    expect(element.querySelector('tfoot .pt-paging .pt-muted')?.textContent).toBe('Pagina 1 di 2');

    const buttons = element.querySelectorAll<HTMLButtonElement>('tfoot button');
    expect(buttons[0].disabled).toBe(true);
    buttons[1].click();
    TestBed.tick();
    const request = http.expectOne((r) => r.url === URL);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('20');
    request.flush({ ...answer(23), page: 2, hasNextPage: false, hasPreviousPage: true });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('tfoot .pt-label')?.textContent).toBe('Utenti 21–23 di 23');
    const after = element.querySelectorAll<HTMLButtonElement>('tfoot button');
    expect(after[0].disabled).toBe(false);
    expect(after[1].disabled).toBe(true);
  });

  it('with no users the footer is not rendered', async () => {
    const fixture = render();
    http.expectOne((r) => r.url === URL).flush({ ...answer(0), data: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('tfoot')).toBeNull();
  });

  describe('new user dialog', () => {
    beforeEach(() => {
      stubModalDialog();
    });

    const newUserButton = (element: HTMLElement) =>
      element.querySelector<HTMLButtonElement>('.pt-topbar__actions button')!;

    it('"Nuovo utente" in the top bar opens the creation dialog over the list', async () => {
      const fixture = render();
      await respond(fixture, 3);
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('app-user-create-dialog')).toBeNull();

      newUserButton(element).click();
      fixture.detectChanges();

      expect(element.querySelector('app-user-create-dialog dialog')).not.toBeNull();
      expect(element.querySelector('table')).not.toBeNull();
    });

    it('the dialog opens with the fields and the buttons while the list keeps its search, filters, sorting and page', async () => {
      const fixture = render();
      await respond(fixture, 50);
      const element = fixture.nativeElement as HTMLElement;
      const facade = TestBed.inject(UsersFacade);
      facade.setRole('Driver');
      facade.setSort('createdAt', 'Descending');
      TestBed.tick();
      http.expectOne((r) => r.url === URL).flush(answer(50));
      await fixture.whenStable();
      facade.setPage(2);
      TestBed.tick();
      http.expectOne((r) => r.url === URL).flush(answer(50));
      await fixture.whenStable();
      fixture.detectChanges();

      newUserButton(element).click();
      fixture.detectChanges();
      TestBed.tick();

      const dialog = element.querySelector('app-user-create-dialog')!;
      expect(
        Array.from(dialog.querySelectorAll('label')).map((label) => label.textContent?.trim()),
      ).toEqual(['Nome utente', 'Password', 'Ruolo']);
      expect(
        Array.from(dialog.querySelectorAll('.pt-dialog__actions button')).map((b) =>
          b.textContent?.trim(),
        ),
      ).toEqual(['Annulla', 'Crea utente']);
      expect([facade.role(), facade.sortColumn(), facade.sortDirection(), facade.page()]).toEqual([
        'Driver',
        'createdAt',
        'Descending',
        2,
      ]);
      http.expectNone((r) => r.url === URL);
    });

    it('Annulla closes the dialog and a dialog opened again starts empty', async () => {
      const fixture = render();
      await respond(fixture, 3);
      const element = fixture.nativeElement as HTMLElement;
      newUserButton(element).click();
      fixture.detectChanges();
      const field = element.querySelector<HTMLInputElement>('#create-username')!;
      field.value = 'abc';
      field.dispatchEvent(new Event('input', { bubbles: true }));

      element.querySelector<HTMLButtonElement>('.pt-dialog__actions button')!.click();
      fixture.detectChanges();
      expect(element.querySelector('app-user-create-dialog')).toBeNull();

      newUserButton(element).click();
      fixture.detectChanges();
      expect(element.querySelector<HTMLInputElement>('#create-username')!.value).toBe('');
    });
  });

  describe('filter row', () => {
    const chipText = (menu: Element) =>
      menu.querySelector('.pt-filter__button')?.textContent?.replace(/\s+/g, ' ').trim();
    const itemTexts = (menu: Element) =>
      Array.from(menu.querySelectorAll('.pt-menu__item')).map((i) => i.textContent?.trim());
    const rowOf = (fixture: ReturnType<typeof render>) => {
      const element = fixture.nativeElement as HTMLElement;
      const row = element.querySelector('main > .pt-card')!;
      return {
        element,
        row,
        search: row.querySelector<HTMLInputElement>('.pt-search input')!,
        menus: Array.from(row.querySelectorAll('app-filter-menu')),
        clear: () =>
          Array.from(row.querySelectorAll('button')).find(
            (b) => b.textContent?.trim() === 'Azzera filtri',
          ),
      };
    };
    const pick = (menu: Element, index: number) =>
      menu.querySelectorAll<HTMLElement>('.pt-menu__item')[index].click();
    const type = (input: HTMLInputElement, text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
    };
    const typeAndWait = (input: HTMLInputElement, text: string) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        type(input, text);
        vi.advanceTimersByTime(300);
      } finally {
        vi.useRealTimers();
      }
      TestBed.tick();
    };
    const flushNext = async (fixture: ReturnType<typeof render>, body: UserPage) => {
      http.expectOne((r) => r.url === URL).flush(body);
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const noMatch: UserPage = { ...answer(0), data: [] };

    it('the page has a filter row with the search, the role filter and the status filter', async () => {
      const fixture = render();
      await respond(fixture, 3);
      const { row, search, menus } = rowOf(fixture);

      expect(search.getAttribute('aria-label')).toBe('Cerca nome utente');
      expect(search.placeholder).toBe('Cerca nome utente…');
      expect(menus.map(chipText)).toEqual(['Ruolo: tutti', 'Stato: tutti']);
      expect(itemTexts(menus[0])).toEqual(['Tutti', 'Amministratore', 'Segreteria', 'Autista']);
      expect(itemTexts(menus[1])).toEqual(['Tutti', 'Attivo', 'Disabilitato']);
      expect(row.nextElementSibling?.querySelector('table')).not.toBeNull();
    });

    it('while the list loads the filter row stays', () => {
      const { search, menus } = rowOf(render());

      expect(search).not.toBeNull();
      expect(menus).toHaveLength(2);
    });

    it('the filter row also stays when the load failed', async () => {
      const fixture = render();
      http.expectOne((r) => r.url === URL).flush(null, { status: 500, statusText: 'Server Error' });
      await fixture.whenStable();
      fixture.detectChanges();
      const { search, menus } = rowOf(fixture);

      expect(search).not.toBeNull();
      expect(menus).toHaveLength(2);
    });

    it('picking a role or a status asks the backend at once, and "Tutti" removes the filter', async () => {
      const fixture = render();
      await respond(fixture, 3);
      const { menus } = rowOf(fixture);

      pick(menus[0], 3);
      TestBed.tick();
      let request = http.expectOne((r) => r.url === URL);
      expect(request.request.params.get('role')).toBe('Driver');
      request.flush(answer(3));
      await fixture.whenStable();
      fixture.detectChanges();
      expect(chipText(menus[0])).toBe('Ruolo: Autista');

      pick(menus[1], 2);
      TestBed.tick();
      request = http.expectOne((r) => r.url === URL);
      expect(request.request.params.get('role')).toBe('Driver');
      expect(request.request.params.get('status')).toBe('Disabled');
      request.flush(answer(3));
      await fixture.whenStable();
      fixture.detectChanges();

      pick(menus[0], 0);
      TestBed.tick();
      request = http.expectOne((r) => r.url === URL);
      expect(request.request.params.has('role')).toBe(false);
      expect(request.request.params.get('status')).toBe('Disabled');
      request.flush(answer(3));
    });

    it('typing sends one request with the typed part of the name, after the delay and without Enter', async () => {
      const fixture = render();
      await respond(fixture, 3);
      const { search } = rowOf(fixture);

      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        type(search, 'r');
        vi.advanceTimersByTime(200);
        type(search, 'ro');
        vi.advanceTimersByTime(200);
        type(search, 'ros');
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
      expect(requests[0].request.params.get('usernameContains')).toBe('ros');
      requests[0].flush(answer(3));
    });

    it('with no match "Nessun utente trovato" replaces the table and the filter row stays', async () => {
      const fixture = render();
      await flushNext(fixture, noMatch);
      const { element, menus } = rowOf(fixture);

      expect(element.querySelector('table')).toBeNull();
      expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe(
        'Nessun utente trovato',
      );
      expect(element.querySelector('.pt-empty .pt-muted')).toBeNull();
      expect(menus).toHaveLength(2);
    });

    it('with no match while a filter is set, the empty state also has the hint', async () => {
      const fixture = render();
      await respond(fixture, 3);
      const { element, menus } = rowOf(fixture);
      pick(menus[0], 3);
      TestBed.tick();
      await flushNext(fixture, noMatch);

      expect(element.querySelector('.pt-empty .pt-muted')?.textContent).toBe(
        'Prova a cambiare la ricerca o i filtri.',
      );
      expect(menus).toHaveLength(2);
    });

    it('with no match and no search or filter set, the empty state has the title and no hint', async () => {
      const fixture = render();
      await flushNext(fixture, noMatch);
      const { element } = rowOf(fixture);

      expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe(
        'Nessun utente trovato',
      );
      expect(element.querySelector('.pt-empty .pt-muted')).toBeNull();
    });

    it('"Azzera filtri" shows only while a search or a filter is set, and clears all three', async () => {
      const fixture = render();
      await respond(fixture, 3);
      const { search, menus, clear } = rowOf(fixture);
      expect(clear()).toBeUndefined();

      pick(menus[0], 3);
      TestBed.tick();
      await flushNext(fixture, answer(3));
      pick(menus[1], 1);
      TestBed.tick();
      await flushNext(fixture, answer(3));
      typeAndWait(search, 'bianchi');
      await flushNext(fixture, noMatch);
      expect(clear()).toBeDefined();

      clear()!.click();
      TestBed.tick();
      const request = http.expectOne((r) => r.url === URL);
      expect(request.request.params.has('usernameContains')).toBe(false);
      expect(request.request.params.has('role')).toBe(false);
      expect(request.request.params.has('status')).toBe(false);
      request.flush(answer(3));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(search.value).toBe('');
      expect(menus.map(chipText)).toEqual(['Ruolo: tutti', 'Stato: tutti']);
      expect(clear()).toBeUndefined();
    });

    it('a search of only spaces is no search and shows no "Azzera filtri"', async () => {
      const fixture = render();
      await respond(fixture, 3);
      const { search, clear } = rowOf(fixture);

      typeAndWait(search, '   ');
      TestBed.tick();
      http.expectNone((r) => r.url === URL);

      expect(clear()).toBeUndefined();
    });

    it('the search field is the small size like the filter chips, both on the 30px control size', async () => {
      const fixture = render();
      await respond(fixture, 3);
      const { row } = rowOf(fixture);

      expect(row.querySelector('label.pt-search')?.classList.contains('pt-search--sm')).toBe(true);
      expect(row.querySelectorAll('button.pt-filter__button')).toHaveLength(2);
    });
  });

  describe('row actions', () => {
    beforeAll(() => {
      stubModalDialog();
    });

    const renderAs = (currentId: string) => {
      TestBed.configureTestingModule({
        providers: [
          provideTestI18n(),
          UsersFacade,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Layout, useValue: { openDrawer: () => undefined } },
          { provide: Session, useValue: { user: signal({ id: currentId }).asReadonly() } },
        ],
      });
      TestBed.inject(TranslateService).use('it');
      http = TestBed.inject(HttpTestingController);
      const fixture = TestBed.createComponent(UserList);
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
      TestBed.tick();
      return fixture;
    };

    const row = (fixture: ReturnType<typeof renderAs>, index: number) =>
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')[index];

    const action = (fixture: ReturnType<typeof renderAs>, index: number) =>
      row(fixture, index).querySelector<HTMLButtonElement>('td:last-child button');

    afterEach(() => {
      document.body.replaceChildren();
    });

    it('an active row has "Disabilita" and a disabled row has "Riattiva" in the action column', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);

      expect(action(fixture, 0)).toBeNull();
      expect(action(fixture, 1)?.textContent?.trim()).toBe('Disabilita');
      expect(action(fixture, 2)?.textContent?.trim()).toBe('Riattiva');
    });

    it('the row of the signed-in user carries "(tu)" beside the user name and has no "Disabilita"', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);

      const first = row(fixture, 0).querySelector('td')!;
      expect(first.querySelector('strong')?.textContent).toBe('admin');
      expect(first.querySelector('span')?.textContent?.trim()).toBe('(tu)');
      expect(row(fixture, 0).textContent).not.toContain('Disabilita');
      expect(row(fixture, 1).querySelector('td')?.textContent?.trim()).toBe('a.rossetti');
    });

    it('"Disabilita" opens the confirmation dialog for that user with the focus on "Annulla"', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('app-user-disable-dialog')).toBeNull();

      action(fixture, 1)!.click();
      fixture.detectChanges();
      TestBed.tick();

      expect(element.querySelector('app-user-disable-dialog .pt-title')?.textContent?.trim()).toBe(
        'Disabilitare a.rossetti?',
      );
      expect(document.activeElement?.textContent?.trim()).toBe('Annulla');
    });

    it('after a successful disabling the dialog closes, the list is asked again and the row shows its new state', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);
      const element = fixture.nativeElement as HTMLElement;
      action(fixture, 1)!.click();
      fixture.detectChanges();
      TestBed.tick();

      element.querySelector<HTMLButtonElement>('app-user-disable-dialog .pt-btn--danger')!.click();
      await settle(fixture);
      http
        .expectOne((r) => r.url === `${URL}/2/disable` && r.method === 'POST')
        .flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      expect(element.querySelector('app-user-disable-dialog')).toBeNull();
      const updated = answer(3);
      updated.data[1].status = 'Disabled';
      http.expectOne((r) => r.url === URL && r.method === 'GET').flush(updated);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(row(fixture, 1).querySelectorAll('td')[2].textContent?.trim()).toBe('Disabilitato');
      expect(action(fixture, 1)?.textContent?.trim()).toBe('Riattiva');
    });

    it('while the list is read again after a write the table stays, with a small indicator at the end of the filters, and the row keeps its button', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);
      const element = fixture.nativeElement as HTMLElement;
      const opener = action(fixture, 1)!;
      opener.click();
      fixture.detectChanges();
      TestBed.tick();

      element.querySelector<HTMLButtonElement>('app-user-disable-dialog .pt-btn--danger')!.click();
      await settle(fixture);
      http
        .expectOne((r) => r.url === `${URL}/2/disable` && r.method === 'POST')
        .flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);

      const reload = http.expectOne((r) => r.url === URL && r.method === 'GET');
      const filters = element.querySelector('main > .pt-card')!;
      expect(element.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
      expect(filters.querySelector('.pt-spinner--sm[role="status"]')?.textContent?.trim()).toBe(
        'Aggiornamento…',
      );
      expect(element.contains(opener)).toBe(true);

      const updated = answer(3);
      updated.data[1].status = 'Disabled';
      reload.flush(updated);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element.querySelector('table')?.hasAttribute('aria-busy')).toBe(false);
      expect(element.querySelector('.pt-spinner')).toBeNull();
      // the same button now reactivates: the status change does not replace it
      expect(element.contains(opener)).toBe(true);
      expect(opener.textContent?.trim()).toBe('Riattiva');
    });

    it('Disabilita sends the version of its row', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);
      const element = fixture.nativeElement as HTMLElement;

      action(fixture, 1)!.click();
      fixture.detectChanges();
      TestBed.tick();
      element.querySelector<HTMLButtonElement>('app-user-disable-dialog .pt-btn--danger')!.click();
      await settle(fixture);
      const disable = http.expectOne((r) => r.url === `${URL}/2/disable` && r.method === 'POST');
      expect(disable.request.body).toEqual({ version: 2 });
      http.match(() => true);
    });

    it('Riattiva sends the version of its row', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);

      action(fixture, 2)!.click();
      fixture.detectChanges();

      const enable = http.expectOne((r) => r.url === `${URL}/3/enable` && r.method === 'POST');
      expect(enable.request.body).toEqual({ version: 3 });
      http.match(() => true);
    });

    it('a Riattiva refused with 409 shows the message above the table and reloads the list', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);
      const element = fixture.nativeElement as HTMLElement;
      action(fixture, 2)!.click();
      fixture.detectChanges();

      http
        .expectOne((r) => r.url === `${URL}/3/enable` && r.method === 'POST')
        .flush(
          {
            errorCode: 'Identity.User.ConcurrentUpdate',
            detail: 'Utente modificato nel frattempo.',
          },
          { status: 409, statusText: 'Conflict' },
        );
      await settle(fixture);

      expect(element.querySelector('main > .pt-notice--danger')?.textContent?.trim()).toBe(
        'Utente modificato nel frattempo.',
      );
      http.expectOne((r) => r.url === URL && r.method === 'GET');
    });

    it('"Riattiva" enables at once with no dialog, and while it runs the button is disabled and reads "Riattivazione…"', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);

      action(fixture, 2)!.click();
      fixture.detectChanges();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('app-user-disable-dialog'),
      ).toBeNull();
      // aria-disabled, not disabled: the button keeps the focus while it runs
      expect(action(fixture, 2)!.getAttribute('aria-disabled')).toBe('true');
      expect(action(fixture, 2)!.disabled).toBe(false);
      expect(action(fixture, 2)!.textContent?.trim()).toBe('Riattivazione…');
      http.expectOne((r) => r.url === `${URL}/3/enable` && r.method === 'POST');
    });

    it('after a successful enabling the row shows "Attivo" and "Disabilita"', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);
      action(fixture, 2)!.click();
      fixture.detectChanges();

      http
        .expectOne((r) => r.url === `${URL}/3/enable` && r.method === 'POST')
        .flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture);
      const updated = answer(3);
      updated.data[2].status = 'Active';
      http.expectOne((r) => r.url === URL && r.method === 'GET').flush(updated);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(row(fixture, 2).querySelectorAll('td')[2].textContent?.trim()).toBe('Attivo');
      expect(action(fixture, 2)?.textContent?.trim()).toBe('Disabilita');
    });

    it('a failed enabling shows a danger notice above the table with the detail, and the next sort removes it', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);
      const element = fixture.nativeElement as HTMLElement;
      action(fixture, 2)!.click();
      fixture.detectChanges();

      http
        .expectOne((r) => r.url === `${URL}/3/enable` && r.method === 'POST')
        .flush(
          { errorCode: 'Identity.User.NotFound', detail: 'Utente non trovato.' },
          { status: 404, statusText: 'Not Found' },
        );
      await settle(fixture);

      const notice = element.querySelector('main > .pt-notice--danger')!;
      expect(notice.textContent?.trim()).toBe('Utente non trovato.');
      expect(notice.compareDocumentPosition(element.querySelector('table')!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(action(fixture, 2)!.disabled).toBe(false);

      element.querySelector<HTMLButtonElement>('th button')!.click();
      fixture.detectChanges();
      TestBed.tick();

      expect(element.querySelector('main > .pt-notice--danger')).toBeNull();
      http.match(() => true);
    });

    it('a failed enabling without a detail shows the generic message', async () => {
      const fixture = renderAs('1');
      await respond(fixture, 3);
      action(fixture, 2)!.click();
      fixture.detectChanges();

      http
        .expectOne((r) => r.url === `${URL}/3/enable` && r.method === 'POST')
        .flush(null, { status: 500, statusText: 'Server Error' });
      await settle(fixture);

      expect(
        (fixture.nativeElement as HTMLElement)
          .querySelector('main > .pt-notice--danger')
          ?.textContent?.trim(),
      ).toBe('Si è verificato un errore. Riprova tra poco.');
    });
  });

  describe('route', () => {
    const open = async (role: CurrentUser['role']) => {
      const user = { id: '1', username: 'u', role, driverId: null } as CurrentUser;
      TestBed.configureTestingModule({
        providers: [
          provideTestI18n(),
          provideRouter(routes),
          provideHttpClient(),
          provideHttpClientTesting(),
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
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/users');
      TestBed.tick();
      return harness;
    };

    it('/users opened by an Admin shows the user list inside the shell', async () => {
      const harness = await open('Admin');
      http.expectOne((r) => r.url === URL).flush(answer(3));
      await harness.fixture.whenStable();
      harness.detectChanges();
      const element = harness.fixture.nativeElement as HTMLElement;

      expect(TestBed.inject(Router).url).toBe('/users');
      expect(element.querySelector('app-layout app-user-list table')).not.toBeNull();
    });

    it('/users opened by a BackOffice user shows /customers instead', async () => {
      const harness = await open('BackOffice');
      harness.detectChanges();
      const element = harness.fixture.nativeElement as HTMLElement;

      expect(TestBed.inject(Router).url).toBe('/customers');
      expect(element.querySelector('app-customer-list')).not.toBeNull();
      expect(element.querySelector('app-user-list')).toBeNull();
      http.expectNone((r) => r.url === URL);
    });

    it('/vehicles opened by a Driver does not show the vehicle list and ends on the Driver landing', async () => {
      const user = { id: '1', username: 'u', role: 'Driver', driverId: null } as CurrentUser;
      TestBed.configureTestingModule({
        providers: [
          provideTestI18n(),
          provideRouter(routes),
          provideHttpClient(),
          provideHttpClientTesting(),
          {
            provide: Session,
            useValue: {
              wait: () => Promise.resolve(),
              user: signal(user).asReadonly(),
              notice: signal(null).asReadonly(),
            },
          },
        ],
      });
      http = TestBed.inject(HttpTestingController);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/vehicles');
      TestBed.tick();
      harness.detectChanges();
      const element = harness.fixture.nativeElement as HTMLElement;

      expect(TestBed.inject(Router).url).toBe('/login');
      expect(element.querySelector('app-vehicle-list')).toBeNull();
      http.expectNone((r) => r.url === '/api/registry/vehicles');
    });

    it('/customers opened by a Driver does not show the customer list and ends on the Driver landing', async () => {
      const user = { id: '1', username: 'u', role: 'Driver', driverId: null } as CurrentUser;
      TestBed.configureTestingModule({
        providers: [
          provideTestI18n(),
          provideRouter(routes),
          provideHttpClient(),
          provideHttpClientTesting(),
          {
            provide: Session,
            useValue: {
              wait: () => Promise.resolve(),
              user: signal(user).asReadonly(),
              notice: signal(null).asReadonly(),
            },
          },
        ],
      });
      http = TestBed.inject(HttpTestingController);
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/customers');
      TestBed.tick();
      harness.detectChanges();
      const element = harness.fixture.nativeElement as HTMLElement;

      expect(TestBed.inject(Router).url).toBe('/login');
      expect(element.querySelector('app-customer-list')).toBeNull();
      http.expectNone((r) => r.url === '/api/registry/customers');
    });
  });
});
