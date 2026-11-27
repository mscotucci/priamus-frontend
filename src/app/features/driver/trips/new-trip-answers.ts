import type { components } from '../../../core/api/generated/api-types';

type Schemas = components['schemas'];

export type TripVehicle = Schemas['TripVehicleDto'];
export type TripCustomer = Schemas['TripCustomerDto'];
export type TripLocation = Schemas['TripLocationDto'];
export type TripQuestions = Schemas['TripQuestionsDto'];
type TripPlace = Schemas['TripPlaceDto'];
export type AddTripRequest = Omit<Schemas['AddTripRequest'], 'start'>;
export type AnswersCheck = Schemas['CheckTripAnswersResponse'];
/** What a past trip offers to do again: its vehicle, trailer, customer and locations. */
export type RepeatableTrip = Schemas['RepeatableTripDto'];

/** The places the driver gave; a side the contract does not ask, or the driver skipped, is null. */
export interface LocationsAnswer {
  pickup: TripLocation | null;
  delivery: TripLocation | null;
}

/** The answers of the three questions, and what the customer's contract asks today. */
export interface NewTripAnswers {
  vehicle: TripVehicle | null;
  trailer: TripVehicle | null;
  customer: TripCustomer | null;
  locations: LocationsAnswer | null;
  /** What the contract of `customer` asks today; null while it is not known. */
  questions: TripQuestions | null;
}

export type Answer =
  | { kind: 'vehicle'; vehicle: TripVehicle; trailer: TripVehicle | null }
  | { kind: 'customer'; customer: TripCustomer; questions: TripQuestions | null }
  /** The answered customer has no contract in force today: it is emptied. */
  | { kind: 'noContract' }
  | { kind: 'locations'; locations: LocationsAnswer };

/** The three questions, in order: vehicle, customer, locations. */
export const QUESTIONS = [1, 2, 3] as const;
export type QuestionNumber = (typeof QUESTIONS)[number];

export const EMPTY_ANSWERS: NewTripAnswers = {
  vehicle: null,
  trailer: null,
  customer: null,
  locations: null,
  questions: null,
};

/** A tractor that requires a trailer without one is not a complete answer. */
export function isAnswered(answers: NewTripAnswers, question: QuestionNumber): boolean {
  switch (question) {
    case 1:
      return (
        answers.vehicle !== null && (answers.trailer !== null || !answers.vehicle.requiresTrailer)
      );
    case 2:
      return answers.customer !== null;
    case 3:
      return answers.locations !== null;
  }
}

export function isComplete(answers: NewTripAnswers): boolean {
  return QUESTIONS.every((question) => isAnswered(answers, question));
}

/** The question being modified, else the first unanswered; null when everything is answered. */
export function openQuestion(
  answers: NewTripAnswers,
  editing: QuestionNumber | null,
): QuestionNumber | null {
  return editing ?? QUESTIONS.find((question) => !isAnswered(answers, question)) ?? null;
}

/**
 * Sets one answer and empties only the answers that no longer hold: another customer keeps the
 * locations only when the same sides are asked and the new places still hold them; a standalone
 * vehicle has no trailer. A customer without a contract today is emptied.
 */
export function applyAnswer(answers: NewTripAnswers, answer: Answer): NewTripAnswers {
  switch (answer.kind) {
    case 'vehicle':
      return {
        ...answers,
        vehicle: answer.vehicle,
        trailer: answer.vehicle.kind === 'StandaloneVehicle' ? null : answer.trailer,
      };
    case 'customer':
      return withQuestions({ ...answers, customer: answer.customer }, answer.questions);
    case 'noContract':
      return withQuestions({ ...answers, customer: null }, null);
    case 'locations':
      return { ...answers, locations: answer.locations };
  }
}

function withQuestions(answers: NewTripAnswers, questions: TripQuestions | null): NewTripAnswers {
  const before = answers.questions;
  return {
    ...answers,
    questions,
    locations: locationsHold(answers.locations, before, questions) ? answers.locations : null,
  };
}

function locationsHold(
  locations: LocationsAnswer | null,
  before: TripQuestions | null,
  after: TripQuestions | null,
): boolean {
  if (locations === null) {
    return false;
  }
  if (before === null || after === null || before.locationsAsked !== after.locationsAsked) {
    return false;
  }
  const pickup = locations.pickup?.id;
  const delivery = locations.delivery?.id;
  const holds = (place: TripPlace) => {
    switch (after.locationsAsked) {
      case 'Both':
        return pickup !== undefined && delivery !== undefined
          ? place.pickup?.id === pickup && place.delivery?.id === delivery
          : false;
      case 'Pickup':
        return pickup !== undefined && place.pickup?.id === pickup;
      case 'Delivery':
        return delivery !== undefined && place.delivery?.id === delivery;
      case 'None':
        return true;
    }
  };
  return after.locationsAsked === 'None' || after.places.some(holds);
}

/** One line of the locations answer: the place, introduced by an arrow or by the side it is on. */
export interface LocationLine {
  prefix: 'arrow' | 'pickup' | 'delivery' | null;
  place: string;
}

/** The lines of the locations answer; none when the driver skipped them. */
export function locationLines(locations: LocationsAnswer | null): LocationLine[] {
  const name = (place: TripLocation) => `${place.name}, ${place.municipality}`;
  const { pickup, delivery } = locations ?? { pickup: null, delivery: null };
  if (pickup !== null && delivery !== null) {
    return [
      { prefix: null, place: name(pickup) },
      { prefix: 'arrow', place: name(delivery) },
    ];
  }
  if (pickup !== null) {
    return [{ prefix: 'pickup', place: name(pickup) }];
  }
  return delivery !== null ? [{ prefix: 'delivery', place: name(delivery) }] : [];
}

/** The locations are all optional unless the contract asks for both of them. */
export function locationsOptional(answers: NewTripAnswers): boolean {
  return answers.questions?.locationsAsked !== 'Both';
}

/** The lines of the vehicle answer: the leading vehicle, then the trailer. */
export function vehicleLines(answers: NewTripAnswers): { plate: string; description: string }[] {
  return [answers.vehicle, answers.trailer]
    .filter((vehicle) => vehicle !== null)
    .map(({ licensePlate, description }) => ({ plate: licensePlate, description }));
}

/**
 * What adding the trip sends: the ids of the three answers. No driver (the session names it), no day (the
 * server's today) and no amount (the server prices the trip when it is ended); `start` is added by
 * the facade. Null while any of the three questions is not answered.
 */
export function addRequest(answers: NewTripAnswers): AddTripRequest | null {
  const { vehicle, trailer, customer, locations } = answers;
  if (!isComplete(answers) || vehicle === null || customer === null || locations === null) {
    return null;
  }
  return {
    vehicleId: vehicle.id,
    trailerId: trailer?.id ?? null,
    customerId: customer.id,
    pickupLocationId: locations.pickup?.id ?? null,
    deliveryLocationId: locations.delivery?.id ?? null,
  };
}

/**
 * The answers after the registry was asked again, with what it no longer accepts emptied; `first` is
 * the first question emptied, null when nothing was.
 */
export function applyCheck(
  answers: NewTripAnswers,
  check: AnswersCheck,
  questions: TripQuestions | null,
): { answers: NewTripAnswers; first: QuestionNumber | null } {
  let next = answers;
  if (!check.vehicle) {
    next = { ...next, vehicle: null, trailer: null };
  } else if (!check.trailer) {
    next = { ...next, trailer: null };
  }
  if (next.customer !== null) {
    next =
      check.customer && questions !== null
        ? applyAnswer(next, { kind: 'customer', customer: next.customer, questions })
        : applyAnswer(next, { kind: 'noContract' });
  }
  if (!check.pickup || !check.delivery) {
    next = { ...next, locations: null };
  }
  const emptied = (question: QuestionNumber) =>
    isAnswered(answers, question) &&
    (question === 1
      ? next.vehicle?.id !== answers.vehicle?.id || next.trailer?.id !== answers.trailer?.id
      : !isAnswered(next, question));
  return { answers: next, first: QUESTIONS.find(emptied) ?? null };
}

/**
 * The answers a repeated trip starts from, once the registry was asked about them and the contract
 * of its customer today was read: only what still holds is answered. A vehicle that fails takes its
 * trailer with it, a customer without a contract takes the locations, and a pickup or delivery that
 * fails empties the locations answer.
 */
export function applyRepeat(
  trip: RepeatableTrip,
  check: AnswersCheck,
  questions: TripQuestions | null,
): NewTripAnswers {
  const customerHolds = check.customer && questions !== null;
  const base: NewTripAnswers = {
    ...EMPTY_ANSWERS,
    customer: customerHolds ? trip.customer : null,
    locations:
      customerHolds && check.pickup && check.delivery
        ? { pickup: trip.pickup, delivery: trip.delivery }
        : null,
    questions: customerHolds ? questions : null,
  };
  const answers = withQuestions(base, base.questions);
  return check.vehicle
    ? applyAnswer(answers, {
        kind: 'vehicle',
        vehicle: trip.vehicle,
        trailer: check.trailer ? trip.trailer : null,
      })
    : answers;
}

/** The tractor of question 1 while it still waits for its trailer, else null. */
export function tractorAwaitingTrailer(answers: NewTripAnswers): TripVehicle | null {
  return answers.vehicle !== null && answers.vehicle.requiresTrailer && answers.trailer === null
    ? answers.vehicle
    : null;
}
