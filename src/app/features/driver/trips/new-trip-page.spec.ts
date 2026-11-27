import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, LOCALE_ID, inject, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { CurrentUser } from '../../../core/auth/auth-api';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { settle } from '../../../core/testing/interaction-testing';
import {
  stubModalDialog,
  stubScrollIntoView,
  userWithRole,
} from '../../../core/testing/dom-testing';
import { unsavedChangesGuard } from '../../../shared/guards/unsaved-changes-guard';
import {
  RepeatableTrip,
  TripCustomer,
  TripLocation,
  TripQuestions,
  TripVehicle,
} from './new-trip-answers';
import { NewTripPage } from './new-trip-page';
import { NewTrip } from './trips-api';
import { Trips } from './trips';
import { TripsFacade } from './trips-facade';

registerLocaleData(localeIt);

const NEW_TRIP_URL = '/api/operations/driver/new-trip';
const CUSTOMERS_URL = '/api/operations/driver/customers';
const QUESTIONS_URL = '/api/operations/driver/trip-questions';
const CHECK_URL = '/api/operations/driver/answers-check';
const TRIPS_URL = '/api/operations/driver/trips/';
const isVehicles = (request: HttpRequest<unknown>) =>
  request.url === '/api/operations/driver/vehicles';
const isAdd = (request: HttpRequest<unknown>) =>
  request.method === 'PUT' && request.url.startsWith(TRIPS_URL);

const vehicle = (
  id: string,
  kind: TripVehicle['kind'],
  description: string,
  requiresTrailer = false,
): TripVehicle => ({ id, kind, description, requiresTrailer, licensePlate: id.toUpperCase() });
const TRACTOR = vehicle('ab123cd', 'Tractor', 'Scania R450', true);
const FREE_TRACTOR = vehicle('ab999cd', 'Tractor', 'Iveco Stralis');
const STANDALONE = vehicle('cd456ef', 'StandaloneVehicle', 'Ribaltabile Menci');
const TRAILER = vehicle('xa456zz', 'Trailer', 'Semirimorchio Menci');

const VESTINA: TripCustomer = {
  id: 'c1',
  companyName: 'Calcestruzzi Vestina S.p.A.',
  vatNumber: '01234567897',
};
const PENNE: TripCustomer = { id: 'c2', companyName: 'Comune di Penne', vatNumber: null };
const MAGAZZINO: TripLocation = { id: 'l1', name: 'Magazzino A', municipality: 'Penne' };
const CANTIERE: TripLocation = { id: 'l2', name: 'Cantiere X', municipality: 'Chieti Scalo' };
const DEPURATORE: TripLocation = {
  id: 'l3',
  name: 'Depuratore consortile',
  municipality: 'Loreto Aprutino',
};
const PAIR_CONTRACT: TripQuestions = {
  locationsAsked: 'Both',
  places: [{ pickup: MAGAZZINO, delivery: CANTIERE }],
  lastPlace: null,
};
const DELIVERY_CONTRACT: TripQuestions = {
  locationsAsked: 'Delivery',
  places: [{ pickup: null, delivery: DEPURATORE }],
  lastPlace: null,
};
const FLAT_CONTRACT: TripQuestions = {
  locationsAsked: 'None',
  places: [],
  lastPlace: null,
};
const ALL_HOLD = { vehicle: true, trailer: true, customer: true, pickup: true, delivery: true };
const REFUSED = { status: 500, statusText: 'Server Error' };

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();

/** The trip "Ripeti un viaggio" starts from, set by the test before the home stub is tapped. */
let repeating: RepeatableTrip;

@Component({
  template: '<button type="button" (click)="repeat()">repeat</button>',
})
class HomeStub {
  private readonly facade = inject(TripsFacade);

  protected repeat(): void {
    void this.facade.repeat(repeating);
  }
}

describe('NewTripPage', () => {
  let http: HttpTestingController;
  let scrolled: Element[];

  beforeEach(() => {
    scrolled = [];
    stubModalDialog();
    stubScrollIntoView((element) => scrolled.push(element));
    const user: CurrentUser = { ...userWithRole('Driver'), driverId: 'd1' };
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'driver',
            component: Trips,
            children: [
              { path: '', component: HomeStub },
              {
                path: 'new-trip',
                component: NewTripPage,
                canDeactivate: [unsavedChangesGuard],
              },
            ],
          },
        ]),
        { provide: LOCALE_ID, useValue: 'it' },
        {
          provide: Session,
          useValue: {
            wait: () => Promise.resolve(),
            user: signal(user).asReadonly(),
            signOut: () => Promise.resolve(),
          },
        },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
  });

  const open = async (proposal: Partial<NewTrip> = {}, vehicles: TripVehicle[] = []) => {
    const harness = await RouterTestingHarness.create('/driver/new-trip');
    await settle(harness.fixture);
    http.expectOne(NEW_TRIP_URL).flush({
      vehicle: null,
      trailer: null,
      hasTripInProgress: false,
      ...proposal,
    });
    await settle(harness.fixture);
    http.match(isVehicles).forEach((request) => request.flush(vehicles));
    await settle(harness.fixture);
    return { harness, element: harness.routeNativeElement as HTMLElement };
  };

  type Opened = Awaited<ReturnType<typeof open>>;

  const questions = ({ element }: Opened) =>
    Array.from(element.querySelectorAll<HTMLElement>('app-trip-question section'));

  const click = async ({ harness }: Opened, target: Element | null | undefined) => {
    (target as HTMLElement).click();
    await settle(harness.fixture);
  };

  const modifyOf = (opened: Opened, index: number) =>
    questions(opened)[index].querySelector('.pt-link');

  const lines = (opened: Opened, index: number) =>
    Array.from(questions(opened)[index].querySelectorAll('.pt-question__value')).map((line) =>
      text(line),
    );

  const titleOf = (opened: Opened, index: number) =>
    text(questions(opened)[index].querySelector('.pt-question__title'));

  const currents = (opened: Opened) => questions(opened).map((s) => s.getAttribute('aria-current'));

  const url = () => TestBed.inject(Router).url;

  const leaveDialog = ({ element }: Opened) => element.querySelector<HTMLDialogElement>('dialog');

  const buttons = ({ element }: Opened) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('.pt-bottombar button'));

  const notice = ({ element }: Opened) => element.querySelector('main > app-notice');

  const flushVehicles = async (opened: Opened, role: string, vehicles: TripVehicle[]) => {
    http
      .expectOne((request) => isVehicles(request) && request.params.get('role') === role)
      .flush(vehicles);
    await settle(opened.harness.fixture);
  };

  const vehicleCard = ({ element }: Opened, plate: string) =>
    Array.from(element.querySelectorAll<HTMLLabelElement>('app-vehicle-question .pt-choice')).find(
      (card) => text(card)?.startsWith(plate),
    )!;

  const flushCustomers = async (
    opened: Opened,
    customers: { recent: TripCustomer[]; others: TripCustomer[] },
  ) => {
    http.expectOne((r) => r.url === CUSTOMERS_URL).flush(customers);
    await settle(opened.harness.fixture);
  };

  const flushQuestions = async (
    opened: Opened,
    customerId: string,
    contract: TripQuestions | null,
  ) => {
    const request = http.expectOne(
      (r) => r.url === QUESTIONS_URL && r.params.get('customerId') === customerId,
    );
    if (contract === null) {
      request.flush(null, { status: 404, statusText: 'Not Found' });
    } else {
      request.flush(contract);
    }
    await settle(opened.harness.fixture);
  };

  const customerCard = ({ element }: Opened, name: string) =>
    Array.from(element.querySelectorAll<HTMLLabelElement>('app-customer-question .pt-choice')).find(
      (card) => text(card)?.startsWith(name),
    )!;

  const placeCard = ({ element }: Opened, name: string) =>
    Array.from(
      element.querySelectorAll<HTMLLabelElement>('app-locations-question .pt-choice'),
    ).find((card) => text(card)?.startsWith(name))!;

  const locationsButton = ({ element }: Opened, label: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('app-locations-question button')).find(
      (button) => text(button)?.startsWith(label),
    );

  /** Opens the page with a vehicle proposed, so question 2 is the open one. */
  const openAtCustomer = async (proposal: Partial<NewTrip> = {}) => {
    const opened = await open({ vehicle: STANDALONE, ...proposal });
    await flushCustomers(opened, { recent: [VESTINA], others: [PENNE] });
    return opened;
  };

  const chooseCustomer = async (
    opened: Opened,
    customer: TripCustomer,
    contract: TripQuestions | null,
  ) => {
    await click(opened, customerCard(opened, customer.companyName).querySelector('input'));
    await flushQuestions(opened, customer.id, contract);
  };

  /** The three answers given: the standalone vehicle, Penne and its pair of places. */
  const openComplete = async (proposal: Partial<NewTrip> = {}) => {
    const opened = await openAtCustomer(proposal);
    await chooseCustomer(opened, PENNE, PAIR_CONTRACT);
    await click(opened, placeCard(opened, 'Magazzino A').querySelector('input'));
    await click(opened, placeCard(opened, 'Cantiere X').querySelector('input'));
    return opened;
  };

  const press = async (opened: Opened, index: number) => {
    buttons(opened)[index].click();
    await settle(opened.harness.fixture);
  };

  describe('the page', () => {
    it('has the back arrow, the title and the three questions in order, one open, the rest as number and name', async () => {
      const opened = await open();

      const sections = questions(opened);

      expect(
        opened.element.querySelector('a[aria-label="Torna alla home"]')?.getAttribute('href'),
      ).toBe('/driver');
      expect(text(opened.element.querySelector('.pt-appbar__title'))).toBe('Nuovo viaggio');
      expect(sections.map((s) => text(s.querySelector('.pt-question__title')))).toEqual([
        'Con quale mezzo?',
        'Cliente',
        'Luoghi',
      ]);
      expect(currents(opened)).toEqual(['step', null, null]);
      expect(sections.map((s) => text(s.querySelector('.pt-question__number')))).toEqual([
        '1',
        '2',
        '3',
      ]);
      expect(text(opened.element)).not.toContain('Online');
      expect(text(opened.element)).not.toContain('Avanti');
      expect(opened.element.querySelector('dialog')).toBeNull();
      http.verify();
    });

    it('asks no day, no time and no measure, and reads today without a day', async () => {
      const opened = await openAtCustomer();

      expect(text(opened.element)).not.toContain('Quando');
      expect(text(opened.element)).not.toContain('Orari');
      expect(opened.element.querySelector('input[type="date"]')).toBeNull();
      expect(opened.element.querySelector('input[type="time"]')).toBeNull();
      await chooseCustomer(opened, PENNE, PAIR_CONTRACT);
      http.verify();
    });

    it('no read of the page carries a day', async () => {
      const harness = await RouterTestingHarness.create('/driver/new-trip');
      await settle(harness.fixture);
      const proposal = http.expectOne(NEW_TRIP_URL);
      expect(proposal.request.params.has('day')).toBe(false);
      proposal.flush({ vehicle: STANDALONE, trailer: null, hasTripInProgress: false });
      await settle(harness.fixture);
      const customers = http.expectOne((r) => r.url === CUSTOMERS_URL);
      expect(customers.request.params.has('day')).toBe(false);
      customers.flush({ recent: [], others: [PENNE] });
      await settle(harness.fixture);
      const opened = { harness, element: harness.routeNativeElement as HTMLElement };

      await click(opened, customerCard(opened, 'Comune di Penne').querySelector('input'));

      const contract = http.expectOne((r) => r.url === QUESTIONS_URL);
      expect(contract.request.params.has('day')).toBe(false);
      contract.flush(PAIR_CONTRACT);
    });

    it('shows "Caricamento…" and no open question until what the server proposes is read', async () => {
      const harness = await RouterTestingHarness.create('/driver/new-trip');
      await settle(harness.fixture);
      const element = harness.routeNativeElement as HTMLElement;

      expect(text(element.querySelector('main [role="status"]'))).toBe('Caricamento…');
      expect(element.querySelector('[aria-current="step"]')).toBeNull();

      http
        .expectOne(NEW_TRIP_URL)
        .flush({ vehicle: null, trailer: null, hasTripInProgress: false });
      await settle(harness.fixture);
      http.match(isVehicles).forEach((request) => request.flush([]));
      await settle(harness.fixture);

      expect(element.querySelector('main [role="status"]')).toBeNull();
      expect(element.querySelector('[aria-current="step"]')).not.toBeNull();
    });

    it('"Inserisci e inizia ora", the main one, and "Inserisci soltanto" are disabled until every question is answered', async () => {
      const opened = await open();

      const [main, only] = buttons(opened);

      expect(buttons(opened).map((button) => text(button))).toEqual([
        'Inserisci e inizia ora',
        'Inserisci soltanto',
      ]);
      expect(main.classList).toContain('pt-btn--xl');
      expect(main.classList).toContain('pt-btn--primary');
      expect(only.classList).not.toContain('pt-btn--primary');
      expect(main.disabled).toBe(true);
      expect(only.disabled).toBe(true);
      expect(text(opened.element.querySelector('.pt-bottombar'))).not.toContain('Hai un viaggio');
    });

    it('with the three answers given both buttons are enabled', async () => {
      const opened = await openComplete();

      expect(buttons(opened).map((button) => button.disabled)).toEqual([false, false]);
      expect(currents(opened)).toEqual([null, null, null]);
      http.verify();
    });

    it('with a trip in progress the page offers only "Inserisci", under the line about the trip in progress', async () => {
      const opened = await openComplete({ hasTripInProgress: true });

      expect(buttons(opened).map((button) => text(button))).toEqual(['Inserisci']);
      expect(buttons(opened)[0].classList).toContain('pt-btn--primary');
      expect(buttons(opened)[0].disabled).toBe(false);
      expect(text(opened.element.querySelector('.pt-bottombar'))).toBe(
        'Hai un viaggio in corso: questo lo inizierai dopo. Inserisci',
      );
    });

    it('with a trip in progress "Inserisci" waits for the three answers', async () => {
      const opened = await open({ hasTripInProgress: true });

      expect(buttons(opened)[0].disabled).toBe(true);
    });

    it('the questions and the buttons sit in one centred column of 640px, the bar fixed at the bottom of the phone and static from 900px', async () => {
      const opened = await open();

      const column = opened.element.querySelector('main')!;
      const bar = opened.element.querySelector('.pt-bottombar')!;

      for (const name of ['max-w-[640px]', 'mx-auto', 'w-full']) {
        expect(column.classList).toContain(name);
        expect(bar.firstElementChild?.classList).toContain(name);
      }
      expect(bar.classList).toContain('sticky');
      expect(bar.classList).toContain('bottom-0');
      expect(bar.classList).toContain('min-[900px]:static');
    });

    it('the back arrow leaves at once when the driver gave nothing', async () => {
      const opened = await open();

      await click(opened, opened.element.querySelector('a[aria-label="Torna alla home"]'));
      await vi.waitFor(() => expect(url()).toBe('/driver'));
      http.match(() => true);

      expect(leaveDialog(opened)).toBeNull();
    });

    it('the back arrow asks "Uscire senza salvare?" after an answer: "Resta sulla pagina" stays, "Esci senza salvare" leaves', async () => {
      const opened = await openAtCustomer();
      await chooseCustomer(opened, PENNE, PAIR_CONTRACT);

      await click(opened, opened.element.querySelector('a[aria-label="Torna alla home"]'));

      const dialog = leaveDialog(opened)!;
      expect(text(dialog.querySelector('.pt-title'))).toBe('Uscire senza salvare?');
      const actions = Array.from(dialog.querySelectorAll('.pt-dialog__actions button'));
      expect(actions.map((b) => text(b))).toEqual(['Resta sulla pagina', 'Esci senza salvare']);
      expect(url()).toBe('/driver/new-trip');

      await click(opened, actions[0]);

      expect(leaveDialog(opened)).toBeNull();
      expect(url()).toBe('/driver/new-trip');
      expect(lines(opened, 1)).toEqual(['Comune di Penne']);

      await click(opened, opened.element.querySelector('a[aria-label="Torna alla home"]'));
      await click(opened, leaveDialog(opened)!.querySelectorAll('.pt-dialog__actions button')[1]);
      http.match(() => true);

      expect(url()).toBe('/driver');
    });
  });

  describe('the vehicle', () => {
    it('with no vehicle proposed question 1 is the open one, with the search field and a card per vehicle, plate in monospace over the description', async () => {
      const opened = await open({}, [TRACTOR, STANDALONE]);

      expect(currents(opened)).toEqual(['step', null, null]);
      const search = opened.element.querySelector<HTMLInputElement>('app-vehicle-question input')!;
      expect(search.placeholder).toBe('Cerca targa o descrizione…');
      const cards = Array.from(opened.element.querySelectorAll('app-vehicle-question .pt-choice'));
      expect(cards.map((card) => text(card))).toEqual([
        'AB123CDScania R450',
        'CD456EFRibaltabile Menci',
      ]);
      expect(cards[0].querySelector('.pt-mono')?.textContent).toBe('AB123CD');
      expect(cards[0].querySelector('.pt-choice__hint')?.textContent).toBe('Scania R450');
      expect(text(opened.element.querySelector('.pt-question__title'))).toBe('Con quale mezzo?');
    });

    it('the vehicle and trailer the server proposes answer question 1, named "Mezzo · l\'ultimo che hai usato oggi", question 2 open, no vehicles asked and the page not dirty', async () => {
      const opened = await open({ vehicle: TRACTOR, trailer: TRAILER });

      expect(titleOf(opened, 0)).toBe("Mezzo · l'ultimo che hai usato oggi");
      expect(lines(opened, 0)).toEqual(['AB123CD · Scania R450', 'XA456ZZ · Semirimorchio Menci']);
      expect(currents(opened)).toEqual([null, 'step', null]);
      expect(scrolled).toEqual([]);
      http.match((request) => request.url === CUSTOMERS_URL);
      http.verify();

      await click(opened, opened.element.querySelector('a[aria-label="Torna alla home"]'));
      await vi.waitFor(() => expect(url()).toBe('/driver'));
      http.match(() => true);
      expect(leaveDialog(opened)).toBeNull();
    });

    it('the name loses "l\'ultimo che hai usato oggi" after "Modifica" and another choice', async () => {
      const opened = await open({ vehicle: STANDALONE });

      await click(opened, modifyOf(opened, 0));
      await flushVehicles(opened, 'Leading', [STANDALONE, FREE_TRACTOR]);
      expect(titleOf(opened, 0)).toBe('Con quale mezzo?');
      await click(opened, vehicleCard(opened, 'CD456EF').querySelector('input'));
      expect(titleOf(opened, 0)).toBe("Mezzo · l'ultimo che hai usato oggi");

      await click(opened, modifyOf(opened, 0));
      await click(opened, vehicleCard(opened, 'AB999CD').querySelector('input'));
      await flushVehicles(opened, 'Trailer', [TRAILER]);

      await click(opened, vehicleCard(opened, 'XA456ZZ').querySelector('input'));

      expect(titleOf(opened, 0)).toBe('Mezzo');
      expect(lines(opened, 0)).toEqual([
        'AB999CD · Iveco Stralis',
        'XA456ZZ · Semirimorchio Menci',
      ]);
    });

    it('a tractor that requires a trailer proposed with none leaves question 1 open on "Con quale rimorchio?"', async () => {
      const opened = await open({ vehicle: TRACTOR, trailer: null }, [TRAILER]);

      expect(currents(opened)).toEqual(['step', null, null]);
      expect(titleOf(opened, 0)).toBe('Con quale rimorchio?');
      expect(
        Array.from(opened.element.querySelectorAll('app-vehicle-question .pt-choice')).map((c) =>
          text(c),
        ),
      ).toEqual(['XA456ZZSemirimorchio Menci']);
    });

    it('a tap on a standalone vehicle answers question 1 at once, with no trailer asked and no "Avanti", and opens question 2', async () => {
      const opened = await open({}, [STANDALONE]);

      await click(opened, vehicleCard(opened, 'CD456EF').querySelector('input'));

      expect(lines(opened, 0)).toEqual(['CD456EF · Ribaltabile Menci']);
      expect(currents(opened)).toEqual([null, 'step', null]);
      expect(text(opened.element)).not.toContain('Avanti');
      http.match((request) => request.url === CUSTOMERS_URL);
      http.verify();
    });

    it('a tractor that requires a trailer asks "Con quale rimorchio?" among the trailers, with no "Senza rimorchio", and closes on a trailer, with two lines', async () => {
      const opened = await open({}, [TRACTOR]);

      await click(opened, vehicleCard(opened, 'AB123CD').querySelector('input'));
      await flushVehicles(opened, 'Trailer', [TRAILER]);

      expect(titleOf(opened, 0)).toBe('Con quale rimorchio?');
      expect(currents(opened)[0]).toBe('step');
      expect(text(opened.element)).not.toContain('Senza rimorchio');

      await click(opened, vehicleCard(opened, 'XA456ZZ').querySelector('input'));

      expect(lines(opened, 0)).toEqual(['AB123CD · Scania R450', 'XA456ZZ · Semirimorchio Menci']);
      expect(currents(opened)).toEqual([null, 'step', null]);
    });

    it('a tractor that does not require a trailer offers "Senza rimorchio" and closes on it with one line', async () => {
      const opened = await open({}, [FREE_TRACTOR]);

      await click(opened, vehicleCard(opened, 'AB999CD').querySelector('input'));
      await flushVehicles(opened, 'Trailer', [TRAILER]);

      const cards = Array.from(opened.element.querySelectorAll('app-vehicle-question .pt-choice'));
      expect(cards.map((card) => text(card))).toEqual([
        'Senza rimorchio',
        'XA456ZZSemirimorchio Menci',
      ]);

      await click(opened, cards[0].querySelector('input'));

      expect(lines(opened, 0)).toEqual(['AB999CD · Iveco Stralis']);
      expect(currents(opened)).toEqual([null, 'step', null]);
    });

    it('a tractor in place of a standalone vehicle asks the trailer again and keeps every other answer', async () => {
      const opened = await openComplete();

      await click(opened, modifyOf(opened, 0));
      await flushVehicles(opened, 'Leading', [STANDALONE, TRACTOR]);
      await click(opened, vehicleCard(opened, 'AB123CD').querySelector('input'));
      await flushVehicles(opened, 'Trailer', [TRAILER]);

      expect(titleOf(opened, 0)).toBe('Con quale rimorchio?');
      await click(opened, vehicleCard(opened, 'XA456ZZ').querySelector('input'));

      expect(lines(opened, 0)).toEqual(['AB123CD · Scania R450', 'XA456ZZ · Semirimorchio Menci']);
      expect(lines(opened, 1)).toEqual(['Comune di Penne']);
      expect(lines(opened, 2)).toEqual(['Magazzino A, Penne', '→ Cantiere X, Chieti Scalo']);
      expect(currents(opened)).toEqual([null, null, null]);
    });
  });

  describe('customer and locations', () => {
    it('question 2 opens with the customers the server lists for today, the recent ones under "Usati di recente", and the line under the list', async () => {
      const opened = await openAtCustomer();

      expect(titleOf(opened, 1)).toBe('Per quale cliente?');
      expect(currents(opened)).toEqual([null, 'step', null]);
      const search = opened.element.querySelector<HTMLInputElement>(
        'app-customer-question input[type="search"]',
      )!;
      expect(search.placeholder).toBe('Cerca cliente…');
      expect(text(opened.element.querySelector('app-customer-question .pt-label'))).toBe(
        'Usati di recente',
      );
      expect(
        Array.from(opened.element.querySelectorAll('app-customer-question .pt-choice')).map((c) =>
          text(c),
        ),
      ).toEqual(['Calcestruzzi Vestina S.p.A. P.IVA 01234567897', 'Comune di Penne']);
      expect(text(opened.element)).toContain('Non trovi il cliente? Chiama la segreteria.');
    });

    it('a tap on a customer reads its contract and answers question 2 with no "Avanti", opening the locations', async () => {
      const opened = await openAtCustomer();

      await chooseCustomer(opened, PENNE, PAIR_CONTRACT);

      expect(lines(opened, 1)).toEqual(['Comune di Penne']);
      expect(currents(opened)).toEqual([null, null, 'step']);
      expect(titleOf(opened, 2)).toBe('Da dove a dove?');
      expect(text(opened.element)).not.toContain('Avanti');
      http.verify();
    });

    it('a pair contract asks "Partenza" then "Consegna", closes on the delivery and reads "<name>, <municipality>" then "-> <name>, <municipality>"', async () => {
      const opened = await openAtCustomer();
      await chooseCustomer(opened, PENNE, PAIR_CONTRACT);

      await click(opened, placeCard(opened, 'Magazzino A').querySelector('input'));
      expect(currents(opened)).toEqual([null, null, 'step']);
      await click(opened, placeCard(opened, 'Cantiere X').querySelector('input'));

      expect(titleOf(opened, 2)).toBe('Luoghi');
      expect(lines(opened, 2)).toEqual(['Magazzino A, Penne', '→ Cantiere X, Chieti Scalo']);
      expect(currents(opened)).toEqual([null, null, null]);
      http.verify();
    });

    it('a delivery contract asks "Dove consegni?", then "Continua" answers, named "Luoghi (facoltativi)" and read as "Consegna: <name>, <municipality>"', async () => {
      const opened = await openAtCustomer();
      await chooseCustomer(opened, PENNE, DELIVERY_CONTRACT);

      expect(titleOf(opened, 2)).toBe('Dove consegni?');
      await click(opened, placeCard(opened, 'Depuratore').querySelector('input'));
      await click(opened, locationsButton(opened, 'Continua'));

      expect(titleOf(opened, 2)).toBe('Luoghi (facoltativi)');
      expect(lines(opened, 2)).toEqual(['Consegna: Depuratore consortile, Loreto Aprutino']);
    });

    it('a pickup contract asks "Da dove parti?"', async () => {
      const opened = await openAtCustomer();

      await chooseCustomer(opened, PENNE, {
        locationsAsked: 'Pickup',
        places: [{ pickup: MAGAZZINO, delivery: null }],
        lastPlace: null,
      });

      expect(titleOf(opened, 2)).toBe('Da dove parti?');
    });

    it('a contract that asks no location asks "Vuoi indicare i luoghi?" and "Salta" answers "Nessun luogo"', async () => {
      const opened = await openAtCustomer();
      await chooseCustomer(opened, PENNE, FLAT_CONTRACT);

      expect(titleOf(opened, 2)).toBe('Vuoi indicare i luoghi?');
      await click(opened, locationsButton(opened, 'Salta'));

      expect(titleOf(opened, 2)).toBe('Luoghi (facoltativi)');
      expect(lines(opened, 2)).toEqual(['Nessun luogo']);
      expect(currents(opened)).toEqual([null, null, null]);
    });

    it('the location or pair of the latest trip for the customer is already selected, and a tap on it answers', async () => {
      const opened = await openAtCustomer();
      await chooseCustomer(opened, PENNE, {
        ...PAIR_CONTRACT,
        lastPlace: { pickup: MAGAZZINO, delivery: CANTIERE },
      });

      const selected = Array.from(
        opened.element.querySelectorAll<HTMLLabelElement>('app-locations-question .pt-choice'),
      )
        .filter((card) => card.querySelector('input')!.checked)
        .map((card) => text(card));
      expect(selected).toEqual(['Magazzino APenne', 'Cantiere XChieti Scalo']);
      expect(currents(opened)).toEqual([null, null, 'step']);

      await click(opened, placeCard(opened, 'Cantiere X').querySelector('input'));

      expect(lines(opened, 2)).toEqual(['Magazzino A, Penne', '→ Cantiere X, Chieti Scalo']);
    });

    it('another customer whose contract asks other locations empties them and asks again, keeping the vehicle', async () => {
      const opened = await openComplete();

      await click(opened, modifyOf(opened, 1));
      await chooseCustomer(opened, VESTINA, DELIVERY_CONTRACT);

      expect(lines(opened, 1)).toEqual(['Calcestruzzi Vestina S.p.A.']);
      expect(currents(opened)).toEqual([null, null, 'step']);
      expect(titleOf(opened, 2)).toBe('Dove consegni?');
      expect(lines(opened, 0)).toEqual(['CD456EF · Ribaltabile Menci']);
    });

    it('another customer whose contract has the same places keeps the locations', async () => {
      const opened = await openComplete();

      await click(opened, modifyOf(opened, 1));
      await chooseCustomer(opened, VESTINA, PAIR_CONTRACT);

      expect(lines(opened, 1)).toEqual(['Calcestruzzi Vestina S.p.A.']);
      expect(lines(opened, 2)).toEqual(['Magazzino A, Penne', '→ Cantiere X, Chieti Scalo']);
      expect(currents(opened)).toEqual([null, null, null]);
    });

    it('a contract that cannot be read leaves question 2 open with the generic error', async () => {
      const opened = await openAtCustomer();

      await click(opened, customerCard(opened, 'Comune di Penne').querySelector('input'));
      http.expectOne((r) => r.url === QUESTIONS_URL).flush(null, REFUSED);
      await settle(opened.harness.fixture);

      expect(currents(opened)).toEqual([null, 'step', null]);
      expect(text(opened.element.querySelector('app-customer-question .pt-field__error'))).toBe(
        'Si è verificato un errore. Riprova tra poco.',
      );
    });

    it('a customer with no contract in force today stays unanswered, with the generic error', async () => {
      const opened = await openAtCustomer();

      await chooseCustomer(opened, PENNE, null);

      expect(lines(opened, 1)).toEqual([]);
      expect(currents(opened)).toEqual([null, 'step', null]);
      expect(text(opened.element.querySelector('app-customer-question .pt-field__error'))).toBe(
        'Si è verificato un errore. Riprova tra poco.',
      );
    });

    it('a customer tapped, then "Modifica" of another question before the read settles: that question stays open and the customer is not answered', async () => {
      const opened = await openAtCustomer();
      await click(opened, customerCard(opened, 'Comune di Penne').querySelector('input'));
      const old = http.expectOne((r) => r.url === QUESTIONS_URL);

      await click(opened, modifyOf(opened, 0));
      old.flush(PAIR_CONTRACT);
      await settle(opened.harness.fixture);

      expect(currents(opened)).toEqual(['step', null, null]);
      expect(lines(opened, 1)).toEqual([]);
    });

    it('two customers tapped: the read of the first, settling last, is discarded', async () => {
      const opened = await openAtCustomer();
      await click(opened, customerCard(opened, 'Comune di Penne').querySelector('input'));
      const first = http.expectOne(
        (r) => r.url === QUESTIONS_URL && r.params.get('customerId') === 'c2',
      );
      await click(opened, customerCard(opened, 'Calcestruzzi').querySelector('input'));
      const second = http.expectOne(
        (r) => r.url === QUESTIONS_URL && r.params.get('customerId') === 'c1',
      );

      second.flush(DELIVERY_CONTRACT);
      await settle(opened.harness.fixture);
      first.flush(PAIR_CONTRACT);
      await settle(opened.harness.fixture);

      expect(lines(opened, 1)).toEqual(['Calcestruzzi Vestina S.p.A.']);
      expect(titleOf(opened, 2)).toBe('Dove consegni?');
    });
  });

  describe('adding', () => {
    const BODY = {
      vehicleId: 'cd456ef',
      trailerId: null,
      customerId: 'c2',
      pickupLocationId: 'l1',
      deliveryLocationId: 'l2',
    };

    const refuse = async (opened: Opened, status: number, body: object | null = null) => {
      http.expectOne(isAdd).flush(body, { status, statusText: 'Refused' });
      await settle(opened.harness.fixture);
    };

    const home = async (opened: Opened) => {
      await vi.waitFor(() => expect(url()).toBe('/driver'));
      await settle(opened.harness.fixture);
      http.match(() => true);
    };

    it('"Inserisci e inizia ora" adds the trip started, with the ids alone, and leads to the home with no page that confirms and no unsaved-changes question', async () => {
      const opened = await openComplete();

      await press(opened, 0);

      const request = http.expectOne(isAdd);
      expect(request.request.body).toEqual({ ...BODY, start: true });
      expect(Object.keys(request.request.body as object).join(' ')).not.toMatch(
        /driver|amount|price|total|day|time|end/i,
      );
      request.flush({}, { status: 201, statusText: 'Created' });
      await home(opened);

      expect(url()).toBe('/driver');
      expect(leaveDialog(opened)).toBeNull();
    });

    it('"Inserisci soltanto" adds the trip without starting it and leads to the home', async () => {
      const opened = await openComplete();

      await press(opened, 1);

      const request = http.expectOne(isAdd);
      expect(request.request.body).toEqual({ ...BODY, start: false });
      request.flush({}, { status: 201, statusText: 'Created' });
      await home(opened);

      expect(url()).toBe('/driver');
    });

    it('with a trip in progress "Inserisci" adds the trip without starting it and leads to the home', async () => {
      const opened = await openComplete({ hasTripInProgress: true });

      await press(opened, 0);

      const request = http.expectOne(isAdd);
      expect(request.request.body).toEqual({ ...BODY, start: false });
      request.flush({}, { status: 201, statusText: 'Created' });
      await home(opened);

      expect(url()).toBe('/driver');
    });

    it('while the adding is in flight both buttons are disabled and a second press sends nothing', async () => {
      const opened = await openComplete();

      await press(opened, 0);

      expect(buttons(opened).map((button) => button.disabled)).toEqual([true, true]);
      buttons(opened)[1].click();
      await settle(opened.harness.fixture);
      expect(http.match(isAdd)).toHaveLength(1);
    });

    it('an adding that does not reach the server shows "Connessione persa. Riprova." at the top, brought into view, keeps every answer and can be pressed again', async () => {
      const opened = await openComplete();

      await press(opened, 0);
      http.expectOne(isAdd).error(new ProgressEvent('error'), { status: 0 });
      await settle(opened.harness.fixture);

      const shown = notice(opened);
      expect(text(shown)).toBe('Connessione persa. Riprova.');
      expect(opened.element.querySelector('main')?.firstElementChild).toBe(shown);
      expect(scrolled).toContain(shown);
      expect(lines(opened, 0)).toEqual(['CD456EF · Ribaltabile Menci']);
      expect(lines(opened, 1)).toEqual(['Comune di Penne']);
      expect(lines(opened, 2)).toEqual(['Magazzino A, Penne', '→ Cantiere X, Chieti Scalo']);
      expect(buttons(opened).map((button) => button.disabled)).toEqual([false, false]);
      expect(url()).toBe('/driver/new-trip');
    });

    it('a second press, after a lost connection and after a refusal, sends the same identifier', async () => {
      const opened = await openComplete();

      await press(opened, 0);
      const first = http.expectOne(isAdd);
      first.error(new ProgressEvent('error'), { status: 0 });
      await settle(opened.harness.fixture);
      await press(opened, 1);
      const second = http.expectOne(isAdd);
      second.flush(null, REFUSED);
      await settle(opened.harness.fixture);
      await press(opened, 0);
      const third = http.expectOne(isAdd);

      expect(first.request.url).toMatch(/\/trips\/[0-9a-f-]{36}$/);
      expect(second.request.url).toBe(first.request.url);
      expect(third.request.url).toBe(first.request.url);
      expect(notice(opened)).toBeNull();
      third.flush({}, { status: 200, statusText: 'OK' });
    });

    it('a 422 shows the text of the server as the notice at the top, keeping every answer', async () => {
      const opened = await openComplete();

      await press(opened, 0);
      await refuse(opened, 422, {
        errorCode: 'Operations.Trip.AnotherInProgress',
        detail: 'Hai un viaggio in corso: termina quello prima di iniziare questo.',
      });

      expect(text(notice(opened))).toBe(
        'Hai un viaggio in corso: termina quello prima di iniziare questo.',
      );
      expect(scrolled).toContain(notice(opened));
      expect(lines(opened, 1)).toEqual(['Comune di Penne']);
      expect(buttons(opened).map((button) => button.disabled)).toEqual([false, false]);
      expect(url()).toBe('/driver/new-trip');
    });

    it('a 409 shows "Qualcosa è cambiato mentre compilavi. Controlla le risposte e riprova." at the top, reads the choices again, empties the vehicle that no longer holds and opens its question, keeping the rest', async () => {
      const opened = await openComplete();

      await press(opened, 0);
      await refuse(opened, 409, {
        errorCode: 'Registry.Trip.AnswersChanged',
        detail: 'Qualcosa è cambiato mentre compilavi. Controlla le risposte e riprova.',
      });

      expect(text(notice(opened))).toBe(
        'Qualcosa è cambiato mentre compilavi. Controlla le risposte e riprova.',
      );
      expect(scrolled).toContain(notice(opened));
      // the customers read before are read again: one that no longer holds is no longer offered
      expect(http.match((r) => r.url === CUSTOMERS_URL).length).toBeGreaterThan(0);
      http
        .expectOne(
          (r) =>
            r.url === CHECK_URL &&
            r.params.toString() ===
              'vehicleId=cd456ef&customerId=c2&pickupLocationId=l1&deliveryLocationId=l2',
        )
        .flush({ ...ALL_HOLD, vehicle: false });
      await flushQuestions(opened, 'c2', PAIR_CONTRACT);
      http.match(isVehicles).forEach((request) => request.flush([STANDALONE]));
      await settle(opened.harness.fixture);

      expect(currents(opened)).toEqual(['step', null, null]);
      expect(lines(opened, 1)).toEqual(['Comune di Penne']);
      expect(lines(opened, 2)).toEqual(['Magazzino A, Penne', '→ Cantiere X, Chieti Scalo']);
      expect(buttons(opened).map((button) => button.disabled)).toEqual([true, true]);
    });

    it('a 409 whose choices cannot be read again shows the other text', async () => {
      const opened = await openComplete();

      await press(opened, 0);
      await refuse(opened, 409);
      http.expectOne((r) => r.url === CHECK_URL).flush(null, REFUSED);
      await flushQuestions(opened, 'c2', PAIR_CONTRACT);

      expect(text(notice(opened))).toBe(
        'Non è stato possibile inserire il viaggio. Chiama la segreteria.',
      );
    });

    it('any other refusal shows "Non è stato possibile inserire il viaggio. Chiama la segreteria." and no detail of the server', async () => {
      const opened = await openComplete();

      await press(opened, 0);
      await refuse(opened, 400, {
        errorCode: 'Registry.Trip.NotPriceable',
        detail: 'Importo 12',
      });

      expect(text(notice(opened))).toBe(
        'Non è stato possibile inserire il viaggio. Chiama la segreteria.',
      );
      expect(text(opened.element)).not.toContain('Importo');
      expect(buttons(opened).map((button) => button.disabled)).toEqual([false, false]);
    });

    it('a refusal that settles after the driver changed an answer is not shown', async () => {
      const opened = await openComplete();

      await press(opened, 0);
      await click(opened, modifyOf(opened, 1));
      await refuse(opened, 422, { errorCode: 'Operations.Trip.AnotherInProgress', detail: 'No.' });

      expect(notice(opened)).toBeNull();
    });

    it('choices read again after a 409 that settle after the driver opened another question are not applied', async () => {
      const opened = await openComplete();

      await press(opened, 0);
      await refuse(opened, 409);
      await click(opened, modifyOf(opened, 2));
      http.expectOne((r) => r.url === CHECK_URL).flush({ ...ALL_HOLD, customer: false });
      http
        .expectOne((r) => r.url === QUESTIONS_URL)
        .flush(null, { status: 404, statusText: 'Not Found' });
      await settle(opened.harness.fixture);

      expect(lines(opened, 1)).toEqual(['Comune di Penne']);
      expect(currents(opened)).toEqual([null, null, 'step']);
    });
  });

  describe('starting from a repeated trip', () => {
    const REPEATED: RepeatableTrip = {
      vehicle: TRACTOR,
      trailer: TRAILER,
      customer: PENNE,
      pickup: MAGAZZINO,
      delivery: CANTIERE,
    };
    const isCheck = (request: HttpRequest<unknown>) => request.url === CHECK_URL;
    const isQuestions = (request: HttpRequest<unknown>) => request.url === QUESTIONS_URL;
    const PROPOSAL = { vehicle: STANDALONE, trailer: null, hasTripInProgress: false };

    /** Taps the card of the trip on the home; "Nuovo viaggio" opens and reads what it needs. */
    const tapCard = async (trip: RepeatableTrip) => {
      repeating = trip;
      const harness = await RouterTestingHarness.create('/driver');
      await settle(harness.fixture);
      (harness.routeNativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('button')!
        .click();
      await vi.waitFor(() => expect(url()).toBe('/driver/new-trip'));
      await settle(harness.fixture);
      return harness;
    };

    /** Taps the card and answers the three reads "Nuovo viaggio" makes. */
    const openRepeated = async (
      options: {
        trip?: RepeatableTrip;
        check?: object;
        contract?: TripQuestions | null;
        proposal?: Partial<NewTrip>;
      } = {},
    ) => {
      const {
        trip = REPEATED,
        check = ALL_HOLD,
        contract = PAIR_CONTRACT,
        proposal = {},
      } = options;
      const harness = await tapCard(trip);
      http.expectOne(NEW_TRIP_URL).flush({ ...PROPOSAL, ...proposal });
      await settle(harness.fixture);
      http.expectOne(isCheck).flush(check);
      const read = http.expectOne(isQuestions);
      if (contract === null) {
        read.flush(null, { status: 404, statusText: 'Not Found' });
      } else {
        read.flush(contract);
      }
      await settle(harness.fixture);
      return { harness, element: harness.routeNativeElement as HTMLElement };
    };

    it('a card opens the page with vehicle, trailer, customer and locations answered and no question open', async () => {
      const opened = await openRepeated();

      expect(currents(opened)).toEqual([null, null, null]);
      expect(lines(opened, 0)).toEqual(['AB123CD + XA456ZZ']);
      expect(lines(opened, 1)).toEqual(['Comune di Penne']);
      expect(lines(opened, 2)).toEqual(['Magazzino A, Penne', '→ Cantiere X, Chieti Scalo']);
      expect(buttons(opened).map((button) => button.disabled)).toEqual([false, false]);
      http.match(() => true);
    });

    it('the answers are checked against the registry and the contract, with no day, before any question opens', async () => {
      const harness = await tapCard(REPEATED);
      http.expectOne(NEW_TRIP_URL).flush(PROPOSAL);
      await settle(harness.fixture);

      const check = http.expectOne(isCheck).request.params;
      const contract = http.expectOne(isQuestions).request.params;
      const opened = { harness, element: harness.routeNativeElement as HTMLElement };

      expect(Object.fromEntries(check.keys().map((key) => [key, check.get(key)]))).toEqual({
        vehicleId: 'ab123cd',
        trailerId: 'xa456zz',
        customerId: 'c2',
        pickupLocationId: 'l1',
        deliveryLocationId: 'l2',
      });
      expect(contract.get('customerId')).toBe('c2');
      expect(contract.has('day')).toBe(false);
      expect(currents(opened)).toEqual([null, null, null]);
      http.match(() => true);
    });

    it('nothing is saved until a button, the prefilled answers do not make the page dirty and the proposal of the server is not applied over them', async () => {
      const opened = await openRepeated();

      expect(http.match(isAdd)).toEqual([]);
      expect(text(questions(opened)[0])).not.toContain("l'ultimo che hai usato oggi");
      expect(lines(opened, 0)).toEqual(['AB123CD + XA456ZZ']);
      await opened.harness.navigateByUrl('/driver');
      await settle(opened.harness.fixture);

      expect(url()).toBe('/driver');
      expect(leaveDialog(opened)).toBeNull();
      http.match(() => true);
    });

    it('a button adds the repeated trip', async () => {
      const opened = await openRepeated();

      await press(opened, 1);

      expect(http.expectOne(isAdd).request.body).toEqual({
        vehicleId: 'ab123cd',
        trailerId: 'xa456zz',
        customerId: 'c2',
        pickupLocationId: 'l1',
        deliveryLocationId: 'l2',
        start: false,
      });
      http.match(() => true);
    });

    it.each<[string, object, TripQuestions | null, number]>([
      ['a vehicle', { ...ALL_HOLD, vehicle: false }, PAIR_CONTRACT, 0],
      ['a trailer', { ...ALL_HOLD, trailer: false }, PAIR_CONTRACT, 0],
      ['a customer without a contract today', ALL_HOLD, null, 1],
      ['a customer that fails the check', { ...ALL_HOLD, customer: false }, PAIR_CONTRACT, 1],
      ['a pickup', { ...ALL_HOLD, pickup: false }, PAIR_CONTRACT, 2],
      ['a delivery', { ...ALL_HOLD, delivery: false }, PAIR_CONTRACT, 2],
    ])(
      '%s that no longer holds is emptied and its question is the open one, the others stay',
      async (_name, check, contract, index) => {
        const opened = await openRepeated({ check, contract });

        expect(currents(opened).map((current) => current === 'step')).toEqual(
          [0, 1, 2].map((i) => i === index),
        );
        // A customer that fails takes the locations with it: the contract they belong to is gone.
        const holding = (index === 1 ? [0] : [0, 1, 2]).filter((i) => i !== index);
        for (const i of holding) {
          expect(questions(opened)[i].querySelector('.pt-question__value')).not.toBeNull();
        }
        expect(questions(opened)[index].querySelector('.pt-question__value')).toBeNull();
        expect(buttons(opened).map((button) => button.disabled)).toEqual([true, true]);
        http.match(() => true);
      },
    );

    it('locations that all hold in the registry but not under what the contract asks leave question 3 open', async () => {
      const opened = await openRepeated({ trip: { ...REPEATED, pickup: null } });

      expect(currents(opened)).toEqual([null, null, 'step']);
      expect(titleOf(opened, 2)).toBe('Da dove a dove?');
      expect(questions(opened)[2].querySelector('.pt-question__value')).toBeNull();
      expect(buttons(opened).map((button) => button.disabled)).toEqual([true, true]);
      http.match(() => true);
    });

    it('a tractor that requires a trailer repeated without one leaves question 1 open on "Con quale rimorchio?"', async () => {
      const opened = await openRepeated({ trip: { ...REPEATED, trailer: null } });

      expect(currents(opened)[0]).toBe('step');
      expect(titleOf(opened, 0)).toBe('Con quale rimorchio?');
      expect(questions(opened)[1].querySelector('.pt-question__value')).not.toBeNull();
      http.match(() => true);
    });

    it('a repeated vehicle reads "<plate> + <plate>" until another is chosen', async () => {
      const opened = await openRepeated();
      expect(lines(opened, 0)).toEqual(['AB123CD + XA456ZZ']);

      await click(opened, modifyOf(opened, 0));
      http.match(isVehicles).forEach((request) => request.flush([TRACTOR, STANDALONE]));
      await settle(opened.harness.fixture);
      await click(
        opened,
        Array.from(opened.element.querySelectorAll('app-vehicle-question .pt-choice'))
          .find((card) => text(card)?.includes('Ribaltabile Menci'))!
          .querySelector('input'),
      );

      expect(lines(opened, 0)).toEqual(['CD456EF · Ribaltabile Menci']);
      http.match(() => true);
    });

    it('when the registry cannot be asked the page opens as from the home, with the vehicle proposed', async () => {
      const harness = await tapCard(REPEATED);
      http.expectOne(NEW_TRIP_URL).flush(PROPOSAL);
      await settle(harness.fixture);
      http.expectOne(isCheck).flush(null, REFUSED);
      http.expectOne(isQuestions).flush(PAIR_CONTRACT);
      await settle(harness.fixture);
      const opened = { harness, element: harness.routeNativeElement as HTMLElement };

      expect(currents(opened)).toEqual([null, 'step', null]);
      expect(lines(opened, 0)).toEqual(['CD456EF · Ribaltabile Menci']);
      http.match(() => true);
    });

    it('a repeat is used once: "Nuovo viaggio" opened again afterwards starts clean', async () => {
      const opened = await openRepeated();
      await opened.harness.navigateByUrl('/driver');
      await settle(opened.harness.fixture);
      http.match(() => true);

      await opened.harness.navigateByUrl('/driver/new-trip');
      await settle(opened.harness.fixture);
      http.expectOne(NEW_TRIP_URL).flush({ ...PROPOSAL, vehicle: null });
      await settle(opened.harness.fixture);

      http.expectNone(isCheck);
      const again = { ...opened, element: opened.harness.routeNativeElement as HTMLElement };
      expect(currents(again)).toEqual(['step', null, null]);
      expect(lines(again, 1)).toEqual([]);
      http.match(() => true);
    });
  });
});
