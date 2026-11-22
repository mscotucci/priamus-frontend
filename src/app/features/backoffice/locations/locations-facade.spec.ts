import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Toast } from '../../../core/toast/toast';
import { LocationsFacade } from './locations-facade';
import type { LocationListPage } from './locations-api';

const URL = '/api/registry/locations';

const settle = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve));
  TestBed.tick();
};

const page = (total: number): LocationListPage => ({
  data: [
    {
      id: '1',
      name: 'Cava Nord',
      municipality: 'Spoltore',
      address: null,
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

describe('LocationsFacade', () => {
  let http: HttpTestingController;
  let facade: LocationsFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        LocationsFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(LocationsFacade);
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
    expect(facade.items().map((location) => location.name)).toEqual(['Cava Nord']);
    expect(facade.failed()).toBe(false);
  });

  it('is loading until the answer arrives', async () => {
    const request = lastRequest();
    expect(facade.loading()).toBe(true);

    request.flush(page(1));
    await settle();

    expect(facade.loading()).toBe(false);
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

  it('a new search is a load, not a reload', async () => {
    lastRequest().flush(page(1));
    await settle();

    facade.setSearch('xyz');
    const next = lastRequest();
    expect(facade.loading()).toBe(true);
    expect(facade.reloading()).toBe(false);
    next.flush(page(0));
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
    expect(facade.loading()).toBe(true);
    retry.flush(page(2));
    await settle();

    expect(facade.failed()).toBe(false);
    expect(facade.total()).toBe(2);
  });

  it('sends the trimmed search and the status once they are set', () => {
    lastRequest().flush(page(1));
    facade.setSearch('  spolt ');
    facade.setStatus('Deactivated');

    expect(params(lastRequest())).toEqual({
      ...defaults,
      search: 'spolt',
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

  it('setting a search equal to the current one changes nothing and sends no request', () => {
    lastRequest().flush(page(50));
    facade.setSearch('ab');
    lastRequest().flush(page(50));
    facade.setPage(2);
    lastRequest().flush(page(50));

    facade.setSearch('ab');
    TestBed.tick();

    http.expectNone((request) => request.url === URL);
    expect(facade.page()).toBe(2);
  });

  it.each([
    ['the search', (f: LocationsFacade) => f.setSearch('ab')],
    ['the status filter', (f: LocationsFacade) => f.setStatus('Active')],
    ['the sorting', (f: LocationsFacade) => f.setSort('municipality', 'Descending')],
  ])('changing %s returns the list to its first page', (_name, change) => {
    lastRequest().flush(page(50));
    facade.setPage(3);
    expect(facade.page()).toBe(3);
    lastRequest().flush(page(50));

    change(facade);

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
    facade.setSort('municipality', 'Descending');
    lastRequest().flush(page(5));

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    const fresh = TestBed.runInInjectionContext(() => new LocationsFacade());
    TestBed.tick();
    const request = http.expectOne((r) => r.url === URL);

    expect(fresh.search()).toBe('');
    expect(params(request)).toEqual(defaults);
  });

  it('reload asks for the same query again', async () => {
    lastRequest().flush(page(50));
    facade.setSearch('ab');
    lastRequest().flush(page(50));
    await settle();

    facade.reload();

    expect(params(lastRequest())).toEqual({ ...defaults, search: 'ab' });
  });

  describe('save', () => {
    const values = { name: 'Cantiere A14', municipality: 'Chieti', address: null };
    const row = page(1).data[0];
    const writes = (method: string) =>
      http.match((r) => r.url.startsWith(URL) && r.method === method);

    it('a create posts the values, toasts the stored label and reads the list again', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.save(null, values);
      const [post] = writes('POST');
      expect(post.request.body).toEqual(values);
      expect(facade.saving()).toBe(true);
      post.flush(
        { ...row, id: '9', name: 'Cantiere A14', municipality: 'Chieti' },
        { status: 201, statusText: 'Created' },
      );

      expect(await outcome).toBe('saved');
      expect(facade.saving()).toBe(false);
      expect(TestBed.inject(Toast).current()).toBe('Luogo Cantiere A14, Chieti creato');
      lastRequest();
    });

    it('an update puts the values with the version of the row, toasts "modificato" and reloads', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.save({ ...row, version: 7 }, values);
      const [put] = writes('PUT');
      expect(put.request.url).toBe(`${URL}/1`);
      expect(put.request.body).toEqual({ ...values, version: 7 });
      put.flush(null, { status: 204, statusText: 'No Content' });

      expect(await outcome).toBe('saved');
      expect(TestBed.inject(Toast).current()).toBe('Luogo Cantiere A14, Chieti modificato');
      lastRequest();
    });

    it('a refusal other than 409 is returned as the error, with no toast and no reload', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.save(null, values);
      writes('POST')[0].flush(
        {
          errorCode: 'Registry.Location.NameInvalid',
          detail: 'Il nome è obbligatorio e può avere al massimo 100 caratteri.',
        },
        { status: 400, statusText: 'Bad Request' },
      );

      expect(await outcome).toEqual({
        kind: 'domain',
        status: 400,
        errorCode: 'Registry.Location.NameInvalid',
        detail: 'Il nome è obbligatorio e può avere al massimo 100 caratteri.',
      });
      expect(facade.saving()).toBe(false);
      expect(TestBed.inject(Toast).current()).toBeNull();
      TestBed.tick();
      http.expectNone((r) => r.url === URL && r.method === 'GET');
    });

    it('a second save while one is running is ignored', async () => {
      lastRequest().flush(page(1));
      await settle();

      const first = facade.save(null, values);
      const second = await facade.save(null, values);

      expect(second).toBe('ignored');
      expect(writes('POST')).toHaveLength(1);
      void first;
    });
  });

  describe('deactivate and reactivate', () => {
    const row = page(1).data[0];
    const posts = (suffix: string) =>
      http.match((r) => r.url === `${URL}/1/${suffix}` && r.method === 'POST');
    const conflict = {
      errorCode: 'Registry.Location.ConcurrentUpdate',
      detail: 'Il luogo è stato modificato da un altro utente nel frattempo.',
    };
    const notFound = { errorCode: 'Registry.Location.NotFound', detail: 'Luogo non trovato.' };

    it('deactivate posts the version of the row, toasts the label and reads the list again', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.deactivate({ ...row, version: 4 });
      const [post] = posts('deactivate');
      expect(post.request.body).toEqual({ version: 4 });
      post.flush(null, { status: 204, statusText: 'No Content' });

      expect(await outcome).toBe('deactivated');
      expect(facade.deactivating()).toBe(false);
      expect(TestBed.inject(Toast).current()).toBe('Luogo Cava Nord, Spoltore disattivato');
      TestBed.tick();
      http.expectOne((r) => r.url === URL && r.method === 'GET');
    });

    it('a second deactivate while one is running is ignored', async () => {
      lastRequest().flush(page(1));
      await settle();

      const first = facade.deactivate(row);
      const second = await facade.deactivate(row);

      expect(second).toBe('ignored');
      expect(posts('deactivate')).toHaveLength(1);
      void first;
    });

    it('a 409 on deactivate is returned as the error and the list is read again at once', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.deactivate(row);
      posts('deactivate')[0].flush(conflict, { status: 409, statusText: 'Conflict' });

      expect(await outcome).toEqual({ kind: 'domain', status: 409, ...conflict });
      expect(TestBed.inject(Toast).current()).toBeNull();
      TestBed.tick();
      http.expectOne((r) => r.url === URL && r.method === 'GET');
    });

    it('a refusal other than 409 on deactivate does not read the list again', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.deactivate(row);
      posts('deactivate')[0].flush(notFound, { status: 404, statusText: 'Not Found' });

      expect(await outcome).toMatchObject({ kind: 'domain', status: 404 });
      TestBed.tick();
      http.expectNone((r) => r.url === URL && r.method === 'GET');
    });

    it('reactivate posts the version, marks the row busy, then toasts the label and reads the list again', async () => {
      lastRequest().flush(page(1));
      await settle();

      const done = facade.reactivate({ ...row, version: 6 });
      expect(facade.reactivatingId()).toBe('1');
      const [post] = posts('reactivate');
      expect(post.request.body).toEqual({ version: 6 });
      post.flush(null, { status: 204, statusText: 'No Content' });
      await done;

      expect(facade.reactivatingId()).toBeNull();
      expect(facade.reactivateNotice()).toBeNull();
      expect(TestBed.inject(Toast).current()).toBe('Luogo Cava Nord, Spoltore riattivato');
      TestBed.tick();
      http.expectOne((r) => r.url === URL && r.method === 'GET');
    });

    it('a failed reactivate puts the detail in the notice, and the next action on the list removes it', async () => {
      lastRequest().flush(page(1));
      await settle();

      const done = facade.reactivate(row);
      posts('reactivate')[0].flush(notFound, { status: 404, statusText: 'Not Found' });
      await done;

      expect(facade.reactivateNotice()).toEqual({ detail: 'Luogo non trovato.' });
      expect(facade.reactivatingId()).toBeNull();
      expect(TestBed.inject(Toast).current()).toBeNull();

      facade.setPage(2);
      expect(facade.reactivateNotice()).toBeNull();
      http.match(() => true);
    });

    it('a 409 on reactivate shows the backend message in the notice and the list is read again at once', async () => {
      lastRequest().flush(page(1));
      await settle();

      const done = facade.reactivate(row);
      posts('reactivate')[0].flush(conflict, { status: 409, statusText: 'Conflict' });
      await done;

      expect(facade.reactivateNotice()).toEqual({ detail: conflict.detail });
      TestBed.tick();
      http.expectOne((r) => r.url === URL && r.method === 'GET');
    });

    it('a 409 on edit is returned as the error and the list is read again at once', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.save(row, {
        name: 'Cava Sud',
        municipality: 'Spoltore',
        address: null,
      });
      http
        .match((r) => r.url === `${URL}/1` && r.method === 'PUT')[0]
        .flush(conflict, { status: 409, statusText: 'Conflict' });

      expect(await outcome).toEqual({ kind: 'domain', status: 409, ...conflict });
      TestBed.tick();
      http.expectOne((r) => r.url === URL && r.method === 'GET');
    });
  });
});
