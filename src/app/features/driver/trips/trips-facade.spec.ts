import { Location } from '@angular/common';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Session } from '../../../core/auth/session';
import { EMPTY_ANSWERS } from './new-trip-answers';
import type {
  AddTripRequest,
  RepeatableTrip,
  TripCustomer,
  TripLocation,
  TripVehicle,
} from './new-trip-answers';
import type { DriverHome, MyTrips, Trip, TripRead } from './trips-api';
import { TripsFacade } from './trips-facade';

const URL = '/api/operations/driver/home';

const HOME: DriverHome = {
  firstName: 'Marco',
  lastName: 'Di Tullio',
  inProgress: null,
  planned: [],
  repeatableTrips: [],
  endedToday: 0,
  endedInLastSevenDays: 0,
};

const VEHICLES_URL = '/api/operations/driver/vehicles';
const CUSTOMERS_URL = '/api/operations/driver/customers';
const LOCATIONS_URL = '/api/operations/driver/locations';
const QUESTIONS_URL = '/api/operations/driver/trip-questions';
const NEW_TRIP_URL = '/api/operations/driver/new-trip';
const TRIP_URL = '/api/operations/driver/trips/trip';

const CUSTOMER: TripCustomer = { id: 'c1', companyName: 'Comune di Penne', vatNumber: null };
const PLACE: TripLocation = { id: 'l1', name: 'Magazzino A', municipality: 'Penne' };

const TRAILER: TripVehicle = {
  id: 'r1',
  kind: 'Trailer',
  licensePlate: 'XA456ZZ',
  description: 'Semirimorchio',
  requiresTrailer: false,
};

const TRACTOR: TripVehicle = { ...TRAILER, id: 't1', kind: 'Tractor', requiresTrailer: true };

const TRIP: Trip = {
  id: 'trip',
  state: 'Planned',
  vehicle: TRACTOR,
  trailer: TRAILER,
  customer: CUSTOMER,
  pickup: PLACE,
  delivery: null,
  day: null,
  start: null,
  end: null,
  kilograms: null,
  kilometres: null,
  number: null,
};

const settle = async () => {
  await new Promise<void>((resolve) => setTimeout(resolve));
  TestBed.tick();
};

describe('TripsFacade', () => {
  let http: HttpTestingController;
  let facade: TripsFacade;
  let signOut: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    signOut = vi.fn(() => Promise.resolve());
    TestBed.configureTestingModule({
      providers: [
        TripsFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Session, useValue: { signOut, user: signal(null).asReadonly() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    facade = TestBed.inject(TripsFacade);
  });

  it('reads nothing until a page asks for the home', async () => {
    await settle();

    http.expectNone(URL);
    expect(facade.home()).toBeNull();
    expect(facade.homeLoading()).toBe(false);
  });

  it('reads the driver home once a page needs it and holds it', async () => {
    facade.needHome();
    await settle();

    expect(facade.homeLoading()).toBe(true);
    http.expectOne(URL).flush(HOME);
    await settle();

    expect(facade.home()).toEqual(HOME);
    expect(facade.homeLoading()).toBe(false);
    expect(facade.homeFailed()).toBe(false);
  });

  it('marks the home failed when the read fails and reads again on reload', async () => {
    facade.needHome();
    await settle();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(facade.homeFailed()).toBe(true);
    expect(facade.homeLoading()).toBe(false);

    facade.reloadHome();
    await settle();
    http.expectOne(URL).flush(HOME);
    await settle();

    expect(facade.homeFailed()).toBe(false);
    expect(facade.home()).toEqual(HOME);
  });

  it('the home asked for again is read again', async () => {
    facade.needHome();
    await settle();
    http.expectOne(URL).flush(HOME);
    await settle();

    facade.needHome();
    await settle();

    http.expectOne(URL).flush(HOME);
  });

  it('signs out through the session without asking anything', async () => {
    await facade.signOut();

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('reads the vehicles of the role asked and again, with the search text, when it changes', async () => {
    facade.askVehicles('Leading');
    await settle();
    http
      .expectOne((r) => r.url === VEHICLES_URL && r.params.toString() === 'role=Leading')
      .flush([]);
    await settle();

    facade.searchVehicles('  ab1 ');
    await settle();

    expect(facade.vehicleSearch()).toBe('  ab1 ');
    http
      .expectOne((r) => r.url === VEHICLES_URL && r.params.toString() === 'role=Leading&search=ab1')
      .flush([TRAILER]);
    await settle();
    expect(facade.vehicles()).toEqual([TRAILER]);
    expect(facade.vehiclesLoading()).toBe(false);
  });

  it('asking another role clears the search text and reads that role', async () => {
    facade.askVehicles('Leading');
    facade.searchVehicles('ab1');
    await settle();
    http.expectOne((r) => r.params.get('search') === 'ab1').flush([]);

    facade.askVehicles('Trailer');
    await settle();

    expect(facade.vehicleSearch()).toBe('');
    http
      .expectOne((r) => r.url === VEHICLES_URL && r.params.toString() === 'role=Trailer')
      .flush([]);
  });

  it('reads no vehicles until a role is asked, and marks the read failed on an error', async () => {
    await settle();
    http.expectNone(VEHICLES_URL);

    facade.askVehicles('Trailer');
    await settle();
    http.expectOne(VEHICLES_URL + '?role=Trailer').flush(null, { status: 500, statusText: 'x' });
    await settle();

    expect(facade.vehiclesFailed()).toBe(true);
    expect(facade.vehiclesLoading()).toBe(false);
  });

  it('reads what the new trip proposes once a page needs it', async () => {
    await settle();
    http.expectNone(NEW_TRIP_URL);
    expect(facade.newTrip()).toBeNull();

    facade.needNewTrip();
    await settle();
    const proposal = { vehicle: null, trailer: null, hasTripInProgress: false };
    http.expectOne(NEW_TRIP_URL).flush(proposal);
    await settle();

    expect(facade.newTrip()).toEqual(proposal);
    expect(facade.newTripFailed()).toBe(false);
  });

  const isUrl = (url: string, query: string) => (r: HttpRequest<unknown>) =>
    r.url === url && r.params.toString() === query;

  it('reads the customers with no day, again with the search text, and clears the search when asked again', async () => {
    await settle();
    http.expectNone((r) => r.url === CUSTOMERS_URL);

    facade.askCustomers();
    await settle();
    expect(facade.customersLoading()).toBe(true);
    http.expectOne(isUrl(CUSTOMERS_URL, '')).flush({ recent: [CUSTOMER], others: [] });
    await settle();
    expect(facade.customers()).toEqual({ recent: [CUSTOMER], others: [] });
    expect(facade.customersLoading()).toBe(false);

    facade.searchCustomers(' vest ');
    await settle();
    expect(facade.customerSearch()).toBe(' vest ');
    http.expectOne(isUrl(CUSTOMERS_URL, 'search=vest')).flush({ recent: [], others: [CUSTOMER] });
    await settle();
    expect(facade.customers().others).toEqual([CUSTOMER]);

    facade.askCustomers();
    await settle();
    expect(facade.customerSearch()).toBe('');
    http.expectOne(isUrl(CUSTOMERS_URL, '')).flush({ recent: [], others: [] });
  });

  it('marks the customers failed when the read fails', async () => {
    facade.askCustomers();
    await settle();
    http.expectOne(isUrl(CUSTOMERS_URL, '')).flush(null, { status: 500, statusText: 'x' });
    await settle();

    expect(facade.customersFailed()).toBe(true);
    expect(facade.customersLoading()).toBe(false);
  });

  it('reads no location until asked, then all of them, and again with the search text', async () => {
    await settle();
    http.expectNone(LOCATIONS_URL);

    facade.askLocations();
    await settle();
    http.expectOne(isUrl(LOCATIONS_URL, '')).flush([PLACE]);
    await settle();
    expect(facade.locations()).toEqual([PLACE]);

    facade.searchLocations('pen');
    await settle();
    expect(facade.locationSearch()).toBe('pen');
    http.expectOne(isUrl(LOCATIONS_URL, 'search=pen')).flush([]);
    await settle();
    expect(facade.locations()).toEqual([]);
    expect(facade.locationsLoading()).toBe(false);

    facade.askLocations();
    await settle();
    expect(facade.locationSearch()).toBe('');
    http.expectOne(isUrl(LOCATIONS_URL, '')).flush([PLACE]);
  });

  it('marks the locations failed when the read fails', async () => {
    facade.askLocations();
    await settle();
    http.expectOne(LOCATIONS_URL).flush(null, { status: 500, statusText: 'x' });
    await settle();

    expect(facade.locationsFailed()).toBe(true);
  });

  it('reading the choices again reads again the vehicles, customers and locations already read, with their search', async () => {
    facade.askVehicles('Leading');
    facade.askCustomers();
    facade.askLocations();
    await settle();
    http.expectOne(VEHICLES_URL + '?role=Leading').flush([]);
    http.expectOne(isUrl(CUSTOMERS_URL, '')).flush({ recent: [], others: [] });
    http.expectOne(isUrl(LOCATIONS_URL, '')).flush([PLACE]);
    facade.searchLocations('pen');
    await settle();
    http.expectOne(isUrl(LOCATIONS_URL, 'search=pen')).flush([PLACE]);
    await settle();

    facade.readChoicesAgain();
    await settle();

    http.expectOne(VEHICLES_URL + '?role=Leading').flush([]);
    http.expectOne(isUrl(CUSTOMERS_URL, '')).flush({ recent: [], others: [] });
    http.expectOne(isUrl(LOCATIONS_URL, 'search=pen')).flush([]);
    await settle();
    expect(facade.locations()).toEqual([]);
  });

  it('reading the choices again reads nothing that was never asked', async () => {
    facade.readChoicesAgain();
    await settle();

    http.expectNone(VEHICLES_URL);
    http.expectNone((r) => r.url === CUSTOMERS_URL);
    http.expectNone(LOCATIONS_URL);
  });

  it('reads what the contract of a customer asks, with no day', async () => {
    const questions = {
      locationsAsked: 'Both',
      places: [],
      lastPlace: null,
    } as unknown as NonNullable<Awaited<ReturnType<TripsFacade['tripQuestions']>>>;

    const read = facade.tripQuestions('c1');
    http.expectOne(isUrl(QUESTIONS_URL, 'customerId=c1')).flush(questions);

    expect(await read).toEqual(questions);
  });

  it('a 404 of the questions is no contract in force (null), any other failure rejects', async () => {
    const none = facade.tripQuestions('c1');
    http
      .expectOne(isUrl(QUESTIONS_URL, 'customerId=c1'))
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(await none).toBeNull();

    const broken = facade.tripQuestions('c1');
    http
      .expectOne(isUrl(QUESTIONS_URL, 'customerId=c1'))
      .flush(null, { status: 500, statusText: 'Server Error' });
    await expect(broken).rejects.toBeDefined();
  });

  it('asks which answers still hold, with no day and leaving out the ones not given', async () => {
    const answers = {
      ...EMPTY_ANSWERS,
      vehicle: { id: 't1' } as TripVehicle,
      customer: CUSTOMER,
      locations: { pickup: PLACE, delivery: null },
    };

    const check = facade.checkAnswers(answers);
    http
      .expectOne(
        isUrl(
          '/api/operations/driver/answers-check',
          'vehicleId=t1&customerId=c1&pickupLocationId=l1',
        ),
      )
      .flush({ vehicle: true, trailer: true, customer: false, pickup: true, delivery: true });

    expect((await check).customer).toBe(false);
  });

  describe('reading my trips', () => {
    const MY_TRIPS_URL = '/api/operations/driver/my-trips';
    const MY_TRIPS: MyTrips = {
      today: '2026-11-27',
      trips: [{ trip: { ...TRIP, state: 'Ended' }, missingDocuments: 0 }],
    };

    it('reads nothing until the page asks, then holds the trips and reads them again when asked again', async () => {
      await settle();
      http.expectNone(MY_TRIPS_URL);
      expect(facade.myTrips()).toBeNull();
      expect(facade.myTripsLoading()).toBe(false);

      facade.needMyTrips();
      await settle();
      expect(facade.myTripsLoading()).toBe(true);
      http.expectOne(MY_TRIPS_URL).flush(MY_TRIPS);
      await settle();
      expect(facade.myTrips()).toEqual(MY_TRIPS);
      expect(facade.myTripsLoading()).toBe(false);

      facade.needMyTrips();
      await settle();
      http.expectOne(MY_TRIPS_URL).flush({ ...MY_TRIPS, trips: [] });
      await settle();
      expect(facade.myTrips()?.trips).toEqual([]);
    });

    it('marks the read failed and reads again on reload', async () => {
      facade.needMyTrips();
      await settle();
      http.expectOne(MY_TRIPS_URL).flush(null, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(facade.myTripsFailed()).toBe(true);
      expect(facade.myTripsLoading()).toBe(false);

      facade.reloadMyTrips();
      await settle();
      http.expectOne(MY_TRIPS_URL).flush(MY_TRIPS);
      await settle();

      expect(facade.myTripsFailed()).toBe(false);
      expect(facade.myTrips()).toEqual(MY_TRIPS);
    });
  });

  it('the counters of the home are the ones the server sends', async () => {
    facade.needHome();
    await settle();
    http.expectOne(URL).flush({ ...HOME, endedToday: 3, endedInLastSevenDays: 14 });
    await settle();

    expect(facade.home()?.endedToday).toBe(3);
    expect(facade.home()?.endedInLastSevenDays).toBe(14);
  });

  describe('reading one trip', () => {
    const READ: TripRead = {
      trip: TRIP,
      endAsks: null,
      proposedStart: '08:15:00',
      daysToExpiry: 6,
    };

    it('reads nothing until a page asks for a trip, then holds it and reads it again when asked again', async () => {
      await settle();
      http.expectNone(TRIP_URL);
      expect(facade.trip()).toBeNull();

      facade.needTrip('trip');
      await settle();
      http.expectOne(TRIP_URL).flush(READ);
      await settle();
      expect(facade.trip()).toEqual(READ);

      facade.needTrip('trip');
      await settle();
      http.expectOne(TRIP_URL).flush({ ...READ, daysToExpiry: 5 });
      await settle();
      expect(facade.trip()?.daysToExpiry).toBe(5);
    });

    it('tells a missing trip (404) from any other failure of the read', async () => {
      facade.needTrip('trip');
      await settle();
      http.expectOne(TRIP_URL).flush(null, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(facade.tripMissing()).toBe(true);
      expect(facade.tripFailed()).toBe(false);
      expect(facade.trip()).toBeNull();

      facade.needTrip('other');
      await settle();
      http
        .expectOne('/api/operations/driver/trips/other')
        .flush(null, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(facade.tripMissing()).toBe(false);
      expect(facade.tripFailed()).toBe(true);
    });
  });

  describe('acts on a trip', () => {
    const REQUEST: AddTripRequest = {
      vehicleId: 't1',
      trailerId: null,
      customerId: 'c1',
      pickupLocationId: null,
      deliveryLocationId: null,
    };
    const ENDED: Trip = { ...TRIP, state: 'Ended', number: 1248 };

    it('adds the trip under its identifier, with the start flag the driver chose', async () => {
      const outcome = facade.add('trip', REQUEST, true);
      expect(facade.saving()).toBe(true);
      const request = http.expectOne(TRIP_URL);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ ...REQUEST, start: true });
      request.flush(TRIP, { status: 201, statusText: 'Created' });

      expect(await outcome).toEqual({ kind: 'done', trip: TRIP });
      expect(facade.saving()).toBe(false);
    });

    it('a retried adding sends the same identifier and a trip already added answers 200 as done', async () => {
      const first = facade.add('trip', REQUEST, false);
      http.expectOne(TRIP_URL).flush(null, { status: 500, statusText: 'Server Error' });
      expect(await first).toEqual({ kind: 'failed' });

      const second = facade.add('trip', REQUEST, false);
      const retry = http.expectOne(TRIP_URL);
      expect(retry.request.method).toBe('PUT');
      expect(retry.request.body).toEqual({ ...REQUEST, start: false });
      retry.flush(TRIP, { status: 200, statusText: 'OK' });

      expect(await second).toEqual({ kind: 'done', trip: TRIP });
    });

    it('an adding reads the customers again, so the customer just used is among the recent ones', async () => {
      facade.askCustomers();
      await settle();
      http.expectOne(isUrl(CUSTOMERS_URL, '')).flush({ recent: [], others: [CUSTOMER] });
      await settle();

      const outcome = facade.add('trip', REQUEST, false);
      http.expectOne(TRIP_URL).flush(TRIP, { status: 201, statusText: 'Created' });
      await outcome;
      await settle();

      http.expectOne(isUrl(CUSTOMERS_URL, '')).flush({ recent: [CUSTOMER], others: [] });
      await settle();
      expect(facade.customers()).toEqual({ recent: [CUSTOMER], others: [] });
    });

    it('a second act while one is in flight is ignored', async () => {
      const first = facade.add('trip', REQUEST, false);

      expect(await facade.remove('trip')).toEqual({ kind: 'ignored' });
      http.expectOne(TRIP_URL).flush(TRIP, { status: 201, statusText: 'Created' });
      await first;
    });

    it('starts a planned trip now when no day and time are given', async () => {
      const outcome = facade.start('trip', null);
      const request = http.expectOne(`${TRIP_URL}/start`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ day: null, time: null });
      request.flush({ ...TRIP, state: 'InProgress' });

      expect(await outcome).toEqual({ kind: 'done', trip: { ...TRIP, state: 'InProgress' } });
    });

    it('starts a planned trip at the day and time typed', async () => {
      const outcome = facade.start('trip', { day: '2026-11-24', time: '07:30' });
      const request = http.expectOne(`${TRIP_URL}/start`);
      expect(request.request.body).toEqual({ day: '2026-11-24', time: '07:30' });
      request.flush(TRIP);

      expect((await outcome).kind).toBe('done');
    });

    it('ends the trip with what was typed and keeps the trip ended for its page', async () => {
      expect(facade.ended()).toBeNull();
      const body = { time: '17:00', kilograms: 12300, kilometres: null };

      const outcome = facade.end('trip', body);
      const request = http.expectOne(`${TRIP_URL}/end`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(body);
      request.flush(ENDED);

      expect(await outcome).toEqual({ kind: 'done', trip: ENDED });
      expect(facade.ended()).toEqual(ENDED);
    });

    it('deletes a planned trip, which answers with no trip', async () => {
      const outcome = facade.remove('trip');
      const request = http.expectOne(TRIP_URL);
      expect(request.request.method).toBe('DELETE');
      request.flush(null, { status: 204, statusText: 'No Content' });

      expect(await outcome).toEqual({ kind: 'done', trip: null });
    });

    const ACTS: [string, () => Promise<unknown>, string, string][] = [
      ['adding', () => facade.add('trip', REQUEST, false), TRIP_URL, 'PUT'],
      ['starting', () => facade.start('trip', null), `${TRIP_URL}/start`, 'POST'],
      [
        'ending',
        () => facade.end('trip', { time: null, kilograms: null, kilometres: null }),
        `${TRIP_URL}/end`,
        'POST',
      ],
      ['deleting', () => facade.remove('trip'), TRIP_URL, 'DELETE'],
    ];

    describe.each(ACTS)('%s', (_name, act, url, method) => {
      it.each([
        ['no answer from the server is told apart from a refusal', 0, null, 'notReached'],
        ['409 is stale, whatever the body', 409, null, 'stale'],
        [
          'a 400 with an error code is any other failure, not told by its code',
          400,
          { errorCode: 'Registry.Trip.AnswersChanged', detail: 'x' },
          'failed',
        ],
        ['422 with no text is any other failure', 422, null, 'failed'],
        ['500 is any other failure', 500, null, 'failed'],
      ])('%s', async (_case, status, body, kind) => {
        const outcome = act();

        const request = http.expectOne((r) => r.url === url && r.method === method);
        if (status === 0) {
          request.error(new ProgressEvent('error'), { status: 0 });
        } else {
          request.flush(body, { status, statusText: 'Refused' });
        }

        expect(await outcome).toEqual({ kind });
        expect(facade.saving()).toBe(false);
        expect(facade.ended()).toBeNull();
      });

      it("422 is a rule, with the server's text", async () => {
        const outcome = act();

        http
          .expectOne((r) => r.url === url && r.method === method)
          .flush(
            {
              errorCode: 'Operations.Trip.InTheFuture',
              detail: "L'ora non può essere nel futuro.",
            },
            { status: 422, statusText: 'Unprocessable' },
          );

        expect(await outcome).toEqual({
          kind: 'rule',
          detail: "L'ora non può essere nel futuro.",
          errorCode: 'Operations.Trip.InTheFuture',
        });
      });
    });
  });

  describe('navigating and repeating a trip', () => {
    const REPEATABLE: RepeatableTrip = {
      vehicle: TRACTOR,
      trailer: TRAILER,
      customer: CUSTOMER,
      pickup: PLACE,
      delivery: null,
    };
    let navigate: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    });

    const endTrip = async () => {
      const outcome = facade.end('trip', { time: null, kilograms: null, kilometres: null });
      http.expectOne(`${TRIP_URL}/end`).flush({ ...TRIP, state: 'Ended', number: 7 });
      await outcome;
    };

    it.each<[string, () => Promise<boolean>, string[]]>([
      ['the planned trip', () => facade.openTrip('trip'), ['/driver', 'trips', 'trip']],
      ['its end page', () => facade.openEnd('trip', false), ['/driver', 'trips', 'trip', 'end']],
      ['the ended page', () => facade.openEnded(), ['/driver', 'ended']],
      ['the home', () => facade.goHome(), ['/driver']],
    ])('opens %s', async (_name, open, target) => {
      await open();

      expect(navigate).toHaveBeenCalledWith(target);
    });

    it('opens the end page asking the time with ?time=typed', async () => {
      await facade.openEnd('trip', true);

      expect(navigate).toHaveBeenCalledWith(['/driver', 'trips', 'trip', 'end'], {
        queryParams: { time: 'typed' },
      });
    });

    it('keeps the answers of a trip for the page that opens, which takes them once', async () => {
      await facade.repeat(REPEATABLE);

      expect(navigate).toHaveBeenCalledWith(['/driver', 'new-trip']);
      expect(facade.takeRepeat()).toEqual(REPEATABLE);
      expect(facade.takeRepeat()).toBeNull();
    });

    it('a repeat whose navigation did not happen is not kept for a later opening', async () => {
      navigate.mockResolvedValue(false);

      await facade.repeat(REPEATABLE);

      expect(facade.takeRepeat()).toBeNull();
    });

    it('a first navigation superseded by a second one does not clear the trip of the second', async () => {
      const second: RepeatableTrip = { ...REPEATABLE, customer: { ...CUSTOMER, id: 'c9' } };
      let supersede: (arrived: boolean) => void = () => undefined;
      navigate.mockReturnValueOnce(new Promise<boolean>((resolve) => (supersede = resolve)));

      const first = facade.repeat(REPEATABLE);
      const next = facade.repeat(second);
      supersede(false);

      expect(await first).toBe(false);
      expect(await next).toBe(true);
      expect(facade.takeRepeat()).toEqual(second);
    });

    it('"Stesso giro" repeats the trip just ended and then forgets it', async () => {
      await endTrip();

      await facade.repeatEnded();

      expect(navigate).toHaveBeenLastCalledWith(['/driver', 'new-trip']);
      expect(facade.takeRepeat()).toEqual({
        vehicle: TRACTOR,
        trailer: TRAILER,
        customer: CUSTOMER,
        pickup: PLACE,
        delivery: null,
      });
      expect(facade.ended()).toBeNull();
    });

    it('"Stesso giro" whose navigation did not happen keeps the ended trip and repeats nothing', async () => {
      await endTrip();
      navigate.mockResolvedValue(false);

      expect(await facade.repeatEnded()).toBe(false);

      expect(facade.takeRepeat()).toBeNull();
      expect(facade.ended()).not.toBeNull();
    });

    it('going home forgets the trip just ended, unless the navigation did not happen', async () => {
      await endTrip();
      navigate.mockResolvedValue(false);
      await facade.goHome();
      expect(facade.ended()).not.toBeNull();

      navigate.mockResolvedValue(true);
      await facade.goHome();

      expect(facade.ended()).toBeNull();
    });

    it('back goes back when the app has a history', async () => {
      const location = TestBed.inject(Location);
      vi.spyOn(location, 'getState').mockReturnValue({ navigationId: 3 });
      const back = vi.spyOn(location, 'back').mockImplementation(() => undefined);

      facade.back();

      expect(back).toHaveBeenCalledOnce();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('back goes to the home when the page was opened with no history of the app', async () => {
      const location = TestBed.inject(Location);
      vi.spyOn(location, 'getState').mockReturnValue({ navigationId: 1 });
      const back = vi.spyOn(location, 'back').mockImplementation(() => undefined);

      facade.back();

      expect(back).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/driver']);
    });

    it('asking again for the new trip reads it again and holds the old proposal back meanwhile', async () => {
      const old = { vehicle: null, trailer: null, hasTripInProgress: false };
      facade.needNewTrip();
      await settle();
      http.expectOne(NEW_TRIP_URL).flush(old);
      await settle();
      expect(facade.newTrip()).toEqual(old);

      facade.needNewTrip();
      await settle();
      const reread = http.expectOne(NEW_TRIP_URL);
      expect(facade.newTrip()).toBeNull();
      reread.flush({ ...old, vehicle: TRACTOR });
      await settle();

      expect(facade.newTrip()?.vehicle).toEqual(TRACTOR);
    });
  });

  describe('documents and attachments of a trip', () => {
    const DOCUMENTS_URL = `${TRIP_URL}/documents`;
    const DOCUMENTS = {
      trip: TRIP,
      documents: [
        { document: 'DeliveryNote', required: true, attachments: [] },
        { document: 'DeliverySlip', required: false, attachments: [] },
        { document: 'WasteForm', required: false, attachments: [] },
      ],
    } as const;

    it('reads nothing until a page asks, holds the documents, and reads them again when asked again', async () => {
      await settle();
      http.expectNone(DOCUMENTS_URL);
      expect(facade.documents()).toBeNull();

      facade.needDocuments('trip');
      await settle();
      http.expectOne(DOCUMENTS_URL).flush(DOCUMENTS);
      await settle();

      expect(facade.documents()).toEqual(DOCUMENTS);

      facade.reloadDocuments();
      await settle();
      http.expectOne(DOCUMENTS_URL).flush({ ...DOCUMENTS, documents: [] });
      await settle();

      expect(facade.documents()?.documents).toEqual([]);
    });

    it('says the documents are being read again only while the read is under way', async () => {
      facade.needDocuments('trip');
      await settle();
      expect(facade.documentsReloading()).toBe(false);
      http.expectOne(DOCUMENTS_URL).flush(DOCUMENTS);
      await settle();
      expect(facade.documentsReloading()).toBe(false);

      facade.reloadDocuments();
      await settle();
      const reread = http.expectOne(DOCUMENTS_URL);
      expect(facade.documentsReloading()).toBe(true);

      reread.flush(DOCUMENTS);
      await settle();
      expect(facade.documentsReloading()).toBe(false);
    });

    it('keeps the last documents while they are read again, then shows the new ones', async () => {
      facade.needDocuments('trip');
      await settle();
      http.expectOne(DOCUMENTS_URL).flush(DOCUMENTS);
      await settle();

      facade.reloadDocuments();
      await settle();
      const reread = http.expectOne(DOCUMENTS_URL);

      expect(facade.documents()).toEqual(DOCUMENTS);

      reread.flush({ ...DOCUMENTS, documents: [] });
      await settle();

      expect(facade.documents()?.documents).toEqual([]);
    });

    it('tells a trip with no documents for the driver (404) from any other failure of the read', async () => {
      facade.needDocuments('trip');
      await settle();
      http.expectOne(DOCUMENTS_URL).flush(null, { status: 404, statusText: 'Not Found' });
      await settle();

      expect(facade.documentsMissing()).toBe(true);
      expect(facade.documentsFailed()).toBe(false);
      expect(facade.documents()).toBeNull();

      facade.needDocuments('other');
      await settle();
      http
        .expectOne('/api/operations/driver/trips/other/documents')
        .flush(null, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(facade.documentsMissing()).toBe(false);
      expect(facade.documentsFailed()).toBe(true);
    });

    it('keeps nothing of the documents of a trip when another trip is asked for', async () => {
      facade.needDocuments('trip');
      await settle();
      http.expectOne(DOCUMENTS_URL).flush(DOCUMENTS);
      await settle();
      expect(facade.documents()).not.toBeNull();

      facade.needDocuments('other');
      await settle();

      expect(facade.documents()).toBeNull();
      http.expectOne('/api/operations/driver/trips/other/documents');
    });

    it('adds a file as the body of a PUT under the identifier given, with the document, without setting saving', async () => {
      const file = new Blob(['x'], { type: 'image/jpeg' });

      const first = facade.addAttachment('trip', 'WasteForm', 'a1', file);
      expect(facade.saving()).toBe(false);
      const request = http.expectOne((r) => r.method === 'PUT');
      request.flush(
        { id: 'a', fileKind: 'Jpeg', addedAt: '2026-11-28T09:20:00Z' },
        { status: 201, statusText: 'Created' },
      );

      expect(await first).toEqual({ kind: 'done' });
      expect(request.request.body).toBe(file);
      expect(request.request.params.get('document')).toBe('WasteForm');
      expect(request.request.url).toBe(`${TRIP_URL}/attachments/a1`);

      const second = facade.addAttachment('trip', 'WasteForm', 'a1', file);
      const again = http.expectOne((r) => r.method === 'PUT');
      again.flush(null, { status: 200, statusText: 'OK' });

      expect(await second).toEqual({ kind: 'done' });
      expect(again.request.url).toBe(request.request.url);
    });

    it.each([
      [0, null, { kind: 'notReached' }],
      [404, null, { kind: 'missing' }],
      [413, null, { kind: 'tooLarge' }],
      [429, null, { kind: 'rateLimited' }],
      [
        422,
        {
          errorCode: 'Operations.Attachment.UnsupportedFile',
          detail: 'Si possono allegare solo foto o PDF.',
        },
        { kind: 'rule', detail: 'Si possono allegare solo foto o PDF.' },
      ],
      [422, null, { kind: 'failed' }],
      [500, null, { kind: 'failed' }],
    ])('adding answered with status %i comes to %j', async (status, body, expected) => {
      const outcome = facade.addAttachment('trip', 'DeliveryNote', 'a1', new Blob(['x']));

      http.expectOne((r) => r.method === 'PUT').flush(body, { status, statusText: 'x' });

      expect(await outcome).toEqual(expected);
    });

    it('removes an attachment with a DELETE and tells how it came out', async () => {
      const done = facade.removeAttachment('trip', 'a1');
      http
        .expectOne((r) => r.method === 'DELETE' && r.url === `${TRIP_URL}/attachments/a1`)
        .flush(null, { status: 204, statusText: 'No Content' });
      expect(await done).toEqual({ kind: 'done' });
      expect(facade.saving()).toBe(false);

      const gone = facade.removeAttachment('trip', 'a1');
      http.expectOne((r) => r.method === 'DELETE').flush(null, { status: 404, statusText: 'x' });
      expect(await gone).toEqual({ kind: 'missing' });

      const lost = facade.removeAttachment('trip', 'a1');
      http.expectOne((r) => r.method === 'DELETE').error(new ProgressEvent('error'));
      expect(await lost).toEqual({ kind: 'notReached' });
    });
  });
});
