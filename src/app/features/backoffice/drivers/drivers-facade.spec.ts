import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { userWithRole } from '../../../core/testing/dom-testing';
import { Toast } from '../../../core/toast/toast';
import { DriversFacade } from './drivers-facade';
import type { DriverListPage } from './drivers-api';

const URL = '/api/registry/drivers';

const settle = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve));
  TestBed.tick();
};

const page = (total: number): DriverListPage => ({
  data: [
    {
      id: '1',
      firstName: 'Luca',
      lastName: 'Di Febo',
      phone: '333 418 2291',
      account: null,
      status: 'Active',
      lastModifiedAt: '2026-11-16T08:00:00Z',
      version: 1,
    },
  ],
  totalCount: total,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
});

describe('DriversFacade', () => {
  let http: HttpTestingController;
  let facade: DriversFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DriversFacade,
        provideTestI18n(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(DriversFacade);
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

  const defaults = {
    page: '1',
    pageSize: '20',
    sortColumn: 'name',
    sortDirection: 'Ascending',
  };

  it('the first request carries page 1, 20 per page, the sort by name ascending and no filter', () => {
    const request = lastRequest();

    expect(request.request.method).toBe('GET');
    expect(params(request)).toEqual(defaults);
  });

  it('exposes the items and the total of the answer', async () => {
    lastRequest().flush(page(23));
    await settle();

    expect(facade.loaded()).toBe(true);
    expect(facade.total()).toBe(23);
    expect(facade.items().map((driver) => driver.lastName)).toEqual(['Di Febo']);
    expect(facade.failed()).toBe(false);
  });

  it('reading the same list again keeps its rows: reloading, not loading, until the answer', async () => {
    lastRequest().flush(page(1));
    await settle();

    facade.reload();
    const again = lastRequest();
    expect(facade.loading()).toBe(false);
    expect(facade.reloading()).toBe(true);
    expect(facade.total()).toBe(1);

    again.flush(page(2));
    await settle();

    expect(facade.reloading()).toBe(false);
    expect(facade.total()).toBe(2);
  });

  it('a failed load is reported as failure', async () => {
    lastRequest().flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(facade.failed()).toBe(true);
    expect(facade.loading()).toBe(false);
  });

  it('sends the trimmed search and the status once they are set', () => {
    lastRequest().flush(page(1));
    facade.setSearch('  febo ');
    facade.setStatus('Deactivated');

    expect(params(lastRequest())).toEqual({
      ...defaults,
      search: 'febo',
      status: 'Deactivated',
    });
  });

  it('clearing the status back to all drops it from the request', () => {
    lastRequest().flush(page(1));
    facade.setStatus('Active');
    lastRequest().flush(page(1));

    facade.setStatus(null);

    expect(params(lastRequest())).toEqual(defaults);
  });

  it.each([
    ['the search', () => facade.setSearch('ab')],
    ['the status filter', () => facade.setStatus('Active')],
    ['the sorting', () => facade.setSort('lastModifiedAt', 'Descending')],
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
    facade.setSort('lastModifiedAt', 'Descending');
    lastRequest().flush(page(50));

    facade.setPage(2);

    expect(params(lastRequest())).toEqual({
      page: '2',
      pageSize: '20',
      sortColumn: 'lastModifiedAt',
      sortDirection: 'Descending',
    });
  });

  it('the query is kept in the facade only, so a new one starts from the full list in name order', () => {
    lastRequest().flush(page(50));
    facade.setSearch('ab');
    facade.setStatus('Active');
    facade.setSort('lastModifiedAt', 'Descending');
    lastRequest().flush(page(5));

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(TestBed.inject(Router).url).toBe('/');

    const fresh = TestBed.runInInjectionContext(() => new DriversFacade());
    TestBed.tick();
    const request = http.expectOne((r) => r.url === URL);

    expect(fresh.search()).toBe('');
    expect(params(request)).toEqual(defaults);
  });

  const values = { firstName: 'Luca', lastName: 'Di Febo', phone: null, userId: null };
  const created = { ...page(1).data[0], id: '9', version: 1 };

  it('a created driver is toasted by name and the list is read again keeping search, filter and page', async () => {
    lastRequest().flush(page(50));
    facade.setSearch('feb');
    facade.setStatus('Active');
    lastRequest().flush(page(50));
    facade.setPage(2);
    lastRequest().flush(page(50));

    const outcome = facade.save(null, values);
    http
      .expectOne((r) => r.url === URL && r.method === 'POST')
      .flush(created, { status: 201, statusText: 'Created' });

    expect(await outcome).toBe('saved');
    expect(TestBed.inject(Toast).current()).toBe('Autista Luca Di Febo creato');
    expect(params(lastRequest())).toEqual({
      ...defaults,
      search: 'feb',
      status: 'Active',
      page: '2',
    });
  });

  it('an update goes to the driver with the version it was read at', async () => {
    lastRequest().flush(page(1));
    const driver = page(1).data[0];

    const outcome = facade.save({ ...driver, version: 4 }, values);
    const put = http.expectOne((r) => r.url === `${URL}/1`);

    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ ...values, version: 4 });
    put.flush(null, { status: 204, statusText: 'No Content' });
    expect(await outcome).toBe('saved');
    expect(TestBed.inject(Toast).current()).toBe('Autista Luca Di Febo modificato');
    http.match(() => true);
  });

  it('a save refused with 409 answers the error, shows no toast and reads the list again keeping its state', async () => {
    lastRequest().flush(page(50));
    facade.setSearch('feb');
    lastRequest().flush(page(50));
    facade.setPage(2);
    lastRequest().flush(page(50));

    const outcome = facade.save(null, values);
    http
      .expectOne((r) => r.method === 'POST')
      .flush(
        { errorCode: 'Registry.Driver.AccountTaken', detail: 'Account già collegato.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(await outcome).toMatchObject({ kind: 'domain', detail: 'Account già collegato.' });
    expect(TestBed.inject(Toast).current()).toBeNull();
    expect(facade.saving()).toBe(false);
    expect(params(lastRequest())).toEqual({ ...defaults, search: 'feb', page: '2' });
  });

  it('a save refused with 409 while a dialog is open reads its linkable accounts again', async () => {
    lastRequest().flush(page(1));
    facade.readAccounts('7');
    TestBed.tick();
    http.expectOne((r) => r.url === `${URL}/linkable-accounts`).flush([]);
    await settle();

    const outcome = facade.save(null, values);
    http
      .expectOne((r) => r.method === 'POST')
      .flush(
        { errorCode: 'Registry.Driver.AccountTaken', detail: 'Account già collegato.' },
        { status: 409, statusText: 'Conflict' },
      );
    await outcome;
    TestBed.tick();

    const again = http.expectOne((r) => r.url === `${URL}/linkable-accounts`);
    expect(again.request.params.get('driverId')).toBe('7');
    again.flush([{ userId: 'u2', username: 'a.rossi', isDisabled: false }]);
    await settle();
    expect(facade.linkableAccounts()).toEqual([
      { userId: 'u2', username: 'a.rossi', isDisabled: false },
    ]);
    http.match(() => true);
  });

  it('a save refused without a 409 answers the error and leaves the list alone', async () => {
    lastRequest().flush(page(1));

    const outcome = facade.save(null, values);
    http
      .expectOne((r) => r.method === 'POST')
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(await outcome).toMatchObject({ kind: 'generic' });
    expect(TestBed.inject(Toast).current()).toBeNull();
    TestBed.tick();
    http.expectNone((r) => r.url === URL && r.method === 'GET');
  });

  it('a second save while one is under way is ignored', async () => {
    lastRequest().flush(page(1));

    const first = facade.save(null, values);
    const second = await facade.save(null, values);

    expect(second).toBe('ignored');
    expect(facade.saving()).toBe(true);
    http.expectOne((r) => r.method === 'POST').flush(created);
    await first;
    http.match(() => true);
  });

  it('the linkable accounts are read for the driver whose dialog is open, and no more once it is closed', async () => {
    lastRequest().flush(page(1));
    expect(http.match((r) => r.url.endsWith('/linkable-accounts'))).toHaveLength(0);
    expect(facade.linkableAccounts()).toBeNull();

    facade.readAccounts('7');
    TestBed.tick();
    const request = http.expectOne((r) => r.url === `${URL}/linkable-accounts`);
    expect(request.request.params.get('driverId')).toBe('7');
    request.flush([{ userId: 'u1', username: 'l.difebo', isDisabled: false }]);
    await settle();

    expect(facade.linkableAccounts()).toEqual([
      { userId: 'u1', username: 'l.difebo', isDisabled: false },
    ]);

    facade.stopReadingAccounts();
    TestBed.tick();
    expect(facade.linkableAccounts()).toBeNull();

    facade.readAccounts(null);
    TestBed.tick();
    const again = http.expectOne((r) => r.url === `${URL}/linkable-accounts`);
    expect(again.request.params.has('driverId')).toBe(false);
  });

  describe('Admin account creation', () => {
    const readAccounts = async () => {
      facade.readAccounts(null);
      TestBed.tick();
      http.expectOne((r) => r.url === `${URL}/linkable-accounts`).flush([]);
      await settle();
    };

    const facadeFor = (role: 'Admin' | 'BackOffice') => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          DriversFacade,
          provideTestI18n(),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: Session, useValue: { user: signal(userWithRole(role)).asReadonly() } },
        ],
      });
      return TestBed.inject(DriversFacade);
    };

    it('only an Admin session is an admin', () => {
      expect(facade.isAdmin()).toBe(false);
      expect(facadeFor('Admin').isAdmin()).toBe(true);
      expect(facadeFor('BackOffice').isAdmin()).toBe(false);
    });

    it('the account is created through the Identity user creation with the role Driver, returns its id, reads the accounts again and toasts nothing', async () => {
      await readAccounts();

      const outcome = facade.createAccount('g.ciccone', 'Password1!');
      const post = http.expectOne((r) => r.url === '/api/identity/users' && r.method === 'POST');
      expect(post.request.body).toEqual({
        username: 'g.ciccone',
        password: 'Password1!',
        role: 'Driver',
      });
      post.flush(
        { id: 'u9', role: 'Driver', status: 'Active' },
        { status: 201, statusText: 'Created' },
      );

      expect(await outcome).toEqual({ userId: 'u9' });
      TestBed.tick();
      http.expectOne((r) => r.url === `${URL}/linkable-accounts`);
      expect(TestBed.inject(Toast).current()).toBeNull();
      expect(facade.creatingAccount()).toBe(false);
    });

    it('a refused creation answers the error and reads nothing again', async () => {
      await readAccounts();

      const outcome = facade.createAccount('g.ciccone', 'Password1!');
      http
        .expectOne((r) => r.url === '/api/identity/users')
        .flush(
          {
            errorCode: 'Identity.User.UsernameAlreadyTaken',
            detail: 'Il nome utente è già in uso.',
          },
          { status: 409, statusText: 'Conflict' },
        );

      expect(await outcome).toEqual({
        kind: 'domain',
        status: 409,
        errorCode: 'Identity.User.UsernameAlreadyTaken',
        detail: 'Il nome utente è già in uso.',
      });
      TestBed.tick();
      http.expectNone((r) => r.url === `${URL}/linkable-accounts`);
      expect(facade.creatingAccount()).toBe(false);
    });

    it('a second creation while one is under way is ignored', async () => {
      await readAccounts();

      const first = facade.createAccount('g.ciccone', 'Password1!');
      expect(await facade.createAccount('g.ciccone', 'Password1!')).toBe('ignored');
      http.expectOne((r) => r.url === '/api/identity/users').flush({ id: 'u9' });
      await first;
    });
  });

  describe('deactivate and reactivate', () => {
    const conflict = {
      errorCode: 'Registry.Driver.ConcurrentUpdate',
      detail: "L'autista è stato modificato da un altro utente. Ricarica la lista e riprova.",
    };
    const noContent = { status: 204, statusText: 'No Content' };

    it('deactivating sends the version read, toasts by name and reads the list again keeping its state', async () => {
      lastRequest().flush(page(50));
      facade.setSearch('feb');
      lastRequest().flush(page(50));
      facade.setPage(2);
      lastRequest().flush(page(50));
      const driver = { ...page(1).data[0], version: 4 };

      const outcome = facade.deactivate(driver);
      const post = http.expectOne((r) => r.url === `${URL}/1/deactivate`);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual({ version: 4 });
      expect(facade.deactivating()).toBe(true);
      post.flush(null, noContent);

      expect(await outcome).toBe('deactivated');
      expect(facade.deactivating()).toBe(false);
      expect(TestBed.inject(Toast).current()).toBe('Autista Luca Di Febo disattivato');
      expect(params(lastRequest())).toEqual({ ...defaults, search: 'feb', page: '2' });
    });

    it('a second deactivation while one is under way is ignored', async () => {
      lastRequest().flush(page(1));
      const driver = page(1).data[0];

      const first = facade.deactivate(driver);
      expect(await facade.deactivate(driver)).toBe('ignored');
      http.expectOne((r) => r.url === `${URL}/1/deactivate`).flush(null, noContent);
      await first;
      http.match(() => true);
    });

    it('a deactivation refused with 409 answers the error and reads the list again', async () => {
      lastRequest().flush(page(1));

      const outcome = facade.deactivate(page(1).data[0]);
      http
        .expectOne((r) => r.url === `${URL}/1/deactivate`)
        .flush(conflict, { status: 409, statusText: 'Conflict' });

      expect(await outcome).toMatchObject({ kind: 'domain', detail: conflict.detail });
      expect(TestBed.inject(Toast).current()).toBeNull();
      expect(facade.deactivating()).toBe(false);
      lastRequest();
    });

    it('a deactivation refused without a 409 answers the error and leaves the list alone', async () => {
      lastRequest().flush(page(1));

      const outcome = facade.deactivate(page(1).data[0]);
      http
        .expectOne((r) => r.url === `${URL}/1/deactivate`)
        .flush(null, { status: 500, statusText: 'Server Error' });

      expect(await outcome).toMatchObject({ kind: 'generic' });
      TestBed.tick();
      http.expectNone((r) => r.url === URL && r.method === 'GET');
    });

    it('reactivating sends the version read, shows the busy row, toasts by name and reads the list again', async () => {
      lastRequest().flush(page(1));
      const driver = { ...page(1).data[0], version: 6, status: 'Deactivated' as const };

      const done = facade.reactivate(driver);
      const post = http.expectOne((r) => r.url === `${URL}/1/reactivate`);
      expect(post.request.body).toEqual({ version: 6 });
      expect(facade.reactivatingId()).toBe('1');
      post.flush(null, noContent);
      await done;

      expect(facade.reactivatingId()).toBeNull();
      expect(facade.reactivateNotice()).toBeNull();
      expect(TestBed.inject(Toast).current()).toBe('Autista Luca Di Febo riattivato');
      lastRequest();
    });

    it('a second reactivation while one is under way is ignored', async () => {
      lastRequest().flush(page(1));
      const driver = page(1).data[0];

      const first = facade.reactivate(driver);
      await facade.reactivate({ ...driver, id: '2' });
      http.expectOne((r) => r.url === `${URL}/1/reactivate`).flush(null, noContent);
      await first;
      http.expectNone((r) => r.url === `${URL}/2/reactivate`);
      http.match(() => true);
    });

    it('a reactivation refused with 409 keeps the message as a notice and reads the list again', async () => {
      lastRequest().flush(page(1));

      const done = facade.reactivate(page(1).data[0]);
      http
        .expectOne((r) => r.url === `${URL}/1/reactivate`)
        .flush(conflict, { status: 409, statusText: 'Conflict' });
      await done;

      expect(facade.reactivateNotice()).toEqual({ detail: conflict.detail });
      expect(facade.reactivatingId()).toBeNull();
      expect(TestBed.inject(Toast).current()).toBeNull();
      lastRequest();
    });

    it('a reactivation failing without a detail keeps the generic notice', async () => {
      lastRequest().flush(page(1));

      const done = facade.reactivate(page(1).data[0]);
      http
        .expectOne((r) => r.url === `${URL}/1/reactivate`)
        .flush(null, { status: 500, statusText: 'Server Error' });
      await done;

      expect(facade.reactivateNotice()).toEqual({ key: 'errors.generic' });
      http.match(() => true);
    });

    it('the reactivation notice goes away when the search, the filter, the sorting, the page or a new action changes', async () => {
      const refuse = async () => {
        const done = facade.reactivate(page(1).data[0]);
        http
          .expectOne((r) => r.url === `${URL}/1/reactivate`)
          .flush(null, { status: 500, statusText: 'Server Error' });
        await done;
        expect(facade.reactivateNotice()).not.toBeNull();
      };
      lastRequest().flush(page(1));

      await refuse();
      facade.setSearch('feb');
      expect(facade.reactivateNotice()).toBeNull();
      lastRequest().flush(page(1));

      await refuse();
      facade.setStatus('Active');
      expect(facade.reactivateNotice()).toBeNull();
      lastRequest().flush(page(1));

      await refuse();
      facade.setSort('lastModifiedAt', 'Descending');
      expect(facade.reactivateNotice()).toBeNull();
      lastRequest().flush(page(1));

      await refuse();
      facade.setPage(2);
      expect(facade.reactivateNotice()).toBeNull();
      lastRequest().flush(page(1));

      await refuse();
      facade.clearReactivateNotice();
      expect(facade.reactivateNotice()).toBeNull();
      http.match(() => true);
    });
  });
});
