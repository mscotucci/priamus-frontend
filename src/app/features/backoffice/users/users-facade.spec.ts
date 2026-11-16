import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Session } from '../../../core/auth/session';
import type { CurrentUser } from '../../../core/auth/auth-api';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { userWithRole } from '../../../core/testing/dom-testing';
import { Toast } from '../../../core/toast/toast';
import { UsersFacade } from './users-facade';
import { settle } from './users-testing';
import type { UserPage } from './users-api';

const URL = '/api/identity/users';

const page = (total: number): UserPage => ({
  data: [
    {
      id: '1',
      username: 'admin',
      role: 'Admin',
      status: 'Active',
      createdAt: '2026-05-12T08:00:00Z',
      lastModifiedAt: '2026-05-12T08:00:00Z',
    },
  ],
  totalCount: total,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
});

describe('UsersFacade', () => {
  let http: HttpTestingController;
  let facade: UsersFacade;
  const sessionUser = signal<CurrentUser | null>(null);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        UsersFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Session, useValue: { user: sessionUser.asReadonly() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(UsersFacade);
  });

  const lastRequest = () => {
    TestBed.tick();
    return http.expectOne((request) => request.url === URL);
  };

  const params = (request: {
    request: { params: { keys(): string[]; get(k: string): string | null } };
  }) =>
    Object.fromEntries(
      request.request.params.keys().map((k) => [k, request.request.params.get(k)]),
    );

  it('the first request carries page 1, page size 20, the sort by user name ascending and no filter', () => {
    const request = lastRequest();

    expect(request.request.method).toBe('GET');
    expect(params(request)).toEqual({
      page: '1',
      pageSize: '20',
      sortColumn: 'username',
      sortDirection: 'Ascending',
    });
  });

  it('exposes the items and the total of the answer', async () => {
    lastRequest().flush(page(23));
    await settle();

    expect(facade.loaded()).toBe(true);
    expect(facade.total()).toBe(23);
    expect(facade.items().map((user) => user.username)).toEqual(['admin']);
    expect(facade.failed()).toBe(false);
  });

  it('is loading until the answer arrives', async () => {
    const request = lastRequest();
    expect(facade.loading()).toBe(true);

    request.flush(page(1));
    await settle();

    expect(facade.loading()).toBe(false);
  });

  it('a failed load is reported as failure and reload asks again', async () => {
    lastRequest().flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(facade.failed()).toBe(true);
    expect(facade.loading()).toBe(false);

    facade.reload();
    const retry = lastRequest();
    expect(facade.failed()).toBe(false);
    retry.flush(page(2));
    await settle();

    expect(facade.failed()).toBe(false);
    expect(facade.total()).toBe(2);
  });

  it('sends the search, the role and the status once they are set', () => {
    lastRequest().flush(page(1));
    facade.setSearch('  ros ');
    facade.setRole('Driver');
    facade.setStatus('Disabled');

    expect(params(lastRequest())).toEqual({
      page: '1',
      pageSize: '20',
      sortColumn: 'username',
      sortDirection: 'Ascending',
      usernameContains: 'ros',
      role: 'Driver',
      status: 'Disabled',
    });
  });

  it('setting a search equal to the current one changes nothing and sends no request', () => {
    lastRequest().flush(page(50));
    facade.setSearch('ros');
    lastRequest().flush(page(50));
    facade.setPage(2);
    lastRequest().flush(page(50));

    facade.setSearch('ros');
    TestBed.tick();

    http.expectNone((request) => request.url === URL);
    expect(facade.page()).toBe(2);
  });

  it('clearing the filters empties the search, the role and the status and returns to page 1', () => {
    lastRequest().flush(page(1));
    facade.setSearch('ros');
    facade.setRole('Driver');
    facade.setStatus('Disabled');
    lastRequest().flush(page(50));
    facade.setPage(3);
    lastRequest().flush(page(50));

    facade.clearFilters();

    expect(facade.search()).toBe('');
    expect(facade.role()).toBeNull();
    expect(facade.status()).toBeNull();
    expect(facade.page()).toBe(1);
    expect(params(lastRequest())).toEqual({
      page: '1',
      pageSize: '20',
      sortColumn: 'username',
      sortDirection: 'Ascending',
    });
  });

  it.each([
    ['the search', () => facade.setSearch('ros')],
    ['the role filter', () => facade.setRole('Admin')],
    ['the status filter', () => facade.setStatus('Active')],
    ['the sorting', () => facade.setSort('createdAt', 'Descending')],
  ])('changing %s returns the list to its first page', (_name, change) => {
    lastRequest().flush(page(50));
    facade.setPage(3);
    expect(facade.page()).toBe(3);
    lastRequest().flush(page(50));

    change();

    expect(facade.page()).toBe(1);
    expect(params(lastRequest())['page']).toBe('1');
  });

  it('changing the page keeps the other parts of the query', () => {
    lastRequest().flush(page(50));
    facade.setSort('role', 'Descending');
    lastRequest().flush(page(50));

    facade.setPage(2);

    expect(params(lastRequest())).toEqual({
      page: '2',
      pageSize: '20',
      sortColumn: 'role',
      sortDirection: 'Descending',
    });
  });

  it('the query is kept in the facade only, so a new one starts from the full list in the default order', () => {
    lastRequest().flush(page(50));
    facade.setSearch('ros');
    facade.setRole('Driver');
    facade.setSort('status', 'Descending');
    lastRequest().flush(page(5));

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    const fresh = TestBed.runInInjectionContext(() => new UsersFacade());
    TestBed.tick();
    const request = http.expectOne((r) => r.url === URL);

    expect(fresh.search()).toBe('');
    expect(params(request)).toEqual({
      page: '1',
      pageSize: '20',
      sortColumn: 'username',
      sortDirection: 'Ascending',
    });
  });

  describe('create', () => {
    const post = () => http.match((r) => r.url === URL && r.method === 'POST');
    const created = { id: '9', username: 'm.rossi', role: 'BackOffice', status: 'Active' };

    beforeEach(() => {
      TestBed.inject(TranslateService).use('it');
      lastRequest().flush(page(50));
    });

    it('sends the values as given, shows the toast and reloads keeping search, filters, sorting and page', async () => {
      facade.setSearch('ros');
      facade.setRole('Driver');
      lastRequest().flush(page(50));
      facade.setSort('role', 'Descending');
      lastRequest().flush(page(50));
      facade.setPage(2);
      lastRequest().flush(page(50));

      const outcome = facade.create('m.rossi', 'Password1!', 'BackOffice');
      const [request] = post();
      expect(request.request.body).toEqual({
        username: 'm.rossi',
        password: 'Password1!',
        role: 'BackOffice',
      });
      request.flush(created, { status: 201, statusText: 'Created' });

      expect(await outcome).toBe('created');
      expect(TestBed.inject(Toast).current()).toBe('Utente m.rossi creato');
      expect(facade.creating()).toBe(false);
      const reload = lastRequest();
      expect(params(reload)).toEqual({
        page: '2',
        pageSize: '20',
        sortColumn: 'role',
        sortDirection: 'Descending',
        usernameContains: 'ros',
        role: 'Driver',
      });
    });

    it('gives the ApiError back on refusal, shows no toast and does not reload', async () => {
      const outcome = facade.create('m.rossi', 'Password1!', 'BackOffice');
      post()[0].flush(
        { errorCode: 'Identity.User.UsernameAlreadyTaken', detail: 'Già in uso.' },
        { status: 409, statusText: 'Conflict' },
      );

      expect(await outcome).toEqual({
        kind: 'domain',
        errorCode: 'Identity.User.UsernameAlreadyTaken',
        detail: 'Già in uso.',
      });
      expect(TestBed.inject(Toast).current()).toBeNull();
      expect(facade.creating()).toBe(false);
      TestBed.tick();
      http.expectNone((r) => r.url === URL && r.method === 'GET');
    });

    it('a failure after the 201 is not reported as a refused creation and releases the pending flag', async () => {
      const toast = TestBed.inject(Toast);
      vi.spyOn(toast, 'success').mockImplementation(() => {
        throw new Error('toast failed');
      });

      const outcome = facade.create('m.rossi', 'Password1!', 'BackOffice');
      post()[0].flush(created, { status: 201, statusText: 'Created' });

      await expect(outcome).rejects.toThrow('toast failed');
      expect(facade.creating()).toBe(false);
    });

    it('is pending while the request runs, and two calls send one request', async () => {
      const first = facade.create('m.rossi', 'Password1!', 'BackOffice');
      const second = facade.create('m.rossi', 'Password1!', 'BackOffice');

      expect(facade.creating()).toBe(true);
      expect(await second).toBe('ignored');
      const requests = post();
      expect(requests).toHaveLength(1);

      requests[0].flush(created, { status: 201, statusText: 'Created' });
      await first;
      expect(facade.creating()).toBe(false);
    });
  });

  it('exposes the id of the signed-in user, and none when nobody is signed in', () => {
    sessionUser.set(null);
    expect(facade.currentUserId()).toBeNull();

    sessionUser.set(userWithRole('Admin'));
    expect(facade.currentUserId()).toBe('1');
  });

  describe('disable', () => {
    const post = () => http.match((r) => r.url === `${URL}/2/disable` && r.method === 'POST');
    const noContent = { status: 204, statusText: 'No Content' };

    beforeEach(() => {
      TestBed.inject(TranslateService).use('it');
      lastRequest().flush(page(50));
    });

    it('posts to the disable address, shows the toast and reloads keeping search, filters, sorting and page', async () => {
      facade.setSearch('ros');
      facade.setStatus('Active');
      lastRequest().flush(page(50));
      facade.setSort('role', 'Descending');
      lastRequest().flush(page(50));
      facade.setPage(2);
      lastRequest().flush(page(50));

      const outcome = facade.disable('2', 'a.rossetti');
      const [request] = post();
      request.flush(null, noContent);

      expect(await outcome).toBe('disabled');
      expect(TestBed.inject(Toast).current()).toBe('Utente a.rossetti disabilitato');
      expect(facade.disabling()).toBe(false);
      expect(params(lastRequest())).toEqual({
        page: '2',
        pageSize: '20',
        sortColumn: 'role',
        sortDirection: 'Descending',
        usernameContains: 'ros',
        status: 'Active',
      });
    });

    it('gives the ApiError back on refusal, shows no toast and does not reload', async () => {
      const outcome = facade.disable('2', 'a.rossetti');
      post()[0].flush(
        { errorCode: 'Identity.User.CannotDisableSelf', detail: 'Non puoi disabilitarti.' },
        { status: 409, statusText: 'Conflict' },
      );

      expect(await outcome).toEqual({
        kind: 'domain',
        errorCode: 'Identity.User.CannotDisableSelf',
        detail: 'Non puoi disabilitarti.',
      });
      expect(TestBed.inject(Toast).current()).toBeNull();
      expect(facade.disabling()).toBe(false);
      TestBed.tick();
      http.expectNone((r) => r.url === URL && r.method === 'GET');
    });

    it('a failure after the 204 is not reported as a refusal and releases the pending flag', async () => {
      vi.spyOn(TestBed.inject(Toast), 'success').mockImplementation(() => {
        throw new Error('toast failed');
      });

      const outcome = facade.disable('2', 'a.rossetti');
      post()[0].flush(null, noContent);

      await expect(outcome).rejects.toThrow('toast failed');
      expect(facade.disabling()).toBe(false);
    });

    it('is pending while the request runs, and two calls send one request', async () => {
      const first = facade.disable('2', 'a.rossetti');
      const second = facade.disable('2', 'a.rossetti');

      expect(facade.disabling()).toBe(true);
      expect(await second).toBe('ignored');
      const requests = post();
      expect(requests).toHaveLength(1);

      requests[0].flush(null, noContent);
      await first;
      expect(facade.disabling()).toBe(false);
    });
  });

  describe('enable', () => {
    const post = (id = '3') =>
      http.match((r) => r.url === `${URL}/${id}/enable` && r.method === 'POST');
    const noContent = { status: 204, statusText: 'No Content' };

    beforeEach(() => {
      TestBed.inject(TranslateService).use('it');
      lastRequest().flush(page(50));
    });

    it('posts to the enable address, shows the toast and reloads keeping search, filters, sorting and page', async () => {
      facade.setSearch('ros');
      facade.setRole('Driver');
      lastRequest().flush(page(50));
      facade.setSort('createdAt', 'Descending');
      lastRequest().flush(page(50));
      facade.setPage(2);
      lastRequest().flush(page(50));

      const done = facade.enable('3', 'f.esposito');
      expect(facade.enablingId()).toBe('3');
      post()[0].flush(null, noContent);
      await done;

      expect(TestBed.inject(Toast).current()).toBe('Utente f.esposito riattivato');
      expect(facade.enablingId()).toBeNull();
      expect(facade.enableNotice()).toBeNull();
      expect(params(lastRequest())).toEqual({
        page: '2',
        pageSize: '20',
        sortColumn: 'createdAt',
        sortDirection: 'Descending',
        usernameContains: 'ros',
        role: 'Driver',
      });
    });

    it('a refusal with a detail becomes the notice, with no toast and no reload', async () => {
      const done = facade.enable('3', 'f.esposito');
      post()[0].flush(
        { errorCode: 'Identity.User.NotFound', detail: 'Utente non trovato.' },
        { status: 404, statusText: 'Not Found' },
      );
      await done;

      expect(facade.enableNotice()).toEqual({ detail: 'Utente non trovato.' });
      expect(facade.enablingId()).toBeNull();
      expect(TestBed.inject(Toast).current()).toBeNull();
      TestBed.tick();
      http.expectNone((r) => r.url === URL && r.method === 'GET');
    });

    it('a failure without a detail becomes the generic notice', async () => {
      const done = facade.enable('3', 'f.esposito');
      post()[0].flush(null, { status: 500, statusText: 'Server Error' });
      await done;

      expect(facade.enableNotice()).toEqual({ key: 'errors.generic' });
    });

    it.each([
      ['a change of search', () => facade.setSearch('x')],
      ['a change of role', () => facade.setRole('Driver')],
      ['a change of status', () => facade.setStatus('Disabled')],
      ['clearing the filters', () => facade.clearFilters()],
      ['a change of sorting', () => facade.setSort('role', 'Ascending')],
      ['a change of page', () => facade.setPage(2)],
      ['opening a dialog', () => facade.clearEnableNotice()],
      ['a new enabling', () => void facade.enable('3', 'f.esposito')],
    ] as [string, () => void][])('the notice disappears at %s', async (_name, action) => {
      const done = facade.enable('3', 'f.esposito');
      post()[0].flush(null, { status: 500, statusText: 'Server Error' });
      await done;
      expect(facade.enableNotice()).not.toBeNull();

      action();

      expect(facade.enableNotice()).toBeNull();
      http.match(() => true);
    });

    it('a disabling clears the notice when it starts', async () => {
      const done = facade.enable('3', 'f.esposito');
      post()[0].flush(null, { status: 500, statusText: 'Server Error' });
      await done;

      void facade.disable('2', 'a.rossetti');

      expect(facade.enableNotice()).toBeNull();
      http.match(() => true);
    });

    it('a failure after the 204 releases the pending state', async () => {
      vi.spyOn(TestBed.inject(Toast), 'success').mockImplementation(() => {
        throw new Error('toast failed');
      });

      const done = facade.enable('3', 'f.esposito');
      post()[0].flush(null, noContent);

      await expect(done).rejects.toThrow('toast failed');
      expect(facade.enablingId()).toBeNull();
    });

    it('is pending while the request runs, and two calls send one request', async () => {
      const first = facade.enable('3', 'f.esposito');
      const second = facade.enable('3', 'f.esposito');

      expect(facade.enablingId()).toBe('3');
      await second;
      const requests = post();
      expect(requests).toHaveLength(1);

      requests[0].flush(null, noContent);
      await first;
      expect(facade.enablingId()).toBeNull();
    });
  });
});
