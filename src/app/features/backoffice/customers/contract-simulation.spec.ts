import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import type { Minimum, Rate } from './contract-rate';
import { CustomersFacade } from './customers-facade';
import { ContractSimulation } from './contract-simulation';
import type { VehicleRateAnswer } from './contract-vehicle-rates';
import type { PriceSimulation, PricingMode } from './contracts-api';

const URL = '/api/registry/contracts/simulation';

const AUTOSPURGO: VehicleRateAnswer = {
  vehicleId: 'v-1',
  licensePlate: 'AB123CD',
  description: 'Autospurgo Scania P410',
  decommissioned: false,
  rate: { day: 55, night: 70, callFee: 40 },
  minimum: { kind: 'FixedMinimum', amount: 120, threshold: null, overage: null },
};

const FIXED_30: Minimum = { kind: 'FixedMinimum', amount: 30, threshold: null, overage: null };
const NO_MINIMUM: Minimum = { kind: 'None', amount: null, threshold: null, overage: null };

const result = (change: Partial<PriceSimulation> = {}): PriceSimulation => ({
  amountAfterMinimum: 70,
  band: 'Day',
  baseAmount: 70,
  minimumAmount: 30,
  minimumApplied: false,
  minimumOveragePrice: null,
  minimumRule: 'FixedMinimum',
  minimumThreshold: null,
  nightBand: { start: '22:00', end: '06:00' },
  nightCallFee: null,
  nightSurcharge: true,
  quantity: 140,
  rateSource: 'Contract',
  total: 70,
  unitPrice: 30,
  vehicleId: null,
  ...change,
});

@Component({
  imports: [ContractSimulation],
  template: `
    <app-contract-simulation
      [mode]="mode()"
      [night]="night()"
      [rate]="rate()"
      [minimum]="minimum()"
      [vehicleRates]="vehicleRates()"
      [blocked]="blocked()"
    />
  `,
})
class Host {
  readonly mode = signal<PricingMode>('ByHour');
  readonly night = signal(true);
  readonly rate = signal<Rate>({ day: 30, night: 42, callFee: 35 });
  readonly minimum = signal<Minimum | null>(FIXED_30);
  readonly vehicleRates = signal<VehicleRateAnswer[]>([AUTOSPURGO]);
  readonly blocked = signal(false);
}

describe('ContractSimulation', () => {
  const render = () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        CustomersFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(TranslateService).use('it');
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    TestBed.tick();
    // The facade reads the customer list when it is created: answered at once, not part of the card.
    http
      .match((request) => request.url === '/api/registry/customers')
      .forEach((request) =>
        request.flush({
          data: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        }),
      );
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;

    const settle = async () => {
      await new Promise<void>((resolve) => setTimeout(resolve));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const text = (node: Element | null | undefined) =>
      node?.textContent?.replace(/\s+/g, ' ').trim();
    const field = (id: string) => element.querySelector<HTMLInputElement>(`#sim-${id}`);
    const type = (id: string, value: string) => {
      const input = field(id)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const pick = (vehicleId: string) => {
      const select = field('vehicle') as unknown as HTMLSelectElement;
      select.value = vehicleId;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const calculate = () =>
      Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.includes('Calcola'),
      );
    const press = async () => {
      calculate()!.click();
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const answer = async (body: PriceSimulation | null, status = 200) => {
      const call = http.expectOne(URL);
      if (body === null) {
        call.flush({ errorCode: 'x' }, { status, statusText: 'x' });
      } else {
        call.flush(body);
      }
      await settle();
      return call.request.body as Record<string, unknown>;
    };
    const rows = () =>
      Array.from(element.querySelectorAll('.pt-calc__row')).map((row) =>
        Array.from(row.children)
          .map((cell) => text(cell))
          .join(' '),
      );
    const errors = () => Array.from(element.querySelectorAll('.pt-field__error')).map(text);
    const labels = () => Array.from(element.querySelectorAll('label.pt-label')).map(text);
    return {
      http,
      fixture,
      element,
      host,
      settle,
      text,
      field,
      type,
      pick,
      calculate,
      press,
      answer,
      rows,
      errors,
      labels,
    };
  };

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('asks for the start and end time by hour, with the end hint, and sends nothing until "Calcola"', () => {
    const { labels, element, text, field } = render();

    expect(labels()).toEqual(['Mezzo', 'Ora di inizio', 'Ora di fine']);
    expect(text(element.querySelector('.pt-field__hint'))).toBe(
      "Se è prima dell'inizio, il viaggio finisce il giorno dopo.",
    );
    expect(field('start')!.type).toBe('time');
    expect(element.querySelector('.pt-calc')).toBeNull();
  });

  it('asks for the weight and the start time by weight', () => {
    const { host, fixture, labels } = render();

    host.mode.set('ByWeight');
    fixture.detectChanges();

    expect(labels()).toEqual(['Mezzo', 'Peso (kg)', 'Ora di inizio']);
  });

  it('asks for the kilometres and the start time by distance', () => {
    const { host, fixture, labels } = render();

    host.mode.set('ByDistance');
    fixture.detectChanges();

    expect(labels()).toEqual(['Mezzo', 'Chilometri (km)', 'Ora di inizio']);
  });

  it('asks for the start time only by trip', () => {
    const { host, fixture, labels } = render();

    host.mode.set('ByTrip');
    fixture.detectChanges();

    expect(labels()).toEqual(['Mezzo', 'Ora di inizio']);
  });

  it('offers "Un mezzo senza tariffa propria" and "<plate> · <description>" for each vehicle rate', () => {
    const { element, text } = render();

    const options = Array.from(element.querySelectorAll('option')).map(text);

    expect(options).toEqual(['Un mezzo senza tariffa propria', 'AB123CD · Autospurgo Scania P410']);
  });

  it('sends the contract as written and shows the day result: band, rate, formula, minimum, total', async () => {
    const { type, press, answer, rows, element, text } = render();
    type('start', '09:00');
    type('end', '11:20');

    await press();
    const body = await answer(result());

    expect(body).toEqual({
      pricingMode: 'ByHour',
      nightSurcharge: true,
      dayPrice: 30,
      nightPrice: 42,
      nightCallFee: 35,
      minimumRule: 'FixedMinimum',
      minimumAmount: 30,
      minimumThreshold: null,
      minimumOveragePrice: null,
      vehicleRates: [
        {
          vehicleId: 'v-1',
          dayPrice: 55,
          nightPrice: 70,
          nightCallFee: 40,
          minimumRule: 'FixedMinimum',
          minimumAmount: 120,
          minimumThreshold: null,
          minimumOveragePrice: null,
        },
      ],
      vehicleId: null,
      startTime: '09:00',
      endTime: '11:20',
      kilograms: null,
      kilometres: null,
    });
    expect(rows()).toEqual([
      'Fascia Di giorno · inizia alle 09:00, fuori dalla fascia notturna 22:00–06:00',
      'Tariffa Del cliente',
      'Importo 2 h 20 min × 30,00 €/h = 70,00 €',
      'Minimo Minimo 30,00 €: non serve',
      'Totale 70,00 €',
    ]);
    expect(text(element.querySelector('.pt-amount'))).toBe('70,00 €');
  });

  it('sets the amount, call fee and minimum values in the monospaced font, the band and rate as the mockup has them', async () => {
    const { type, pick, press, answer, element } = render();
    pick('v-1');
    type('start', '23:00');
    type('end', '02:00');

    await press();
    await answer(
      result({
        band: 'Night',
        rateSource: 'Vehicle',
        vehicleId: 'v-1',
        nightCallFee: 40,
        total: 250,
      }),
    );

    const mono = Array.from(element.querySelectorAll('.pt-calc__row')).map((row) =>
      row.children[1].classList.contains('pt-mono'),
    );
    expect(mono).toEqual([false, false, true, true, true, false]);
    expect(element.querySelector('.pt-calc__row:nth-child(2) .pt-mono')?.textContent).toBe(
      'AB123CD',
    );
  });

  it('shows the night trip with the vehicle rate, its plate and the night call fee', async () => {
    const { type, pick, press, answer, rows } = render();
    pick('v-1');
    type('start', '23:00');
    type('end', '02:00');

    await press();
    const body = await answer(
      result({
        band: 'Night',
        rateSource: 'Vehicle',
        vehicleId: 'v-1',
        quantity: 180,
        unitPrice: 70,
        baseAmount: 210,
        amountAfterMinimum: 210,
        nightCallFee: 40,
        total: 250,
        minimumAmount: 120,
      }),
    );

    expect(body['vehicleId']).toBe('v-1');
    expect(rows()).toEqual([
      'Fascia Di notte · inizia alle 23:00, nella fascia notturna 22:00–06:00',
      'Tariffa Propria del mezzo AB123CD',
      'Importo 3 h × 70,00 €/h = 210,00 €',
      'Minimo Minimo 120,00 €: non serve',
      'Chiamata notturna + 40,00 € = 250,00 €',
      'Totale 250,00 €',
    ]);
  });

  it('tells when the minimum changed the amount', async () => {
    const { type, press, answer, rows } = render();
    type('start', '09:00');
    type('end', '09:30');

    await press();
    await answer(
      result({
        quantity: 30,
        baseAmount: 15,
        amountAfterMinimum: 30,
        total: 30,
        minimumApplied: true,
      }),
    );

    expect(rows()).toContain("Minimo Minimo 30,00 €: l'importo diventa 30,00 €");
  });

  it('shows the minimum before the night call fee, in the order of the calculation', async () => {
    const { type, press, answer, rows } = render();
    type('start', '22:00');
    type('end', '22:30');

    await press();
    await answer(
      result({
        band: 'Night',
        quantity: 30,
        unitPrice: 42,
        baseAmount: 21,
        amountAfterMinimum: 30,
        minimumApplied: true,
        nightCallFee: 35,
        total: 65,
      }),
    );

    expect(rows().slice(2)).toEqual([
      'Importo 30 min × 42,00 €/h = 21,00 €',
      "Minimo Minimo 30,00 €: l'importo diventa 30,00 €",
      'Chiamata notturna + 35,00 € = 65,00 €',
      'Totale 65,00 €',
    ]);
  });

  it('says a night trip on a contract without the night surcharge is priced at the day price', async () => {
    const { host, fixture, type, press, answer, rows } = render();
    host.night.set(false);
    host.rate.set({ day: 30, night: null, callFee: null });
    host.minimum.set(NO_MINIMUM);
    host.vehicleRates.set([]);
    fixture.detectChanges();
    type('start', '23:00');
    type('end', '02:00');

    await press();
    const body = await answer(
      result({
        band: 'Night',
        nightSurcharge: false,
        quantity: 180,
        baseAmount: 90,
        amountAfterMinimum: 90,
        total: 90,
        minimumRule: 'None',
        minimumAmount: null,
      }),
    );

    expect(body['nightSurcharge']).toBe(false);
    expect(rows()).toEqual([
      'Fascia Di notte · il contratto non ha la maggiorazione notturna: vale il prezzo di giorno',
      'Tariffa Del cliente',
      'Importo 3 h × 30,00 €/h = 90,00 €',
      'Minimo Nessun minimo',
      'Totale 90,00 €',
    ]);
  });

  it('by weight sends whole kilograms and shows them as tons in the formula', async () => {
    const { host, fixture, type, press, answer, rows } = render();
    host.mode.set('ByWeight');
    host.rate.set({ day: 7.5, night: 9, callFee: 35 });
    host.minimum.set(NO_MINIMUM);
    host.vehicleRates.set([]);
    fixture.detectChanges();
    type('kilograms', '12300');
    type('start', '09:00');

    await press();
    const body = await answer(
      result({
        quantity: 12300,
        unitPrice: 7.5,
        baseAmount: 92.25,
        amountAfterMinimum: 92.25,
        total: 92.25,
        minimumRule: 'None',
      }),
    );

    expect(body['kilograms']).toBe(12300);
    expect(body['endTime']).toBeNull();
    expect(body['kilometres']).toBeNull();
    expect(rows()).toContain('Importo 12,3 ton × 7,50 €/ton = 92,25 €');
  });

  it.each([
    [12000, '12 ton', '90,00 €'],
    [12345, '12,345 ton', '92,59 €'],
  ])('by weight shows %i kg in the formula as %s', async (kilograms, tons, amount) => {
    const { host, fixture, type, press, answer, rows } = render();
    host.mode.set('ByWeight');
    host.rate.set({ day: 7.5, night: 9, callFee: 35 });
    host.minimum.set(NO_MINIMUM);
    host.vehicleRates.set([]);
    fixture.detectChanges();
    type('kilograms', String(kilograms));
    type('start', '09:00');

    await press();
    await answer(
      result({
        quantity: kilograms,
        unitPrice: 7.5,
        baseAmount: Number(amount.replace(',', '.').replace(' €', '')),
        amountAfterMinimum: Number(amount.replace(',', '.').replace(' €', '')),
        total: Number(amount.replace(',', '.').replace(' €', '')),
        minimumRule: 'None',
      }),
    );

    expect(rows()).toContain(`Importo ${tons} × 7,50 €/ton = ${amount}`);
  });

  it('by distance sends the kilometres and shows them in the formula', async () => {
    const { host, fixture, type, press, answer, rows } = render();
    host.mode.set('ByDistance');
    host.rate.set({ day: 1.5, night: 2, callFee: 5 });
    host.minimum.set(NO_MINIMUM);
    host.vehicleRates.set([]);
    fixture.detectChanges();
    type('kilometres', '120');
    type('start', '09:00');

    await press();
    const body = await answer(
      result({
        quantity: 120,
        unitPrice: 1.5,
        baseAmount: 180,
        amountAfterMinimum: 180,
        total: 180,
        minimumRule: 'None',
      }),
    );

    expect(body['kilometres']).toBe(120);
    expect(body['kilograms']).toBeNull();
    expect(rows()).toContain('Importo 120 km × 1,50 €/km = 180,00 €');
  });

  it('by trip sends the start time only and shows the trip price', async () => {
    const { host, fixture, type, press, answer, rows } = render();
    host.mode.set('ByTrip');
    host.rate.set({ day: 120, night: 150, callFee: 20 });
    host.minimum.set(null);
    host.vehicleRates.set([]);
    fixture.detectChanges();
    type('start', '09:00');

    await press();
    const body = await answer(
      result({
        quantity: null,
        unitPrice: 120,
        baseAmount: 120,
        amountAfterMinimum: 120,
        total: 120,
        minimumRule: 'None',
        minimumAmount: null,
      }),
    );

    expect(body['endTime']).toBeNull();
    expect(body['minimumRule']).toBeNull();
    expect(rows()).toContain('Importo 120,00 € a viaggio');
  });

  it('refuses an end equal to the start under the end field', async () => {
    const { type, press, errors, http } = render();
    type('start', '09:00');
    type('end', '09:00');

    await press();

    expect(errors()).toEqual(["La fine deve essere diversa dall'inizio."]);
    http.expectNone(URL);
  });

  it('editing the start time clears the end-equals-start error, as editing the end does', async () => {
    const { type, press, errors } = render();
    type('start', '09:00');
    type('end', '09:00');
    await press();
    expect(errors()).toEqual(["La fine deve essere diversa dall'inizio."]);

    type('start', '08:00');

    expect(errors()).toEqual([]);
  });

  it('editing the start time keeps a missing-end error, which does not depend on it', async () => {
    const { type, press, errors } = render();
    type('start', '09:00');
    await press();
    expect(errors()).toEqual(['Inserisci un orario.']);

    type('start', '08:00');

    expect(errors()).toEqual(['Inserisci un orario.']);
  });

  it('refuses missing times under their fields', async () => {
    const { press, errors, http } = render();

    await press();

    expect(errors()).toEqual(['Inserisci un orario.', 'Inserisci un orario.']);
    http.expectNone(URL);
  });

  it.each([
    ['ByWeight', 'kilograms', '0', 'Inserisci un numero intero maggiore di zero.'],
    ['ByWeight', 'kilograms', '1,5', 'Inserisci un numero intero maggiore di zero.'],
    ['ByWeight', 'kilograms', '', 'Inserisci un numero intero maggiore di zero.'],
    ['ByDistance', 'kilometres', '-3', 'Inserisci un numero intero maggiore di zero.'],
    ['ByDistance', 'kilometres', '2.5', 'Inserisci un numero intero maggiore di zero.'],
    ['ByWeight', 'kilograms', '100000', 'Al massimo 99.999 kg.'],
    ['ByDistance', 'kilometres', '10000', 'Al massimo 9.999 km.'],
  ] as const)(
    '%s refuses %s "%s" under the field with "%s"',
    async (mode, id, typed, message) => {
      const { host, fixture, type, press, errors, http } = render();
      host.mode.set(mode);
      fixture.detectChanges();
      type('start', '09:00');
      type(id, typed);

      await press();

      expect(errors()).toEqual([message]);
      http.expectNone(URL);
    },
  );

  it('accepts the bounds 99.999 kg and 9.999 km', async () => {
    const { host, fixture, type, press, answer, errors } = render();
    host.mode.set('ByWeight');
    fixture.detectChanges();
    type('start', '09:00');
    type('kilograms', '99999');

    await press();
    const body = await answer(result());

    expect(errors()).toEqual([]);
    expect(body['kilograms']).toBe(99999);

    host.mode.set('ByDistance');
    fixture.detectChanges();
    type('start', '09:00');
    type('kilometres', '9999');
    await press();
    const next = await answer(result());

    expect(next['kilometres']).toBe(9999);
  });

  it('shows the server message of a field under that field', async () => {
    const { type, press, http, settle, errors } = render();
    type('start', '09:00');
    type('end', '11:00');

    await press();
    http
      .expectOne(URL)
      .flush(
        { errors: { EndTime: ["La fine deve essere diversa dall'inizio."] } },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(errors()).toEqual(["La fine deve essere diversa dall'inizio."]);
  });

  it('shows in the card the messages of a 400 that names no field of the sample trip, each one once', async () => {
    const { type, press, http, settle, element, text, errors } = render();
    type('start', '09:00');
    type('end', '11:00');

    await press();
    const message = 'Il prezzo notturno non può essere più basso del prezzo diurno.';
    http
      .expectOne(URL)
      .flush(
        { errors: { NightPrice: [message], 'VehicleRates[0].NightPrice': [message] } },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(text(element.querySelector('app-notice'))).toBe(message);
    expect(errors()).toEqual([]);
    expect(element.querySelector('.pt-calc')).toBeNull();
  });

  it('shows the generic notice in the card when the refusal carries no message', async () => {
    const { type, press, http, settle, element, text } = render();
    type('start', '09:00');
    type('end', '11:00');

    await press();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(text(element.querySelector('app-notice'))).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
  });

  it('shows "Importo troppo alto." from a 422 in the card, and no total', async () => {
    const { type, press, http, settle, element, text } = render();
    type('start', '09:00');
    type('end', '11:00');

    await press();
    http
      .expectOne(URL)
      .flush(
        { errorCode: 'Registry.Pricing.AmountTooLarge', detail: 'Importo troppo alto.' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await settle();

    expect(text(element.querySelector('app-notice'))).toBe('Importo troppo alto.');
    expect(element.querySelector('.pt-calc')).toBeNull();
  });

  describe('stale result', () => {
    const computed = async () => {
      const view = render();
      view.type('start', '09:00');
      view.type('end', '11:20');
      await view.press();
      await view.answer(result());
      expect(view.element.querySelector('.pt-calc')).not.toBeNull();
      return view;
    };
    const asksAgain = (element: HTMLElement) => {
      expect(element.querySelector('.pt-calc')).toBeNull();
      expect(element.textContent).toContain(
        'Qualcosa è cambiato: premi «Calcola» per rifare il conto.',
      );
    };

    it('removes the result when an answer of the contract changes, and asks to press "Calcola"', async () => {
      const { host, fixture, element } = await computed();

      host.rate.set({ day: 31, night: 42, callFee: 35 });
      fixture.detectChanges();

      asksAgain(element);
    });

    it('removes the result when a vehicle rate changes', async () => {
      const { host, fixture, element } = await computed();

      host.vehicleRates.set([{ ...AUTOSPURGO, rate: { day: 56, night: 70, callFee: 40 } }]);
      fixture.detectChanges();

      asksAgain(element);
    });

    it('removes the result when a field of the sample trip changes', async () => {
      const { type, element } = await computed();

      type('end', '11:30');

      asksAgain(element);
    });

    it('removes the result when the vehicle changes', async () => {
      const { pick, element } = await computed();

      pick('v-1');

      asksAgain(element);
    });

    it('shows the result again when the inputs return to what it was computed from', async () => {
      const { type, element, rows } = await computed();

      type('end', '11:30');
      type('end', '11:20');

      expect(element.textContent).not.toContain('Qualcosa è cambiato');
      expect(rows().length).toBe(5);
    });

    it('never shows a result that arrives after the inputs changed', async () => {
      const { type, press, answer, element } = render();
      type('start', '09:00');
      type('end', '11:20');
      await press();

      type('end', '11:30');
      await answer(result());

      expect(element.querySelector('.pt-calc')).toBeNull();
    });
  });

  describe('blocked', () => {
    it('hides "Calcola" and shows the blocked line', () => {
      const { host, fixture, calculate, element } = render();

      host.blocked.set(true);
      fixture.detectChanges();

      expect(calculate()).toBeUndefined();
      expect(element.textContent).toContain('Conferma la domanda aperta per provare il contratto.');
    });

    it('shows "Calcola" and no blocked line when nothing is open', () => {
      const { calculate, element } = render();

      expect(calculate()).toBeDefined();
      expect(element.textContent).not.toContain('Conferma la domanda aperta');
    });
  });
});
