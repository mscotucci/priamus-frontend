import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { TripListResponse } from './backoffice-trips-api';
import { BackofficeTripsFacade, currentMonth } from './backoffice-trips-facade';

const URL = '/api/operations/backoffice/trips';

const settle = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve));
  TestBed.tick();
};

const answer = (total: number): TripListResponse => ({
  trips: {
    data: [],
    totalCount: total,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
  figures: { trips: total, customers: 1, amount: 100 },
});

describe('BackofficeTripsFacade', () => {
  let http: HttpTestingController;
  let facade: BackofficeTripsFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BackofficeTripsFacade, provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(BackofficeTripsFacade);
    facade.loadList();
  });

  afterEach(() => {
    http.verify();
  });

  const lastRequest = () => {
    TestBed.tick();
    return http.expectOne((request) => request.url === URL);
  };

  const params = (request: ReturnType<typeof lastRequest>) =>
    Object.fromEntries(
      request.request.params.keys().map((key) => [key, request.request.params.get(key)]),
    );

  it('the list opens on the ended view and the current month, newest day first', () => {
    const month = currentMonth();
    const request = lastRequest();

    expect(params(request)).toEqual({
      view: 'Ended',
      from: month.from,
      to: month.to,
      page: '1',
      pageSize: '20',
      sortColumn: 'day',
      sortDirection: 'Descending',
    });
  });

  it('a new filter keeps the rows and figures on screen until its answer; another view starts empty', async () => {
    lastRequest().flush(answer(7));
    await settle();
    expect(facade.loading()).toBe(false);

    facade.setMode('Weight');
    const filtered = lastRequest();
    expect(facade.loading()).toBe(false);
    expect(facade.reloading()).toBe(true);
    expect(facade.total()).toBe(7);
    expect(facade.figures()?.trips).toBe(7);

    filtered.flush(answer(3));
    await settle();
    expect(facade.reloading()).toBe(false);
    expect(facade.total()).toBe(3);

    facade.setView('InProgress');
    const other = lastRequest();
    expect(facade.loading()).toBe(true);
    expect(facade.total()).toBe(0);
    other.flush(answer(2));
    await settle();
    expect(facade.total()).toBe(2);
  });

  it('the current month runs from its first to its last day', () => {
    expect(currentMonth(new Date(2026, 1, 14))).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
  });

  it('the ended view sends period, mode, order and the filters it is given', () => {
    lastRequest().flush(answer(0));
    facade.setPeriod({ from: '2026-10-01', to: '2026-10-31' });
    facade.setMode('Weight');
    facade.setCustomer({ id: 'c1', label: 'Rossi Srl' });
    facade.setDriver({ id: 'd1', label: 'Marco Verdi' });
    facade.setVehicle({ id: 'v1', label: 'AB123CD Motrice' });
    facade.setLocation({ id: 'l1', label: 'Cava Nord, Spoltore' });
    facade.setSearch('  1234 ');
    facade.setSort('total', 'Ascending');

    expect(params(lastRequest())).toEqual({
      view: 'Ended',
      from: '2026-10-01',
      to: '2026-10-31',
      mode: 'Weight',
      customerId: 'c1',
      driverId: 'd1',
      vehicleId: 'v1',
      locationId: 'l1',
      search: '1234',
      sortColumn: 'total',
      sortDirection: 'Ascending',
      page: '1',
      pageSize: '20',
    });
  });

  it.each(['InProgress', 'Planned'] as const)(
    'the %s view sends neither period, mode nor order, but keeps the filters',
    (view) => {
      lastRequest().flush(answer(0));
      facade.setMode('Distance');
      facade.setCustomer({ id: 'c1', label: 'Rossi Srl' });
      facade.setView(view);

      expect(params(lastRequest())).toEqual({
        view,
        customerId: 'c1',
        page: '1',
        pageSize: '20',
      });
    },
  );

  it('every setter takes the list back to page 1', async () => {
    const setters: (() => void)[] = [
      () => facade.setView('Planned'),
      () => facade.setPeriod({ from: '2026-10-01', to: '2026-10-31' }),
      () => facade.setCustomer({ id: 'c1', label: 'Rossi Srl' }),
      () => facade.setDriver({ id: 'd1', label: 'Marco Verdi' }),
      () => facade.setVehicle({ id: 'v1', label: 'AB123CD' }),
      () => facade.setLocation({ id: 'l1', label: 'Cava' }),
      () => facade.setMode('Weight'),
      () => facade.setSearch('rossi'),
      () => facade.setSort('total', 'Ascending'),
    ];
    lastRequest().flush(answer(100));
    await settle();

    for (const setter of setters) {
      facade.setPage(3);
      expect(facade.page()).toBe(3);
      setter();
      expect(facade.page()).toBe(1);
      lastRequest().flush(answer(100));
      await settle();
    }
  });

  it('exposes the page total and, for the ended view, the figures of the whole selection', async () => {
    lastRequest().flush(answer(42));
    await settle();

    expect(facade.loaded()).toBe(true);
    expect(facade.total()).toBe(42);
    expect(facade.figures()).toEqual({ trips: 42, customers: 1, amount: 100 });
  });

  it('opening a trip reads its detail and closing it stops reading', () => {
    lastRequest().flush(answer(0));
    facade.openTrip('t1');
    TestBed.tick();

    const detail = http.expectOne(`${URL}/t1`);
    expect(detail.request.method).toBe('GET');
    expect(facade.openTripId()).toBe('t1');
    detail.flush({ id: 't1' });

    facade.closeTrip();
    expect(facade.openTripId()).toBeNull();
  });

  it('a trip answered with 404 is reported missing, not failed', async () => {
    lastRequest().flush(answer(0));
    facade.openTrip('gone');
    TestBed.tick();

    http
      .expectOne(`${URL}/gone`)
      .flush({ errorCode: 'Operations.Trip.NotFound' }, { status: 404, statusText: 'Not Found' });
    await settle();

    expect(facade.tripMissing()).toBe(true);
    expect(facade.tripFailed()).toBe(false);
    expect(facade.trip()).toBeNull();
  });

  it('a trip answered with 500 is failed, not missing', async () => {
    lastRequest().flush(answer(0));
    facade.openTrip('t1');
    TestBed.tick();

    http.expectOne(`${URL}/t1`).flush({}, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(facade.tripMissing()).toBe(false);
    expect(facade.tripFailed()).toBe(true);
  });

  it('the filter options read the registry only with a search text, 10 at a time and no status', () => {
    lastRequest().flush(answer(0));
    facade.searchCustomers(' ros ');
    facade.searchDrivers('');
    facade.searchVehicles('ab12');
    facade.searchLocations('cava');
    TestBed.tick();

    const read = (kind: string) => {
      const request = http.expectOne((r) => r.url === `/api/registry/${kind}`);
      return Object.fromEntries(
        request.request.params.keys().map((key) => [key, request.request.params.get(key)]),
      );
    };
    expect(read('customers')).toEqual({ pageSize: '10', search: 'ros' });
    http.expectNone((r) => r.url === '/api/registry/drivers');
    expect(read('vehicles')).toEqual({ pageSize: '10', search: 'ab12' });
    expect(read('locations')).toEqual({ pageSize: '10', search: 'cava' });
  });

  it('tells when a search found more records than the 10 listed', async () => {
    lastRequest().flush(answer(0));
    facade.searchCustomers('qa');
    facade.searchDrivers('qa');
    TestBed.tick();

    http
      .expectOne('/api/registry/customers?pageSize=10&search=qa')
      .flush({ data: [{ id: 'c1', companyName: 'QA Uno' }], hasNextPage: true });
    http
      .expectOne('/api/registry/drivers?pageSize=10&search=qa')
      .flush({ data: [{ id: 'd1', firstName: 'Anna', lastName: 'QA' }], hasNextPage: false });
    await settle();

    expect(facade.customerOptionsMore()).toBe(true);
    expect(facade.driverOptionsMore()).toBe(false);
    expect(facade.vehicleOptionsMore()).toBe(false);
  });

  it('the options are labelled company name, "First Last", plate and description, "Name, Municipality"', async () => {
    lastRequest().flush(answer(0));
    facade.searchCustomers('r');
    facade.searchDrivers('v');
    facade.searchVehicles('a');
    facade.searchLocations('c');
    TestBed.tick();

    http
      .expectOne('/api/registry/customers?pageSize=10&search=r')
      .flush({ data: [{ id: 'c1', companyName: 'Rossi Srl' }] });
    http
      .expectOne('/api/registry/drivers?pageSize=10&search=v')
      .flush({ data: [{ id: 'd1', firstName: 'Marco', lastName: 'Verdi' }] });
    http
      .expectOne('/api/registry/vehicles?pageSize=10&search=a')
      .flush({ data: [{ id: 'v1', licensePlate: 'AB123CD', description: 'Motrice' }] });
    http
      .expectOne('/api/registry/locations?pageSize=10&search=c')
      .flush({ data: [{ id: 'l1', name: 'Cava Nord', municipality: 'Spoltore' }] });
    await settle();

    expect(facade.customerOptions()).toEqual([{ id: 'c1', label: 'Rossi Srl' }]);
    expect(facade.driverOptions()).toEqual([{ id: 'd1', label: 'Marco Verdi' }]);
    expect(facade.vehicleOptions()).toEqual([{ id: 'v1', label: 'AB123CD Motrice' }]);
    expect(facade.locationOptions()).toEqual([{ id: 'l1', label: 'Cava Nord, Spoltore' }]);
  });

  it('fetches the file of an attachment as a blob, with the session', async () => {
    lastRequest().flush(answer(0));
    const file = new Blob(['x'], { type: 'image/jpeg' });

    const read = facade.attachmentFile('t1', 'a1');
    const request = http.expectOne(`${URL}/t1/attachments/a1/file`);
    request.flush(file);

    expect(request.request.responseType).toBe('blob');
    expect(await read).toBeInstanceOf(Blob);
  });

  it('rejects when the file cannot be read', async () => {
    lastRequest().flush(answer(0));
    const read = facade.attachmentFile('t1', 'a1');
    http.expectOne(`${URL}/t1/attachments/a1/file`).flush(null, { status: 404, statusText: 'x' });

    await expect(read).rejects.toBeDefined();
  });
});
