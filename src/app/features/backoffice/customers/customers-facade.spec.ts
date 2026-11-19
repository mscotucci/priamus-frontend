import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Toast } from '../../../core/toast/toast';
import { CustomersFacade } from './customers-facade';
import type { Contract, CreateContractRequest } from './contracts-api';
import type { CustomerListPage } from './customers-api';

const URL = '/api/registry/customers';

const settle = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve));
  TestBed.tick();
};

const page = (total: number): CustomerListPage => ({
  data: [
    {
      id: '1',
      companyName: 'Comune di Penne',
      vatNumber: '01455280683',
      taxCode: null,
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

describe('CustomersFacade', () => {
  let http: HttpTestingController;
  let facade: CustomersFacade;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        CustomersFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(CustomersFacade);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
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
    sortColumn: 'companyName',
    sortDirection: 'Ascending',
  };

  it('the first request carries page 1, 20 per page, the sort by company name ascending and no filter', () => {
    const request = lastRequest();

    expect(request.request.method).toBe('GET');
    expect(params(request)).toEqual(defaults);
  });

  it('exposes the items and the total of the answer', async () => {
    lastRequest().flush(page(23));
    await settle();

    expect(facade.loaded()).toBe(true);
    expect(facade.total()).toBe(23);
    expect(facade.items().map((customer) => customer.companyName)).toEqual(['Comune di Penne']);
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
    facade.setSearch('  it 0145 ');
    facade.setStatus('Deactivated');

    expect(params(lastRequest())).toEqual({
      ...defaults,
      search: 'it 0145',
      status: 'Deactivated',
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

  it('the query is kept in the facade only, so a new one starts from the full list in company-name order', () => {
    lastRequest().flush(page(50));
    facade.setSearch('ab');
    facade.setStatus('Active');
    facade.setSort('lastModifiedAt', 'Descending');
    lastRequest().flush(page(5));

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    const fresh = TestBed.runInInjectionContext(() => new CustomersFacade());
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
      companyName: 'Edilcave SpA',
      vatNumber: 'IT 01455280683',
      taxCode: null,
      address: null,
    };
    const row = page(1).data[0];
    const writes = (method: string) =>
      http.match((r) => r.url.startsWith(URL) && r.method === method);

    it('a create posts the values, toasts the stored company name and reloads the list', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.save(null, values);
      const [post] = writes('POST');
      expect(post.request.body).toEqual(values);
      expect(facade.saving()).toBe(true);
      post.flush(
        { ...row, id: '9', companyName: 'Edilcave SpA' },
        { status: 201, statusText: 'Created' },
      );

      expect(await outcome).toBe('saved');
      expect(facade.saving()).toBe(false);
      expect(TestBed.inject(Toast).current()).toBe('Cliente Edilcave SpA creato');
      lastRequest();
    });

    it('an update puts the values with the version of the row, toasts and reloads', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.save({ ...row, version: 7 }, values);
      const [put] = writes('PUT');
      expect(put.request.url).toBe(`${URL}/1`);
      expect(put.request.body).toEqual({ ...values, version: 7 });
      put.flush(null, { status: 204, statusText: 'No Content' });

      expect(await outcome).toBe('saved');
      expect(TestBed.inject(Toast).current()).toBe('Cliente Edilcave SpA modificato');
      lastRequest();
    });

    it('a 409 is returned as the error with no toast, and the list is read again at once', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.save(row, values);
      writes('PUT')[0].flush(
        { errorCode: 'Registry.Customer.ConcurrentUpdate', detail: 'Modificato da altri.' },
        { status: 409, statusText: 'Conflict' },
      );

      expect(await outcome).toEqual({
        kind: 'domain',
        status: 409,
        errorCode: 'Registry.Customer.ConcurrentUpdate',
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

  describe('deactivate and reactivate', () => {
    const row = page(1).data[0];
    const posts = (suffix: string) =>
      http.match((r) => r.url === `${URL}/1/${suffix}` && r.method === 'POST');
    const conflict = {
      errorCode: 'Registry.Customer.ConcurrentUpdate',
      detail: 'Il cliente è stato modificato da un altro utente nel frattempo.',
    };

    it('deactivate posts the version of the row, toasts the company and reloads keeping the query', async () => {
      lastRequest().flush(page(50));
      facade.setStatus('Active');
      lastRequest().flush(page(50));
      facade.setPage(2);
      lastRequest().flush(page(50));
      await settle();

      const outcome = facade.deactivate({ ...row, version: 4 });
      const [post] = posts('deactivate');
      expect(post.request.body).toEqual({ version: 4 });
      expect(facade.deactivating()).toBe(true);
      post.flush(null, { status: 204, statusText: 'No Content' });

      expect(await outcome).toBe('deactivated');
      expect(facade.deactivating()).toBe(false);
      expect(TestBed.inject(Toast).current()).toBe('Cliente Comune di Penne disattivato');
      const reload = lastRequest();
      expect(reload.request.params.get('status')).toBe('Active');
      expect(reload.request.params.get('page')).toBe('2');
    });

    it('a deactivate refused with 409 returns the error, shows no toast and reloads the list', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.deactivate(row);
      posts('deactivate')[0].flush(conflict, { status: 409, statusText: 'Conflict' });

      expect(await outcome).toEqual({ kind: 'domain', status: 409, ...conflict });
      expect(TestBed.inject(Toast).current()).toBeNull();
      lastRequest();
    });

    it('a deactivate refused with something other than 409 does not reload the list', async () => {
      lastRequest().flush(page(1));
      await settle();

      const outcome = facade.deactivate(row);
      posts('deactivate')[0].flush(null, { status: 500, statusText: 'Server Error' });

      expect(await outcome).toEqual({ kind: 'generic' });
      TestBed.tick();
      http.expectNone((r) => r.url === URL && r.method === 'GET');
    });

    it('a second deactivate while one is running is ignored', async () => {
      lastRequest().flush(page(1));
      await settle();

      const first = facade.deactivate(row);
      expect(await facade.deactivate(row)).toBe('ignored');
      expect(posts('deactivate')).toHaveLength(1);
      void first;
    });

    it('reactivate posts the version of the row, marks the row, toasts the company and reloads', async () => {
      lastRequest().flush(page(1));
      await settle();

      const done = facade.reactivate({ ...row, status: 'Deactivated', version: 6 });
      const [post] = posts('reactivate');
      expect(post.request.body).toEqual({ version: 6 });
      expect(facade.reactivatingId()).toBe('1');
      post.flush(null, { status: 204, statusText: 'No Content' });
      await done;

      expect(facade.reactivatingId()).toBeNull();
      expect(facade.reactivateNotice()).toBeNull();
      expect(TestBed.inject(Toast).current()).toBe('Cliente Comune di Penne riattivato');
      lastRequest();
    });

    it('a failed reactivate shows the backend detail, or the generic message, as a notice', async () => {
      lastRequest().flush(page(1));
      await settle();

      const first = facade.reactivate(row);
      posts('reactivate')[0].flush(
        { errorCode: 'Registry.Customer.NotFound', detail: 'Cliente non trovato.' },
        { status: 404, statusText: 'Not Found' },
      );
      await first;
      expect(facade.reactivateNotice()).toEqual({ detail: 'Cliente non trovato.' });
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
      ['the status filter', () => facade.setStatus('Active')],
      ['the sorting', () => facade.setSort('lastModifiedAt', 'Descending')],
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

  describe('customer page and contracts', () => {
    const CONTRACTS = `${URL}/c1/contracts`;
    const at = (url: string) => {
      TestBed.tick();
      return http.expectOne((request) => request.url === url);
    };
    const contract: Contract = {
      id: 'k1',
      customerId: 'c1',
      validFrom: '2026-04-01',
      validTo: null,
      status: 'Current',
      billingLevel: 'FlatRate',
      pricingMode: 'ByTrip',
      requiredDocuments: ['DeliveryNote'],
      nightSurcharge: false,
      dayPrice: 80,
      nightPrice: null,
      nightCallFee: null,
      minimumRule: 'None',
      minimumAmount: null,
      minimumThreshold: null,
      minimumOveragePrice: null,
      version: 4,
    };
    const values: CreateContractRequest = {
      validFrom: '2026-04-01',
      validTo: null,
      billingLevel: 'FlatRate',
      pricingMode: 'ByTrip',
      requiredDocuments: ['DeliveryNote'],
      nightSurcharge: false,
      dayPrice: 80,
      nightPrice: null,
      nightCallFee: null,
      minimumRule: 'None',
      minimumAmount: null,
      minimumThreshold: null,
      minimumOveragePrice: null,
    };

    beforeEach(() => {
      http.match((request) => request.url === URL);
    });

    it('reads nothing until a customer is opened, then the customer and its contracts', async () => {
      TestBed.tick();
      http.expectNone((request) => request.url.startsWith(`${URL}/`));

      facade.openCustomer('c1');

      at(`${URL}/c1`).flush({ ...page(1).data[0], id: 'c1' });
      at(CONTRACTS).flush([contract]);
      await settle();
      expect(facade.customer.value()?.id).toBe('c1');
      expect(facade.contracts.value()).toEqual([contract]);
      http.expectNone((request) => request.url.endsWith('/k1'));
    });

    it('a customer answered 404 is not found, and any other failure is not', async () => {
      facade.openCustomer('c1');
      at(`${URL}/c1`).flush(null, { status: 404, statusText: 'Not Found' });
      at(CONTRACTS).flush([]);
      await settle();
      expect(facade.customerNotFound()).toBe(true);

      facade.openCustomer('c2');
      at(`${URL}/c2`).flush(null, { status: 500, statusText: 'Server Error' });
      at(`${URL}/c2/contracts`).flush([]);
      await settle();
      expect(facade.customerNotFound()).toBe(false);
    });

    it('reads the contract to edit only once its id is set, and a missing one is not found', async () => {
      facade.openCustomer('c1');
      at(`${URL}/c1`).flush(null);
      at(CONTRACTS).flush([]);
      facade.openContract('k1');

      at(`${CONTRACTS}/k1`).flush(null, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(facade.contractNotFound()).toBe(true);
    });

    it('creates a contract with a POST and leaves the contracts to the customer page that opens next', async () => {
      facade.openCustomer('c1');
      at(`${URL}/c1`).flush(null);
      at(CONTRACTS).flush([]);
      await settle();

      const outcome = facade.saveContract('c1', null, values);
      const post = http.expectOne(
        (request) => request.url === CONTRACTS && request.method === 'POST',
      );
      expect(post.request.body).toEqual(values);
      post.flush(contract, { status: 201, statusText: 'Created' });

      expect(await outcome).toBe('created');
      expect(TestBed.inject(Toast).current()).toBe('Contratto salvato');
      expect(navigate).toHaveBeenCalledWith(['/customers', 'c1']);
      expect(facade.savingContract()).toBe(false);
      TestBed.tick();
      http.expectNone((request) => request.url === CONTRACTS && request.method === 'GET');
    });

    it('updates a contract with a PUT carrying the version it was read at', async () => {
      const outcome = facade.saveContract('c1', contract, values);
      const put = http.expectOne((request) => request.method === 'PUT');

      expect(put.request.url).toBe(`${CONTRACTS}/k1`);
      expect(put.request.body).toEqual({ ...values, version: 4 });
      put.flush(null, { status: 204, statusText: 'No Content' });

      expect(await outcome).toBe('updated');
      expect(TestBed.inject(Toast).current()).toBe('Contratto salvato');
      expect(navigate).toHaveBeenCalledWith(['/customers', 'c1']);
    });

    it('the save request carries the rate and the minimum with the rest of the contract', async () => {
      const withRate: CreateContractRequest = {
        ...values,
        pricingMode: 'ByHour',
        nightSurcharge: true,
        dayPrice: 60,
        nightPrice: 75.5,
        nightCallFee: 0,
        minimumRule: 'TieredOverage',
        minimumAmount: 200,
        minimumThreshold: 4,
        minimumOveragePrice: 45,
      };

      const outcome = facade.saveContract('c1', null, withRate);
      const post = http.expectOne((request) => request.method === 'POST');
      expect(post.request.body).toEqual(withRate);
      post.flush(contract, { status: 201, statusText: 'Created' });

      expect(await outcome).toBe('created');
    });

    it('a change from a date posts the values, the version and the date to its endpoint, then finishes like a save', async () => {
      const outcome = facade.changeContractFromDate('c1', contract, values, '2026-12-01');
      const post = http.expectOne((request) => request.method === 'POST');

      expect(post.request.url).toBe(`${CONTRACTS}/k1/change-from-date`);
      expect(post.request.body).toEqual({ ...values, version: 4, changeFrom: '2026-12-01' });
      post.flush({ ...contract, id: 'k2' }, { status: 201, statusText: 'Created' });

      expect(await outcome).toBe('changed');
      expect(TestBed.inject(Toast).current()).toBe('Contratto salvato');
      expect(navigate).toHaveBeenCalledWith(['/customers', 'c1']);
      expect(facade.savingContract()).toBe(false);
    });

    it('a change from a date while a save runs is ignored', async () => {
      const first = facade.saveContract('c1', null, values);

      expect(await facade.changeContractFromDate('c1', contract, values, '2026-12-01')).toBe(
        'ignored',
      );
      http
        .expectOne((request) => request.method === 'POST')
        .flush(contract, { status: 201, statusText: 'Created' });
      await first;
    });

    it('a change from a date refused with 400 returns the errors and goes nowhere', async () => {
      const outcome = facade.changeContractFromDate('c1', contract, values, '2026-03-01');
      http
        .expectOne((request) => request.method === 'POST')
        .flush(
          { errors: { ChangeFrom: ['Outside validity.'] } },
          { status: 400, statusText: 'Bad Request' },
        );

      expect(await outcome).toEqual({
        kind: 'validation',
        errors: { ChangeFrom: ['Outside validity.'] },
      });
      http.expectNone((request) => request.method === 'GET');
      expect(navigate).not.toHaveBeenCalled();
      expect(TestBed.inject(Toast).current()).toBeNull();
    });

    it('a change from a date refused with 409 returns the domain error and reads the contracts and the open contract again', async () => {
      facade.openCustomer('c1');
      at(`${URL}/c1`).flush(null);
      at(CONTRACTS).flush([]);
      facade.openContract('k1');
      at(`${CONTRACTS}/k1`).flush(contract);
      await settle();
      const conflict = {
        errorCode: 'Registry.Contract.ConcurrentUpdate',
        detail: 'Modificato da un altro utente.',
      };

      const outcome = facade.changeContractFromDate('c1', contract, values, '2026-12-01');
      http
        .expectOne((request) => request.method === 'POST')
        .flush(conflict, { status: 409, statusText: 'Conflict' });

      expect(await outcome).toEqual({
        kind: 'domain',
        status: 409,
        errorCode: conflict.errorCode,
        detail: conflict.detail,
      });
      TestBed.tick();
      http.expectOne((request) => request.url === CONTRACTS && request.method === 'GET');
      http.expectOne((request) => request.url === `${CONTRACTS}/k1` && request.method === 'GET');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('a second save while one runs is ignored', async () => {
      const first = facade.saveContract('c1', null, values);
      const second = await facade.saveContract('c1', null, values);

      expect(second).toBe('ignored');
      http
        .expectOne((request) => request.method === 'POST')
        .flush(contract, { status: 201, statusText: 'Created' });
      await first;
    });

    it('opening the customer already held reads the customer and its contracts again', async () => {
      facade.openCustomer('c1');
      at(`${URL}/c1`).flush(null);
      at(CONTRACTS).flush([]);
      await settle();

      facade.openCustomer('c1');

      at(`${URL}/c1`).flush(null);
      at(CONTRACTS).flush([]);
    });

    it('opening another customer drops the open contract and does not read it under the new customer', async () => {
      facade.openCustomer('c1');
      at(`${URL}/c1`).flush(null);
      at(CONTRACTS).flush([]);
      facade.openContract('k1');
      at(`${CONTRACTS}/k1`).flush(contract);
      await settle();

      facade.openCustomer('c2');

      at(`${URL}/c2`).flush(null);
      at(`${URL}/c2/contracts`).flush([]);
      http.expectNone((request) => request.url === `${URL}/c2/contracts/k1`);
      expect(facade.contract.value()).toBeUndefined();
    });

    it('opening the contract already held reads it again', async () => {
      facade.openCustomer('c1');
      at(`${URL}/c1`).flush(null);
      at(CONTRACTS).flush([]);
      facade.openContract('k1');
      at(`${CONTRACTS}/k1`).flush(contract);
      await settle();

      facade.openContract('k1');

      at(`${CONTRACTS}/k1`).flush({ ...contract, version: 5 });
      await settle();
      expect(facade.contract.value()?.version).toBe(5);
    });

    it('a save refused with 409 returns the domain error and reads the contracts and the open contract again', async () => {
      facade.openCustomer('c1');
      at(`${URL}/c1`).flush(null);
      at(CONTRACTS).flush([]);
      facade.openContract('k1');
      at(`${CONTRACTS}/k1`).flush(contract);
      await settle();
      const conflict = {
        errorCode: 'Registry.Contract.ConcurrentUpdate',
        detail: 'Modificato da un altro utente.',
      };

      const outcome = facade.saveContract('c1', contract, values);
      http
        .expectOne((request) => request.method === 'PUT')
        .flush(conflict, { status: 409, statusText: 'Conflict' });

      expect(await outcome).toEqual({
        kind: 'domain',
        status: 409,
        errorCode: conflict.errorCode,
        detail: conflict.detail,
      });
      TestBed.tick();
      http.expectOne((request) => request.url === CONTRACTS && request.method === 'GET');
      http.expectOne((request) => request.url === `${CONTRACTS}/k1` && request.method === 'GET');
    });

    it('a save refused with 400 returns the validation errors and reads nothing again', async () => {
      const outcome = facade.saveContract('c1', null, values);
      http
        .expectOne((request) => request.method === 'POST')
        .flush(
          { errors: { ValidTo: ['End before start.'] } },
          { status: 400, statusText: 'Bad Request' },
        );

      expect(await outcome).toEqual({
        kind: 'validation',
        errors: { ValidTo: ['End before start.'] },
      });
      http.expectNone((request) => request.method === 'GET');
      expect(navigate).not.toHaveBeenCalled();
      expect(TestBed.inject(Toast).current()).toBeNull();
    });

    it('a customer save reloads the customer detail too', async () => {
      facade.openCustomer('c1');
      at(`${URL}/c1`).flush({ ...page(1).data[0], id: 'c1' });
      at(CONTRACTS).flush([]);
      await settle();

      const outcome = facade.save(
        { ...page(1).data[0], id: 'c1' },
        { companyName: 'Comune di Penne', vatNumber: null, taxCode: null, address: null },
      );
      http
        .expectOne((request) => request.method === 'PUT')
        .flush(null, { status: 204, statusText: 'No Content' });
      await outcome;

      TestBed.tick();
      http.expectOne((request) => request.url === `${URL}/c1` && request.method === 'GET');
    });
  });
});
