import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Toast } from '../../../core/toast/toast';
import { VehiclesFacade } from './vehicles-facade';
import type { VehiclePage } from './vehicles-api';

const URL = '/api/registry/vehicles';

const settle = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve));
  TestBed.tick();
};

const page = (total: number): VehiclePage => ({
  data: [
    {
      id: '1',
      licensePlate: 'AB123CD',
      description: 'Iveco Stralis 480',
      type: 'Tractor',
      requiresTrailer: true,
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

describe('VehiclesFacade', () => {
  let http: HttpTestingController;
  let facade: VehiclesFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        VehiclesFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(VehiclesFacade);
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
    sortColumn: 'licensePlate',
    sortDirection: 'Ascending',
  };

  it('the first request carries page 1, 20 per page, the sort by plate ascending and no filter', () => {
    const request = lastRequest();

    expect(request.request.method).toBe('GET');
    expect(params(request)).toEqual(defaults);
  });

  it('exposes the items and the total of the answer', async () => {
    lastRequest().flush(page(23));
    await settle();

    expect(facade.loaded()).toBe(true);
    expect(facade.total()).toBe(23);
    expect(facade.items().map((vehicle) => vehicle.licensePlate)).toEqual(['AB123CD']);
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
    // nothing was shown before: the retry is a load, so the indicator replaces the notice
    expect(facade.loading()).toBe(true);
    expect(facade.reloading()).toBe(false);
    retry.flush(page(2));
    await settle();

    expect(facade.failed()).toBe(false);
    expect(facade.total()).toBe(2);
  });

  it('sends the search, the type and the status once they are set', () => {
    lastRequest().flush(page(1));
    facade.setSearch('  ab 456 ');
    facade.setType('Tractor');
    facade.setStatus('Decommissioned');

    expect(params(lastRequest())).toEqual({
      ...defaults,
      search: 'ab 456',
      type: 'Tractor',
      status: 'Decommissioned',
    });
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

  it('clearing a filter back to all drops it from the request', () => {
    lastRequest().flush(page(1));
    facade.setType('Trailer');
    lastRequest().flush(page(1));

    facade.setType(null);

    expect(params(lastRequest())).toEqual(defaults);
  });

  it.each([
    ['the search', () => facade.setSearch('ab')],
    ['the type filter', () => facade.setType('Trailer')],
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
    facade.setSort('description', 'Descending');
    lastRequest().flush(page(50));

    facade.setPage(2);

    expect(params(lastRequest())).toEqual({
      page: '2',
      pageSize: '20',
      sortColumn: 'description',
      sortDirection: 'Descending',
    });
  });

  it('the query is kept in the facade only, so a new one starts from the full list in plate order', () => {
    lastRequest().flush(page(50));
    facade.setSearch('ab');
    facade.setType('Tractor');
    facade.setSort('lastModifiedAt', 'Descending');
    lastRequest().flush(page(5));

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    const fresh = TestBed.runInInjectionContext(() => new VehiclesFacade());
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
    const values = {
      licensePlate: 'ab 456-cd',
      description: 'Iveco Stralis 480',
      type: 'Tractor' as const,
      requiresTrailer: true,
    };
    const row = page(1).data[0];
    const writes = (method: string) =>
      http.match((r) => r.url.startsWith(URL) && r.method === method);

    it('a create posts the values, toasts the plate as the backend stored it and reloads the list', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.save(null, values);
      const [post] = writes('POST');
      expect(post.request.body).toEqual(values);
      expect(facade.saving()).toBe(true);
      post.flush(
        { ...row, id: '9', licensePlate: 'AB456CD' },
        { status: 201, statusText: 'Created' },
      );

      expect(await outcome).toBe('saved');
      expect(facade.saving()).toBe(false);
      expect(TestBed.inject(Toast).current()).toBe('Mezzo AB456CD creato');
      lastRequest();
    });

    it('an update puts the values with the version of the row and toasts the normalised plate', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.save({ ...row, version: 7 }, values);
      const [put] = writes('PUT');
      expect(put.request.url).toBe(`${URL}/1`);
      expect(put.request.body).toEqual({ ...values, version: 7 });
      put.flush(null, { status: 204, statusText: 'No Content' });

      expect(await outcome).toBe('saved');
      expect(TestBed.inject(Toast).current()).toBe('Mezzo AB456CD modificato');
      lastRequest();
    });

    it('a 409 is returned as the error with no toast, and the list is read again at once', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.save(row, values);
      writes('PUT')[0].flush(
        { errorCode: 'Registry.Vehicle.ConcurrentUpdate', detail: 'Modificato da altri.' },
        { status: 409, statusText: 'Conflict' },
      );

      expect(await outcome).toEqual({
        kind: 'domain',
        status: 409,
        errorCode: 'Registry.Vehicle.ConcurrentUpdate',
        detail: 'Modificato da altri.',
      });
      expect(facade.saving()).toBe(false);
      expect(TestBed.inject(Toast).current()).toBeNull();
      lastRequest();
    });

    it('a refusal that is not a 409 does not reload the list', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.save(row, values);
      writes('PUT')[0].flush(null, { status: 500, statusText: 'Server Error' });

      expect(await outcome).toEqual({ kind: 'generic' });
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

  describe('decommission and reactivate', () => {
    const row = page(1).data[0];
    const posts = (suffix: string) =>
      http.match((r) => r.url === `${URL}/1/${suffix}` && r.method === 'POST');
    const conflict = {
      errorCode: 'Registry.Vehicle.ConcurrentUpdate',
      detail: 'Il mezzo è stato modificato da un altro utente nel frattempo.',
    };

    it('decommission posts the version of the row, toasts the plate and reloads keeping the query', async () => {
      lastRequest().flush(page(50));
      facade.setType('Tractor');
      lastRequest().flush(page(50));
      facade.setPage(2);
      lastRequest().flush(page(50));
      await settle();

      const outcome = facade.decommission({ ...row, version: 4 });
      const [post] = posts('decommission');
      expect(post.request.body).toEqual({ version: 4 });
      expect(facade.decommissioning()).toBe(true);
      post.flush(null, { status: 204, statusText: 'No Content' });

      expect(await outcome).toBe('decommissioned');
      expect(facade.decommissioning()).toBe(false);
      expect(TestBed.inject(Toast).current()).toBe('Mezzo AB123CD dismesso');
      expect(params(lastRequest())).toEqual({ ...defaults, type: 'Tractor', page: '2' });
    });

    it('a decommission refused with 409 returns the error, shows no toast and reloads the list', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.decommission(row);
      posts('decommission')[0].flush(conflict, { status: 409, statusText: 'Conflict' });

      expect(await outcome).toEqual({ kind: 'domain', status: 409, ...conflict });
      expect(TestBed.inject(Toast).current()).toBeNull();
      lastRequest();
    });

    it('a second decommission while one is running is ignored', async () => {
      lastRequest().flush(page(1));
      await settle();

      const first = facade.decommission(row);
      expect(await facade.decommission(row)).toBe('ignored');
      expect(posts('decommission')).toHaveLength(1);
      void first;
    });

    it('reactivate posts the version of the row, marks the row, toasts the plate and reloads', async () => {
      lastRequest().flush(page(1));
      await settle();

      const done = facade.reactivate({ ...row, status: 'Decommissioned', version: 6 });
      const [post] = posts('reactivate');
      expect(post.request.body).toEqual({ version: 6 });
      expect(facade.reactivatingId()).toBe('1');
      post.flush(null, { status: 204, statusText: 'No Content' });
      await done;

      expect(facade.reactivatingId()).toBeNull();
      expect(facade.reactivateNotice()).toBeNull();
      expect(TestBed.inject(Toast).current()).toBe('Mezzo AB123CD riattivato');
      lastRequest();
    });

    it('a failed reactivate shows the backend detail, or the generic message, as a notice', async () => {
      lastRequest().flush(page(1));
      await settle();

      const first = facade.reactivate(row);
      posts('reactivate')[0].flush(
        { errorCode: 'Registry.Vehicle.NotFound', detail: 'Mezzo non trovato.' },
        { status: 404, statusText: 'Not Found' },
      );
      await first;
      expect(facade.reactivateNotice()).toEqual({ detail: 'Mezzo non trovato.' });
      expect(facade.reactivatingId()).toBeNull();
      TestBed.tick();
      http.expectNone((r) => r.url === URL && r.method === 'GET');

      const second = facade.reactivate(row);
      posts('reactivate')[0].flush(null, { status: 500, statusText: 'Server Error' });
      await second;
      expect(facade.reactivateNotice()).toEqual({ key: 'errors.generic' });
      expect(TestBed.inject(Toast).current()).toBeNull();
    });

    it('a reactivate refused with 409 keeps the message as a notice and reloads the list', async () => {
      lastRequest().flush(page(1));
      await settle();

      const done = facade.reactivate(row);
      posts('reactivate')[0].flush(conflict, { status: 409, statusText: 'Conflict' });
      await done;

      expect(facade.reactivateNotice()).toEqual({ detail: conflict.detail });
      lastRequest();
    });

    it.each([
      ['the search', () => facade.setSearch('ab')],
      ['the type filter', () => facade.setType('Trailer')],
      ['the status filter', () => facade.setStatus('Active')],
      ['the sorting', () => facade.setSort('description', 'Descending')],
      ['the page', () => facade.setPage(2)],
      ['an explicit clear', () => facade.clearReactivateNotice()],
    ])('the reactivate notice disappears when %s changes', async (_name, change) => {
      lastRequest().flush(page(50));
      await settle();
      const done = facade.reactivate(row);
      posts('reactivate')[0].flush(null, { status: 500, statusText: 'Server Error' });
      await done;
      expect(facade.reactivateNotice()).not.toBeNull();

      change();

      expect(facade.reactivateNotice()).toBeNull();
      http.match(() => true);
    });
  });
});
