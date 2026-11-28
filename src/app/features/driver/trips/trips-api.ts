import { HttpResourceRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { components } from '../../../core/api/generated/api-types';

type Schemas = components['schemas'];

export type DriverHome = Schemas['GetDriverHomeResponse'];
export type MyTrips = Schemas['MyTripsResponse'];
export type NewTrip = Schemas['GetNewTripResponse'];
export type TripCustomers = Schemas['ListTripCustomersResponse'];
export type Trip = Schemas['TripDto'];
export type TripRead = Schemas['GetTripResponse'];
export type TripDocuments = Schemas['TripDocumentsResponse'];
export type TripDocument = Schemas['TripDocument'];
export type StartTripRequest = Schemas['StartTripRequest'];
export type EndTripRequest = Schemas['EndTripRequest'];
export type VehicleRole = 'Leading' | 'Trailer';

const URL = '/api/operations/driver';

@Injectable({ providedIn: 'root' })
export class TripsApi {
  home(): HttpResourceRequest {
    return { url: `${URL}/home` };
  }

  myTrips(): HttpResourceRequest {
    return { url: `${URL}/my-trips` };
  }

  newTrip(): HttpResourceRequest {
    return { url: `${URL}/new-trip` };
  }

  vehicles(role: VehicleRole, search: string): HttpResourceRequest {
    const text = search.trim();
    return { url: `${URL}/vehicles`, params: text === '' ? { role } : { role, search: text } };
  }

  customers(search: string): HttpResourceRequest {
    const text = search.trim();
    return { url: `${URL}/customers`, params: text === '' ? {} : { search: text } };
  }

  tripQuestions(customerId: string): HttpResourceRequest {
    return { url: `${URL}/trip-questions`, params: { customerId } };
  }

  /** The trip itself: `PUT` adds it, `GET` reads it, `DELETE` removes it while it is planned. */
  trip(tripId: string): string {
    return `${URL}/trips/${tripId}`;
  }

  /** What the trip needs attached and what is: `GET`. */
  documents(tripId: string): HttpResourceRequest {
    return { url: `${URL}/trips/${tripId}/documents` };
  }

  /** One attachment of a trip: `PUT` adds it (the body is the file), `DELETE` removes it. */
  attachment(tripId: string, attachmentId: string): string {
    return `${URL}/trips/${tripId}/attachments/${attachmentId}`;
  }

  startTrip(tripId: string): string {
    return `${URL}/trips/${tripId}/start`;
  }

  endTrip(tripId: string): string {
    return `${URL}/trips/${tripId}/end`;
  }

  /** The answers given so far; a question not answered is left out. */
  answersCheck(answers: {
    vehicleId: string | null;
    trailerId: string | null;
    customerId: string | null;
    pickupLocationId: string | null;
    deliveryLocationId: string | null;
  }): HttpResourceRequest {
    const params: Record<string, string> = {};
    for (const key of [
      'vehicleId',
      'trailerId',
      'customerId',
      'pickupLocationId',
      'deliveryLocationId',
    ] as const) {
      const value = answers[key];
      if (value !== null) {
        params[key] = value;
      }
    }
    return { url: `${URL}/answers-check`, params };
  }

  locations(search: string): HttpResourceRequest {
    const text = search.trim();
    return { url: `${URL}/locations`, params: text === '' ? {} : { search: text } };
  }
}
