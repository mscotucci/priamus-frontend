import { Location } from '@angular/common';
import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../../../core/api/api-error';
import { Session } from '../../../core/auth/session';
import {
  AddTripRequest,
  AnswersCheck,
  NewTripAnswers,
  RepeatableTrip,
  TripLocation,
  TripQuestions,
  TripVehicle,
} from './new-trip-answers';
import {
  DriverHome,
  EndTripRequest,
  MyTrips,
  NewTrip,
  StartTripRequest,
  Trip,
  TripCustomers,
  TripDocument,
  TripDocuments,
  TripRead,
  TripsApi,
  VehicleRole,
} from './trips-api';

/**
 * What an act on a trip came to, told by status: `done` (with the trip as the server answers it; null
 * for a delete); `notReached` (no answer from the server); `stale` (409: what the page shows is out of
 * date); `rule` (422: a rule of the driver's own trips, with the server's text and the backend's error
 * code, which only tells where the text goes); `failed` (anything else); `ignored` (an act is already
 * in flight).
 */
export type ActOutcome =
  | { kind: 'done'; trip: Trip | null }
  | { kind: 'notReached' }
  | { kind: 'stale' }
  | { kind: 'rule'; detail: string; errorCode: string }
  | { kind: 'failed' }
  | { kind: 'ignored' };

/**
 * What adding or removing an attachment came to, told by status: `done`; `notReached` (no answer from
 * the server); `tooLarge` (413 from the server or a proxy: the file is over the limit); `rule` (422: the
 * server's text); `rateLimited` (429); `missing` (404: the trip or the attachment is gone, or out of its
 * seven days); `failed` (anything else).
 */
export type AttachmentOutcome =
  | { kind: 'done' }
  | { kind: 'notReached' }
  | { kind: 'tooLarge' }
  | { kind: 'rule'; detail: string }
  | { kind: 'rateLimited' }
  | { kind: 'missing' }
  | { kind: 'failed' };

@Injectable()
export class TripsFacade {
  private readonly api = inject(TripsApi);
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  private readonly savingState = signal(false);
  /** An act on a trip is in flight. */
  readonly saving = this.savingState.asReadonly();
  private readonly endedState = signal<Trip | null>(null);
  /** The trip just ended, which "Viaggio concluso" shows; null until one is ended. */
  readonly ended = this.endedState.asReadonly();

  private readonly homeNeeded = signal(false);
  private readonly homeResource = httpResource<DriverHome>(() =>
    this.homeNeeded() ? this.api.home() : undefined,
  );

  /** The driver's home; `null` until it is read. */
  readonly home = computed<DriverHome | null>(() =>
    this.homeResource.hasValue() && !this.homeResource.isLoading()
      ? this.homeResource.value()
      : null,
  );
  readonly homeLoading = computed(
    () => this.homeNeeded() && this.home() === null && !this.homeFailed(),
  );
  readonly homeFailed = computed(() => this.homeResource.status() === 'error');

  private readonly myTripsNeeded = signal(false);
  private readonly myTripsResource = httpResource<MyTrips>(() =>
    this.myTripsNeeded() ? this.api.myTrips() : undefined,
  );

  /** The driver's ended trips of the last seven days; `null` until it is read. */
  readonly myTrips = computed<MyTrips | null>(() =>
    this.myTripsResource.hasValue() && !this.myTripsResource.isLoading()
      ? this.myTripsResource.value()
      : null,
  );
  readonly myTripsLoading = computed(
    () => this.myTripsNeeded() && this.myTrips() === null && !this.myTripsFailed(),
  );
  readonly myTripsFailed = computed(() => this.myTripsResource.status() === 'error');

  private readonly newTripNeeded = signal(false);
  private readonly newTripResource = httpResource<NewTrip>(() =>
    this.newTripNeeded() ? this.api.newTrip() : undefined,
  );

  /** What "Nuovo viaggio" proposes; `null` until it is read, or when the read failed. */
  readonly newTrip = computed<NewTrip | null>(() =>
    this.newTripResource.hasValue() && !this.newTripResource.isLoading()
      ? this.newTripResource.value()
      : null,
  );
  readonly newTripFailed = computed(() => this.newTripResource.status() === 'error');

  private readonly tripId = signal<string | null>(null);
  private readonly tripResource = httpResource<TripRead>(() => {
    const id = this.tripId();
    return id === null ? undefined : { url: this.api.trip(id) };
  });

  /** The trip asked for, with what its page needs besides it; `null` until it is read, or when the read failed. */
  readonly trip = computed<TripRead | null>(() =>
    this.tripResource.hasValue() && !this.tripResource.isLoading()
      ? this.tripResource.value()
      : null,
  );
  private readonly tripError = computed(() => {
    const error = this.tripResource.status() === 'error' ? this.tripResource.error() : null;
    return error instanceof HttpErrorResponse ? error : null;
  });
  /** The trip asked for does not exist for this driver, or is gone: the server answered 404. */
  readonly tripMissing = computed(() => this.tripError()?.status === 404);
  /** The read of the trip failed for any other reason. */
  readonly tripFailed = computed(() => {
    const error = this.tripError();
    return this.tripResource.status() === 'error' && error?.status !== 404;
  });

  private readonly documentsTripId = signal<string | null>(null);
  private readonly documentsResource = httpResource<TripDocuments>(() => {
    const id = this.documentsTripId();
    return id === null ? undefined : this.api.documents(id);
  });

  /**
   * The documents of the trip asked for; `null` until they are read, or when the read failed. While they
   * are read again the last ones stay.
   */
  readonly documents = computed<TripDocuments | null>(() =>
    this.documentsResource.hasValue() ? this.documentsResource.value() : null,
  );
  /** The documents are being read again: the ones held are still shown. */
  readonly documentsReloading = computed(() => this.documentsResource.status() === 'reloading');
  private readonly documentsError = computed(() => {
    const error =
      this.documentsResource.status() === 'error' ? this.documentsResource.error() : null;
    return error instanceof HttpErrorResponse ? error : null;
  });
  /** The trip has no documents for this driver: it does not exist, or is out of its seven days. */
  readonly documentsMissing = computed(() => this.documentsError()?.status === 404);
  /** The read of the documents failed for any other reason. */
  readonly documentsFailed = computed(() => {
    const error = this.documentsError();
    return this.documentsResource.status() === 'error' && error?.status !== 404;
  });

  private readonly vehicleRole = signal<VehicleRole | null>(null);
  private readonly searchText = signal('');
  private readonly vehiclesResource = httpResource<TripVehicle[]>(() => {
    const role = this.vehicleRole();
    return role === null ? undefined : this.api.vehicles(role, this.searchText());
  });

  /** The vehicles of the role being asked, filtered by the search text. */
  readonly vehicles = computed<TripVehicle[]>(() =>
    this.vehiclesResource.hasValue() ? this.vehiclesResource.value() : [],
  );
  readonly vehicleSearch = this.searchText.asReadonly();
  readonly vehiclesFailed = computed(() => this.vehiclesResource.status() === 'error');
  readonly vehiclesLoading = computed(
    () =>
      this.vehicleRole() !== null && !this.vehiclesResource.hasValue() && !this.vehiclesFailed(),
  );

  private readonly customersNeeded = signal(false);
  private readonly customerText = signal('');
  private readonly customersResource = httpResource<TripCustomers>(() =>
    this.customersNeeded() ? this.api.customers(this.customerText()) : undefined,
  );

  /** The customers with a contract in force today: the recent ones, then the others. */
  readonly customers = computed<TripCustomers>(() =>
    this.customersResource.hasValue() ? this.customersResource.value() : { recent: [], others: [] },
  );
  readonly customerSearch = this.customerText.asReadonly();
  readonly customersFailed = computed(() => this.customersResource.status() === 'error');
  readonly customersLoading = computed(
    () => this.customersNeeded() && !this.customersResource.hasValue() && !this.customersFailed(),
  );

  private readonly locationsNeeded = signal(false);
  private readonly locationText = signal('');
  private readonly locationsResource = httpResource<TripLocation[]>(() =>
    this.locationsNeeded() ? this.api.locations(this.locationText()) : undefined,
  );

  /** The active locations, filtered by the search text. */
  readonly locations = computed<TripLocation[]>(() =>
    this.locationsResource.hasValue() ? this.locationsResource.value() : [],
  );
  readonly locationSearch = this.locationText.asReadonly();
  readonly locationsFailed = computed(() => this.locationsResource.status() === 'error');
  readonly locationsLoading = computed(
    () => this.locationsNeeded() && !this.locationsResource.hasValue() && !this.locationsFailed(),
  );

  /** The answers a repeated trip starts "Nuovo viaggio" from, until the page that opens takes them. */
  private repeating: RepeatableTrip | null = null;

  /** A page that shows the home asks for it; nothing is read before, and one read is read again. */
  needHome(): void {
    if (this.homeNeeded()) {
      this.homeResource.reload();
    }
    this.homeNeeded.set(true);
  }

  /** "I miei viaggi" asks for its trips: a read made earlier is read again. */
  needMyTrips(): void {
    if (this.myTripsNeeded()) {
      this.myTripsResource.reload();
    }
    this.myTripsNeeded.set(true);
  }

  /** A page that proposes from today's trips asks for it: a read made earlier is read again. */
  needNewTrip(): void {
    if (this.newTripNeeded()) {
      this.newTripResource.reload();
    }
    this.newTripNeeded.set(true);
  }

  /** A page that shows a trip asks for it: a trip read earlier is read again. */
  needTrip(tripId: string): void {
    if (this.tripId() === tripId) {
      this.tripResource.reload();
    }
    this.tripId.set(tripId);
  }

  /** A page that shows the documents of a trip asks for them: documents read earlier are read again. */
  needDocuments(tripId: string): void {
    if (this.documentsTripId() === tripId) {
      this.documentsResource.reload();
    }
    this.documentsTripId.set(tripId);
  }

  /** Opens "Nuovo viaggio" starting from the answers of a past trip. */
  async repeat(trip: RepeatableTrip): Promise<boolean> {
    this.repeating = trip;
    const arrived = await this.router.navigate(['/driver', 'new-trip']);
    if (!arrived && this.repeating === trip) {
      this.repeating = null;
    }
    return arrived;
  }

  /** The answers to start from, consumed once: the next opening of "Nuovo viaggio" starts clean. */
  takeRepeat(): RepeatableTrip | null {
    const trip = this.repeating;
    this.repeating = null;
    return trip;
  }

  /** "Stesso giro": opens "Nuovo viaggio" from the trip just ended, which is forgotten once there. */
  async repeatEnded(): Promise<boolean> {
    const ended = this.endedState();
    const trip: RepeatableTrip | null =
      ended === null
        ? null
        : {
            vehicle: ended.vehicle,
            trailer: ended.trailer,
            customer: ended.customer,
            pickup: ended.pickup,
            delivery: ended.delivery,
          };
    this.repeating = trip;
    const arrived = await this.router.navigate(['/driver', 'new-trip']);
    if (arrived) {
      this.endedState.set(null);
    } else if (this.repeating === trip) {
      this.repeating = null;
    }
    return arrived;
  }

  /** Asks for the vehicles of a role, with an empty search. */
  askVehicles(role: VehicleRole): void {
    this.searchText.set('');
    this.vehicleRole.set(role);
  }

  searchVehicles(text: string): void {
    this.searchText.set(text);
  }

  /** Asks for the customers with a contract in force today, with an empty search. */
  askCustomers(): void {
    this.customerText.set('');
    this.customersNeeded.set(true);
  }

  searchCustomers(text: string): void {
    this.customerText.set(text);
  }

  /** Asks for the active locations, with an empty search. */
  askLocations(): void {
    this.locationText.set('');
    this.locationsNeeded.set(true);
  }

  searchLocations(text: string): void {
    this.locationText.set(text);
  }

  /**
   * The registry changed while the driver filled in "Nuovo viaggio": the vehicles, customers and
   * locations already read are read again, so a choice that no longer holds is no longer offered.
   */
  readChoicesAgain(): void {
    this.vehiclesResource.reload();
    this.customersResource.reload();
    this.locationsResource.reload();
  }

  /**
   * What the contract of a customer asks today; null when there is none in force.
   * Rejects when the read fails for another reason.
   */
  async tripQuestions(customerId: string): Promise<TripQuestions | null> {
    const { url, params } = this.api.tripQuestions(customerId);
    try {
      return await firstValueFrom(this.http.get<TripQuestions>(url, { params }));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Adds the trip under its identifier, started now when `start`; the same identifier may be sent again,
   * the server keeps one trip.
   */
  add(tripId: string, request: AddTripRequest, start: boolean): Promise<ActOutcome> {
    return this.act(async () => {
      const trip = await firstValueFrom(
        this.http.put<Trip>(this.api.trip(tripId), { ...request, start }),
      );
      // The customer of this trip is now one of the recent ones: the next question 2 lists it first.
      this.customersResource.reload();
      return trip;
    });
  }

  /** Starts a planned trip at the day and time typed, or now when `when` is null. */
  start(tripId: string, when: { day: string; time: string } | null): Promise<ActOutcome> {
    const body: StartTripRequest = when ?? { day: null, time: null };
    return this.act(() => firstValueFrom(this.http.post<Trip>(this.api.startTrip(tripId), body)));
  }

  /** Ends the trip in progress; the trip ended is kept for "Viaggio concluso". */
  end(tripId: string, request: EndTripRequest): Promise<ActOutcome> {
    return this.act(async () => {
      const trip = await firstValueFrom(this.http.post<Trip>(this.api.endTrip(tripId), request));
      this.endedState.set(trip);
      return trip;
    });
  }

  /** Deletes a planned trip. */
  remove(tripId: string): Promise<ActOutcome> {
    return this.act(async () => {
      await firstValueFrom(this.http.delete<void>(this.api.trip(tripId)));
      return null;
    });
  }

  /**
   * Attaches the file to a document of the trip under the identifier given: the same identifier sent
   * again (a retry) leaves one attachment on the server. It does not set `saving`: one document is busy,
   * the rest of the page stays usable.
   */
  async addAttachment(
    tripId: string,
    document: TripDocument,
    attachmentId: string,
    file: Blob,
  ): Promise<AttachmentOutcome> {
    try {
      await firstValueFrom(
        this.http.put(this.api.attachment(tripId, attachmentId), file, {
          params: { document },
        }),
      );
      return { kind: 'done' };
    } catch (error) {
      return attachmentOutcomeOf(error);
    }
  }

  /** Removes an attachment; the server answers 204 for one already removed, and 404 (`missing`) for an unknown one or one out of the seven days. */
  async removeAttachment(tripId: string, attachmentId: string): Promise<AttachmentOutcome> {
    try {
      await firstValueFrom(this.http.delete<void>(this.api.attachment(tripId, attachmentId)));
      return { kind: 'done' };
    } catch (error) {
      return attachmentOutcomeOf(error);
    }
  }

  /** Which of the answers the registry still accepts. */
  checkAnswers(answers: NewTripAnswers): Promise<AnswersCheck> {
    const { url, params } = this.api.answersCheck({
      vehicleId: answers.vehicle?.id ?? null,
      trailerId: answers.trailer?.id ?? null,
      customerId: answers.customer?.id ?? null,
      pickupLocationId: answers.locations?.pickup?.id ?? null,
      deliveryLocationId: answers.locations?.delivery?.id ?? null,
    });
    return firstValueFrom(this.http.get<AnswersCheck>(url, { params }));
  }

  /** Shows "Viaggio da fare", the page of a planned trip. */
  openTrip(tripId: string): Promise<boolean> {
    return this.router.navigate(['/driver', 'trips', tripId]);
  }

  /**
   * Shows "Termina il viaggio", the page that ends the trip in progress; with `typedEnd` the page asks
   * for the end time (`?time=typed`), without it the time is not asked.
   */
  openEnd(tripId: string, typedEnd: boolean): Promise<boolean> {
    const path = ['/driver', 'trips', tripId, 'end'];
    return typedEnd
      ? this.router.navigate(path, { queryParams: { time: 'typed' } })
      : this.router.navigate(path);
  }

  /** Shows "Viaggio concluso", the trip just ended. */
  openEnded(): Promise<boolean> {
    return this.router.navigate(['/driver', 'ended']);
  }

  /** Back to where the page was opened from; with no history of the app (a reload, a link) to the home. */
  back(): void {
    const state = this.location.getState() as { navigationId?: number } | null;
    if ((state?.navigationId ?? 0) > 1) {
      this.location.back();
    } else {
      void this.goHome();
    }
  }

  /** Goes to the home; the trip just ended is no longer shown once the driver is there. */
  async goHome(): Promise<boolean> {
    const arrived = await this.router.navigate(['/driver']);
    if (arrived) {
      this.endedState.set(null);
    }
    return arrived;
  }

  reloadHome(): void {
    this.homeResource.reload();
  }

  reloadDocuments(): void {
    this.documentsResource.reload();
  }

  reloadMyTrips(): void {
    this.myTripsResource.reload();
  }

  signOut(): Promise<void> {
    return this.session.signOut();
  }

  /** Runs one act at a time and tells what it came to. */
  private async act(run: () => Promise<Trip | null>): Promise<ActOutcome> {
    if (this.savingState()) {
      return { kind: 'ignored' };
    }
    this.savingState.set(true);
    try {
      return { kind: 'done', trip: await run() };
    } catch (error) {
      return outcomeOf(error);
    } finally {
      this.savingState.set(false);
    }
  }
}

function outcomeOf(error: unknown): ActOutcome {
  if (!(error instanceof HttpErrorResponse)) {
    return { kind: 'failed' };
  }
  if (error.status === 0) {
    return { kind: 'notReached' };
  }
  if (error.status === 409) {
    return { kind: 'stale' };
  }
  const api = toApiError(error);
  return error.status === 422 && api.kind === 'domain' && api.detail !== null
    ? { kind: 'rule', detail: api.detail, errorCode: api.errorCode }
    : { kind: 'failed' };
}

function attachmentOutcomeOf(error: unknown): AttachmentOutcome {
  if (!(error instanceof HttpErrorResponse)) {
    return { kind: 'failed' };
  }
  switch (error.status) {
    case 0:
      return { kind: 'notReached' };
    case 404:
      return { kind: 'missing' };
    case 413:
      return { kind: 'tooLarge' };
    case 429:
      return { kind: 'rateLimited' };
  }
  const api = toApiError(error);
  return error.status === 422 && api.kind === 'domain' && api.detail !== null
    ? { kind: 'rule', detail: api.detail }
    : { kind: 'failed' };
}
