import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { LocationsAnswer, TripLocation, TripQuestions } from './new-trip-answers';
import { LocationsQuestion } from './locations-question';
import { TripsFacade } from './trips-facade';

const URL = '/api/operations/driver/locations';

const place = (id: string, name: string, municipality: string): TripLocation => ({
  id,
  name,
  municipality,
});
const MAGAZZINO = place('l1', 'Magazzino A', 'Penne');
const CAVA = place('l2', 'Cava Colle Trotta', 'Penne');
const CANTIERE = place('l3', 'Cantiere X', 'Chieti Scalo');
const IMPIANTO = place('l4', 'Impianto di betonaggio', 'Loreto Aprutino');
const DEPURATORE = place('l5', 'Depuratore consortile', 'Loreto Aprutino');

const questions = (
  locationsAsked: TripQuestions['locationsAsked'],
  places: TripQuestions['places'],
  lastPlace: TripQuestions['lastPlace'] = null,
): TripQuestions => ({ locationsAsked, places, lastPlace });

const PAIRS = questions('Both', [
  { pickup: MAGAZZINO, delivery: CANTIERE },
  { pickup: MAGAZZINO, delivery: IMPIANTO },
  { pickup: CAVA, delivery: CANTIERE },
]);
const DELIVERIES = questions('Delivery', [
  { pickup: null, delivery: CANTIERE },
  { pickup: null, delivery: IMPIANTO },
]);
const PICKUPS = questions('Pickup', [
  { pickup: MAGAZZINO, delivery: null },
  { pickup: CAVA, delivery: null },
]);
const FLAT = questions('None', []);

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();

@Component({
  imports: [LocationsQuestion],
  providers: [TripsFacade],
  template: `
    <app-locations-question
      [questions]="questions()"
      [locations]="locations()"
      (answered)="answers.push($event)"
    />
  `,
})
class Host {
  readonly questions = signal<TripQuestions>(PAIRS);
  readonly locations = signal<LocationsAnswer | null>(null);
  readonly answers: LocationsAnswer[] = [];
}

describe('LocationsQuestion', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Session, useValue: { signOut: () => Promise.resolve() } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const open = async (asked: TripQuestions, locations: LocationsAnswer | null = null) => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    host.questions.set(asked);
    host.locations.set(locations);
    await settle(fixture);
  };

  const element = () => fixture.nativeElement as HTMLElement;

  const flush = async (query: string, locations: TripLocation[]) => {
    http
      .expectOne((r: HttpRequest<unknown>) => r.url === URL && r.params.toString() === query)
      .flush(locations);
    await settle(fixture);
  };

  const cards = () => Array.from(element().querySelectorAll<HTMLLabelElement>('.pt-choice'));
  const names = () => cards().map((card) => text(card));
  const selected = () =>
    cards()
      .filter((card) => card.querySelector('input')!.checked)
      .map((card) => text(card));
  const labels = () => Array.from(element().querySelectorAll('.pt-label')).map((l) => text(l));
  const buttons = () => Array.from(element().querySelectorAll<HTMLButtonElement>('button'));
  const button = (label: string) => buttons().find((b) => text(b)?.startsWith(label));

  const tap = async (card: HTMLLabelElement | HTMLButtonElement | undefined) => {
    if (card instanceof HTMLLabelElement) {
      card.querySelector('input')!.click();
    } else {
      card!.click();
    }
    await settle(fixture);
  };

  const cardOf = (name: string) => cards().find((card) => text(card)?.startsWith(name));

  describe('on a pair', () => {
    it('asks "Partenza" with the distinct pickups, "<name>" over "<municipality>", and no delivery before a pickup is chosen', async () => {
      await open(PAIRS);

      expect(labels()).toEqual(['Partenza']);
      expect(names()).toEqual(['Magazzino APenne', 'Cava Colle TrottaPenne']);
      expect(cards()[0].querySelector('.pt-choice__hint')?.textContent).toBe('Penne');
      expect(selected()).toEqual([]);
      http.verify();
    });

    it('the deliveries are the ones the contract pairs with the chosen pickup, and a delivery closes the question', async () => {
      await open(PAIRS);

      await tap(cardOf('Magazzino A'));

      expect(labels()).toEqual(['Partenza', 'Consegna']);
      expect(names()).toEqual([
        'Magazzino APenne',
        'Cava Colle TrottaPenne',
        'Cantiere XChieti Scalo',
        'Impianto di betonaggioLoreto Aprutino',
      ]);
      expect(host.answers).toEqual([]);

      await tap(cardOf('Impianto'));

      expect(host.answers).toEqual([{ pickup: MAGAZZINO, delivery: IMPIANTO }]);
      http.verify();
    });

    it('another pickup shows only its deliveries', async () => {
      await open(PAIRS);

      await tap(cardOf('Cava'));

      expect(names().slice(2)).toEqual(['Cantiere XChieti Scalo']);
    });

    it('a delivery the new pickup does not pair is let go, so the question waits for another tap', async () => {
      await open(PAIRS, { pickup: MAGAZZINO, delivery: IMPIANTO });
      expect(selected()).toEqual(['Magazzino APenne', 'Impianto di betonaggioLoreto Aprutino']);

      await tap(cardOf('Cava'));

      expect(selected()).toEqual(['Cava Colle TrottaPenne']);
      expect(host.answers).toEqual([]);
    });

    it('a delivery still paired with the new pickup stays selected', async () => {
      await open(PAIRS, { pickup: MAGAZZINO, delivery: CANTIERE });

      await tap(cardOf('Cava'));

      expect(selected()).toEqual(['Cava Colle TrottaPenne', 'Cantiere XChieti Scalo']);
    });

    it('the last place used is selected, nothing is answered by itself, and a tap on the selected delivery confirms it', async () => {
      await open({ ...PAIRS, lastPlace: { pickup: MAGAZZINO, delivery: IMPIANTO } });

      expect(selected()).toEqual(['Magazzino APenne', 'Impianto di betonaggioLoreto Aprutino']);
      expect(host.answers).toEqual([]);

      await tap(cardOf('Impianto'));

      expect(host.answers).toEqual([{ pickup: MAGAZZINO, delivery: IMPIANTO }]);
    });

    it('the last place used can be left for another one', async () => {
      await open({ ...PAIRS, lastPlace: { pickup: MAGAZZINO, delivery: IMPIANTO } });

      await tap(cardOf('Cantiere'));

      expect(host.answers).toEqual([{ pickup: MAGAZZINO, delivery: CANTIERE }]);
    });

    it('a last place the contract does not offer is not selected', async () => {
      await open({ ...PAIRS, lastPlace: { pickup: CAVA, delivery: IMPIANTO } });

      expect(selected()).toEqual([]);
      expect(labels()).toEqual(['Partenza']);
    });

    it('an answer already given is shown selected', async () => {
      await open(PAIRS, { pickup: CAVA, delivery: CANTIERE });

      expect(selected()).toEqual(['Cava Colle TrottaPenne', 'Cantiere XChieti Scalo']);
    });
  });

  describe('on one side', () => {
    it('a delivery contract lists its deliveries and offers nothing more until one is chosen', async () => {
      await open(DELIVERIES);

      expect(names()).toEqual(['Cantiere XChieti Scalo', 'Impianto di betonaggioLoreto Aprutino']);
      expect(labels()).toEqual([]);
      expect(buttons()).toEqual([]);
      http.verify();
    });

    it('a delivery chosen offers "Aggiungi la partenza (facoltativa)" and "Continua", and "Continua" answers with no pickup', async () => {
      await open(DELIVERIES);

      await tap(cardOf('Cantiere'));

      expect(host.answers).toEqual([]);
      expect(buttons().map((b) => text(b))).toEqual([
        'Aggiungi la partenza (facoltativa)',
        'Continua',
      ]);

      await tap(button('Continua'));

      expect(host.answers).toEqual([{ pickup: null, delivery: CANTIERE }]);
      http.verify();
    });

    it('a pickup contract lists its pickups and offers "Aggiungi la consegna (facoltativa)"', async () => {
      await open(PICKUPS);
      expect(names()).toEqual(['Magazzino APenne', 'Cava Colle TrottaPenne']);

      await tap(cardOf('Cava'));

      expect(buttons().map((b) => text(b))).toEqual([
        'Aggiungi la consegna (facoltativa)',
        'Continua',
      ]);
    });

    it('the optional location is chosen among all active locations, with a search that queries the server', async () => {
      await open(PICKUPS);
      await tap(cardOf('Magazzino'));

      await tap(button('Aggiungi la consegna'));
      await flush('', [CANTIERE, IMPIANTO, DEPURATORE]);

      const search = element().querySelector<HTMLInputElement>('input[type="search"]')!;
      expect(search.placeholder).toBe('Cerca luogo…');
      expect(names().slice(2)).toEqual([
        'Cantiere XChieti Scalo',
        'Impianto di betonaggioLoreto Aprutino',
        'Depuratore consortileLoreto Aprutino',
      ]);

      vi.useFakeTimers();
      search.value = 'depur';
      search.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(299);
      http.expectNone((r) => r.params.get('search') === 'depur');
      vi.advanceTimersByTime(1);
      vi.useRealTimers();
      await settle(fixture);
      await flush('search=depur', [DEPURATORE]);

      await tap(cardOf('Depuratore'));
      expect(host.answers).toEqual([]);
      await tap(button('Continua'));

      expect(host.answers).toEqual([{ pickup: MAGAZZINO, delivery: DEPURATORE }]);
    });

    it('a search among the locations without results shows "Nessun risultato."', async () => {
      await open(PICKUPS);
      await tap(cardOf('Magazzino'));

      await tap(button('Aggiungi la consegna'));
      await flush('', []);

      expect(text(element())).toContain('Nessun risultato.');
    });

    it('switching the list to the other side drops a search typed a moment before', async () => {
      await open(FLAT);
      await tap(button('Partenza'));
      await flush('', [MAGAZZINO, CANTIERE]);
      const search = element().querySelector<HTMLInputElement>('input[type="search"]')!;

      vi.useFakeTimers();
      search.value = 'xyz';
      search.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100);
      button('Consegna')!.click();
      fixture.detectChanges();
      TestBed.tick();
      vi.advanceTimersByTime(400);
      vi.useRealTimers();
      await settle(fixture);

      http.expectNone((r) => r.url === URL);
      expect(search.value).toBe('');
    });

    it('a tap on the optional location selected takes it back', async () => {
      await open(DELIVERIES);
      await tap(cardOf('Cantiere'));
      await tap(button('Aggiungi la partenza'));
      await flush('', [MAGAZZINO]);
      await tap(cardOf('Magazzino'));
      expect(selected()).toEqual(['Cantiere XChieti Scalo', 'Magazzino APenne']);

      await tap(cardOf('Magazzino'));
      await tap(button('Continua'));

      expect(host.answers).toEqual([{ pickup: null, delivery: CANTIERE }]);
    });

    it('an optional location already answered keeps its list open and selected', async () => {
      await open(DELIVERIES, { pickup: MAGAZZINO, delivery: CANTIERE });
      await flush('', [MAGAZZINO, CAVA]);

      expect(selected()).toEqual(['Cantiere XChieti Scalo', 'Magazzino APenne']);
    });

    it('the last delivery used is selected and "Continua" confirms it', async () => {
      await open({ ...DELIVERIES, lastPlace: { pickup: MAGAZZINO, delivery: IMPIANTO } });

      expect(selected()).toEqual(['Impianto di betonaggioLoreto Aprutino']);
      expect(host.answers).toEqual([]);

      await tap(button('Continua'));

      expect(host.answers).toEqual([{ pickup: null, delivery: IMPIANTO }]);
    });
  });

  describe('on no location asked', () => {
    it('offers "Partenza", "Consegna" and "Salta", and "Salta" answers with no place', async () => {
      await open(FLAT);

      expect(buttons().map((b) => text(b))).toEqual(['Partenza', 'Consegna', 'Salta']);
      expect(cards()).toEqual([]);
      http.verify();

      await tap(button('Salta'));

      expect(host.answers).toEqual([{ pickup: null, delivery: null }]);
    });

    it('a place chosen for a side is answered with "Continua", and "Salta" is gone', async () => {
      await open(FLAT);

      await tap(button('Consegna'));
      await flush('', [CANTIERE, DEPURATORE]);
      await tap(cardOf('Depuratore'));

      expect(buttons().map((b) => text(b))).toEqual([
        'Partenza',
        'Consegna · Depuratore consortile',
        'Continua',
      ]);

      await tap(button('Continua'));

      expect(host.answers).toEqual([{ pickup: null, delivery: DEPURATORE }]);
    });

    it('both sides can be chosen, each from the list of all active locations', async () => {
      await open(FLAT);

      await tap(button('Partenza'));
      await flush('', [MAGAZZINO, CANTIERE]);
      await tap(cardOf('Magazzino'));
      await tap(button('Consegna'));
      expect(selected()).toEqual([]);
      await tap(cardOf('Cantiere'));
      await tap(button('Continua'));

      expect(host.answers).toEqual([{ pickup: MAGAZZINO, delivery: CANTIERE }]);
    });

    it('the last place used is not selected when the contract asks for no location', async () => {
      await open({ ...FLAT, lastPlace: { pickup: MAGAZZINO, delivery: CANTIERE } });

      expect(buttons().map((b) => text(b))).toEqual(['Partenza', 'Consegna', 'Salta']);
    });
  });

  it('no location is typed by hand: the only text fields are the searches', async () => {
    await open(PAIRS);
    await tap(cardOf('Magazzino A'));
    expect(
      element().querySelectorAll('input:not([type="radio"]):not([type="search"]), textarea'),
    ).toHaveLength(0);

    await open(PICKUPS);
    await tap(cardOf('Magazzino'));
    await tap(button('Aggiungi la consegna'));
    await flush('', [CANTIERE]);
    expect(
      element().querySelectorAll('input:not([type="radio"]):not([type="search"]), textarea'),
    ).toHaveLength(0);
    expect(element().querySelectorAll('input[type="search"]')).toHaveLength(1);
  });
});
