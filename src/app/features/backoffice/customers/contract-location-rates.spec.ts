import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import type { RateableLocation } from '../locations/locations-api';
import { LocationsFacade } from '../locations/locations-facade';
import {
  ContractLocationRates,
  locationRateAnswerOf,
  locationRateRequestOf,
  locationRatesKey,
  type LocationRateAnswer,
  type LocationRateLevel,
  type RatedLocation,
} from './contract-location-rates';
import type { ContractLocationRate, PricingMode } from './contracts-api';

const MAGAZZINO: RateableLocation = {
  id: 'l-1',
  name: 'Magazzino centrale',
  municipality: 'Pescara',
};
const DISCARICA: RateableLocation = {
  id: 'l-2',
  name: 'Discarica Cerratina',
  municipality: 'Lanciano',
};
const CANTIERE: RateableLocation = {
  id: 'l-3',
  name: 'Cantiere A14',
  municipality: 'Chieti Scalo',
};
const SP49: RatedLocation = {
  id: 'l-9',
  name: 'Cantiere SP49',
  municipality: 'Spoltore',
  deactivated: true,
};

const active = (location: RateableLocation): RatedLocation => ({ ...location, deactivated: false });

const rateOf = (
  pickup: RatedLocation | null,
  delivery: RatedLocation | null,
  overrides: Partial<LocationRateAnswer> = {},
): LocationRateAnswer => ({
  pickup,
  delivery,
  rate: { day: 30, night: 42, callFee: 35 },
  minimum: { kind: 'FixedMinimum', amount: 60, threshold: null, overage: null },
  ...overrides,
});

@Component({
  imports: [ContractLocationRates],
  template: `
    <app-contract-location-rates
      [level]="level()"
      [night]="night()"
      [mode]="mode()"
      [rateable]="rateable()"
      [failed]="failed()"
      [answer]="answer()"
      [cancellable]="cancellable()"
      (confirmed)="confirmed.push($event)"
      (cancelled)="cancelled = cancelled + 1"
      (retry)="retried = retried + 1"
    />
  `,
})
class Host {
  readonly level = signal<LocationRateLevel>('PerDeliveryLocation');
  readonly night = signal(true);
  readonly mode = signal<PricingMode>('ByHour');
  readonly rateable = signal<RateableLocation[] | null>([MAGAZZINO, DISCARICA, CANTIERE]);
  readonly failed = signal(false);
  readonly answer = signal<LocationRateAnswer[] | null>(null);
  readonly cancellable = signal(false);
  readonly confirmed: LocationRateAnswer[][] = [];
  cancelled = 0;
  retried = 0;
}

describe('ContractLocationRates', () => {
  let http: HttpTestingController;

  const render = (setup: (host: Host) => void = () => undefined) => {
    stubModalDialog();
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        LocationsFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    setup(fixture.componentInstance);
    fixture.detectChanges();
    TestBed.tick();
    const element = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;

    const text = (node: Element | null | undefined) =>
      node?.textContent?.replace(/\s+/g, ' ').trim();
    const button = (label: string) =>
      Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => text(b) === label,
      )!;
    const rowTitles = () =>
      Array.from(element.querySelectorAll('app-contract-rate-rows li strong')).map((s) => text(s));
    const rowTerms = () =>
      Array.from(element.querySelectorAll('app-contract-rate-rows li .pt-muted')).map((s) =>
        text(s),
      );
    const dialogOpen = () => element.querySelector('app-contract-rate-dialog') !== null;
    const rateForm = () => element.querySelector<HTMLFormElement>('form[id^="rate-dialog-"]')!;
    const selects = () => Array.from(rateForm().querySelectorAll('select'));
    const optionLabels = (select: number) =>
      Array.from(selects()[select].querySelectorAll('option'))
        .slice(1)
        .map((option) => text(option));
    const field = (name: string) =>
      element.querySelector<HTMLInputElement>(`form[id^="rate-dialog-"] input[id$="-${name}"]`)!;
    const type = (name: string, value: string) => {
      const input = field(name);
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const choose = (index: number, id: string) => {
      const select = selects()[index];
      select.value = id;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const submit = async () => {
      rateForm().dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(fixture);
    };
    const open = async (label: string, index = 0) => {
      Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
        .filter((b) => text(b) === label)
        [index].click();
      await settle(fixture);
    };
    const notice = () => text(element.querySelector('.pt-field__error[role="alert"]'));
    return {
      fixture,
      element,
      host,
      text,
      button,
      rowTitles,
      rowTerms,
      dialogOpen,
      rateForm,
      selects,
      optionLabels,
      field,
      type,
      choose,
      submit,
      open,
      notice,
    };
  };

  afterEach(() => document.body.replaceChildren());

  it('each rate is one row with its location, its terms, "Modifica" and "Togli", then "Aggiungi tariffa" and "Conferma"', () => {
    const r = render((host) =>
      host.answer.set([
        rateOf(null, active(CANTIERE)),
        rateOf(null, active(DISCARICA), {
          rate: { day: 38, night: 50, callFee: 35 },
          minimum: { kind: 'None', amount: null, threshold: null, overage: null },
        }),
      ]),
    );

    expect(r.rowTitles()).toEqual(['Cantiere A14, Chieti Scalo', 'Discarica Cerratina, Lanciano']);
    expect(r.rowTerms()).toEqual([
      '30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 € · minimo 60,00 €',
      '38,00 €/h di giorno · 50,00 €/h di notte · chiamata 35,00 € · nessun minimo',
    ]);
    expect(r.element.querySelectorAll('button[data-edit]').length).toBe(2);
    expect(r.element.querySelectorAll('button[data-remove]').length).toBe(2);
    expect(r.button('Aggiungi tariffa')).toBeTruthy();
    expect(r.button('Conferma')).toBeTruthy();
    expect(r.element.querySelector('.pt-empty')).toBeNull();
  });

  it('a pair rate is told "<pickup> → <delivery>"', () => {
    const r = render((host) => {
      host.level.set('PerLocationPair');
      host.answer.set([rateOf(active(MAGAZZINO), active(CANTIERE))]);
    });

    expect(r.rowTitles()).toEqual(['Magazzino centrale, Pescara → Cantiere A14, Chieti Scalo']);
  });

  it('a rate under a trip price tells its price alone', () => {
    const r = render((host) => {
      host.mode.set('ByTrip');
      host.night.set(false);
      host.answer.set([
        rateOf(null, active(CANTIERE), {
          rate: { day: 90, night: null, callFee: null },
          minimum: null,
        }),
      ]);
    });

    expect(r.rowTerms()).toEqual(['90,00 €']);
  });

  it('the question offers "Annulla modifica" only when reopened, and it cancels', () => {
    const r = render();
    expect(r.element.textContent).not.toContain('Annulla modifica');

    r.host.cancellable.set(true);
    r.fixture.detectChanges();
    r.button('Annulla modifica').click();

    expect(r.host.cancelled).toBe(1);
  });

  it('the rows are sorted by location name, then municipality, with Italian collation', () => {
    const r = render((host) =>
      host.answer.set([
        rateOf(null, active(MAGAZZINO)),
        rateOf(null, {
          id: 'x-1',
          name: 'Cantiere A14',
          municipality: 'Vasto',
          deactivated: false,
        }),
        rateOf(null, active(CANTIERE)),
        rateOf(null, { id: 'x-2', name: 'Àncora', municipality: 'Roma', deactivated: false }),
      ]),
    );

    expect(r.rowTitles()).toEqual([
      'Àncora, Roma',
      'Cantiere A14, Chieti Scalo',
      'Cantiere A14, Vasto',
      'Magazzino centrale, Pescara',
    ]);
  });

  it('the pairs are sorted by pickup, then by delivery', () => {
    const r = render((host) => {
      host.level.set('PerLocationPair');
      host.answer.set([
        rateOf(active(MAGAZZINO), active(CANTIERE)),
        rateOf(active(CANTIERE), active(MAGAZZINO)),
        rateOf(active(CANTIERE), active(DISCARICA)),
      ]);
    });

    expect(r.rowTitles()).toEqual([
      'Cantiere A14, Chieti Scalo → Discarica Cerratina, Lanciano',
      'Cantiere A14, Chieti Scalo → Magazzino centrale, Pescara',
      'Magazzino centrale, Pescara → Cantiere A14, Chieti Scalo',
    ]);
  });

  it('the row of a deactivated location shows the pill "Disattivato"', () => {
    const r = render((host) =>
      host.answer.set([rateOf(null, active(CANTIERE)), rateOf(null, SP49)]),
    );

    const pills = Array.from(r.element.querySelectorAll('li .pt-pill'));
    expect(pills.map((pill) => r.text(pill))).toEqual(['Disattivato']);
    expect(r.text(pills[0].closest('strong'))).toBe('Cantiere SP49, Spoltore Disattivato');
  });

  it('on a pair the pill is shown per side', () => {
    const r = render((host) => {
      host.level.set('PerLocationPair');
      host.answer.set([rateOf(active(MAGAZZINO), SP49), rateOf(SP49, SP49)]);
    });

    expect(r.rowTitles()).toEqual([
      'Cantiere SP49, Spoltore Disattivato → Cantiere SP49, Spoltore Disattivato',
      'Magazzino centrale, Pescara → Cantiere SP49, Spoltore Disattivato',
    ]);
  });

  it.each([
    ['PerPickupLocation', 'Aggiungi la tariffa di ogni luogo di partenza del cliente.'],
    ['PerDeliveryLocation', 'Aggiungi la tariffa di ogni luogo di consegna del cliente.'],
    ['PerLocationPair', 'Aggiungi la tariffa di ogni coppia di luoghi del cliente.'],
  ] as const)(
    'with no rate "Nessuna tariffa" replaces the rows, with the hint of %s',
    (level, hint) => {
      const r = render((host) => host.level.set(level));

      expect(r.element.querySelector('app-contract-rate-rows')).toBeNull();
      expect(r.text(r.element.querySelector('.pt-empty .pt-title'))).toBe('Nessuna tariffa');
      expect(r.text(r.element.querySelector('.pt-empty .pt-muted'))).toBe(hint);
    },
  );

  it('"Conferma" without a rate shows "Aggiungi almeno una tariffa." and confirms nothing', async () => {
    const r = render();

    r.button('Conferma').click();
    await settle(r.fixture);

    expect(r.notice()).toBe('Aggiungi almeno una tariffa.');
    expect(r.host.confirmed).toEqual([]);
    expect(document.activeElement).toBe(r.button('Aggiungi tariffa'));
  });

  it('the message goes away with the first rate added', async () => {
    const r = render();
    r.button('Conferma').click();
    await settle(r.fixture);
    expect(r.notice()).toBe('Aggiungi almeno una tariffa.');

    await r.open('Aggiungi tariffa');
    r.choose(0, 'l-3');
    r.type('day', '30');
    r.type('night', '42');
    r.type('callFee', '35');
    await r.submit();

    expect(r.notice()).toBeUndefined();
    expect(r.rowTitles()).toEqual(['Cantiere A14, Chieti Scalo']);
  });

  it.each([
    ['PerPickupLocation', 'Per luogo di partenza · a ore · con maggiorazione notturna', 1],
    ['PerDeliveryLocation', 'Per luogo di consegna · a ore · con maggiorazione notturna', 1],
    ['PerLocationPair', 'Per coppia di luoghi · a ore · con maggiorazione notturna', 2],
  ] as const)(
    '"Aggiungi tariffa" opens "Nuova tariffa" with the line and the selects of %s',
    async (level, line, selects) => {
      const r = render((host) => host.level.set(level));

      await r.open('Aggiungi tariffa');

      expect(r.text(r.element.querySelector('app-dialog .pt-title'))).toBe('Nuova tariffa');
      expect(r.text(r.element.querySelector('app-dialog .pt-dialog__head .pt-muted'))).toBe(line);
      expect(r.selects().length).toBe(selects);
      expect(r.text(r.selects()[0].querySelector('option'))).toBe('Scegli un luogo');
      expect(r.button('Aggiungi')).toBeTruthy();
      expect(r.button('Annulla')).toBeTruthy();
    },
  );

  it('the line tells the pricing mode and the missing night surcharge', async () => {
    const r = render((host) => {
      host.mode.set('ByWeight');
      host.night.set(false);
    });

    await r.open('Aggiungi tariffa');

    expect(r.text(r.element.querySelector('app-dialog .pt-dialog__head .pt-muted'))).toBe(
      'Per luogo di consegna · a peso · senza maggiorazione notturna',
    );
  });

  it('a pair dialog labels its selects "Luogo di partenza" and "Luogo di consegna"', async () => {
    const r = render((host) => host.level.set('PerLocationPair'));

    await r.open('Aggiungi tariffa');

    expect(
      Array.from(r.rateForm().querySelectorAll('label.pt-label'))
        .slice(0, 2)
        .map((label) => r.text(label)),
    ).toEqual(['Luogo di partenza', 'Luogo di consegna']);
  });

  it('"Modifica" opens "Modifica tariffa" prefilled and "Salva" replaces the row', async () => {
    const r = render((host) => host.answer.set([rateOf(null, active(CANTIERE))]));

    await r.open('Modifica');

    expect(r.text(r.element.querySelector('app-dialog .pt-title'))).toBe('Modifica tariffa');
    expect(r.selects()[0].value).toBe('l-3');
    expect([r.field('day').value, r.field('night').value, r.field('callFee').value]).toEqual([
      '30',
      '42',
      '35',
    ]);
    expect(r.field('amount').value).toBe('60');

    r.choose(0, 'l-2');
    r.type('day', '38,5');
    await r.submit();

    expect(r.dialogOpen()).toBe(false);
    expect(r.rowTitles()).toEqual(['Discarica Cerratina, Lanciano']);
    expect(r.rowTerms()[0]).toContain('38,50 €/h di giorno');
  });

  it('"Annulla" closes the dialog and leaves the rows as they were', async () => {
    const r = render((host) => host.answer.set([rateOf(null, active(CANTIERE))]));
    await r.open('Modifica');
    r.type('day', '99');

    r.button('Annulla').click();
    await settle(r.fixture);

    expect(r.dialogOpen()).toBe(false);
    expect(r.rowTerms()[0]).toContain('30,00 €/h di giorno');
  });

  it('on "Aggiungi" a single level offers the active locations without a rate', async () => {
    const r = render((host) => host.answer.set([rateOf(null, active(DISCARICA))]));

    await r.open('Aggiungi tariffa');

    expect(r.optionLabels(0)).toEqual([
      'Magazzino centrale, Pescara',
      'Cantiere A14, Chieti Scalo',
    ]);
  });

  it('the pickup level looks at the pickup rates', async () => {
    const r = render((host) => {
      host.level.set('PerPickupLocation');
      host.answer.set([rateOf(active(MAGAZZINO), null)]);
    });

    await r.open('Aggiungi tariffa');

    expect(r.optionLabels(0)).toEqual([
      'Discarica Cerratina, Lanciano',
      'Cantiere A14, Chieti Scalo',
    ]);
  });

  it('on "Modifica" the select also holds the row\'s own location, even deactivated, and not the others\' with a rate', async () => {
    const r = render((host) =>
      host.answer.set([rateOf(null, SP49), rateOf(null, active(DISCARICA))]),
    );

    await r.open('Modifica');

    expect(r.selects()[0].value).toBe('l-9');
    expect(r.optionLabels(0)).toEqual([
      'Cantiere SP49, Spoltore',
      'Magazzino centrale, Pescara',
      'Cantiere A14, Chieti Scalo',
    ]);
  });

  it('on "Modifica" an active location keeps its place among the options', async () => {
    const r = render((host) => host.answer.set([rateOf(null, active(DISCARICA))]));

    await r.open('Modifica');

    expect(r.optionLabels(0)).toEqual([
      'Magazzino centrale, Pescara',
      'Discarica Cerratina, Lanciano',
      'Cantiere A14, Chieti Scalo',
    ]);
  });

  it('a pair offers every active location on each side, also those with a rate', async () => {
    const r = render((host) => {
      host.level.set('PerLocationPair');
      host.answer.set([rateOf(active(MAGAZZINO), active(CANTIERE))]);
    });

    await r.open('Aggiungi tariffa');

    const all = [
      'Magazzino centrale, Pescara',
      'Discarica Cerratina, Lanciano',
      'Cantiere A14, Chieti Scalo',
    ];
    expect(r.optionLabels(0)).toEqual(all);
    expect(r.optionLabels(1)).toEqual(all);
  });

  it('a pair already present is refused under the select, in either role, and the ordered pair is another one', async () => {
    const r = render((host) => {
      host.level.set('PerLocationPair');
      host.answer.set([rateOf(active(MAGAZZINO), active(CANTIERE))]);
    });
    await r.open('Aggiungi tariffa');
    r.choose(0, 'l-1');
    r.choose(1, 'l-3');
    r.type('day', '30');
    r.type('night', '42');
    r.type('callFee', '35');

    await r.submit();

    expect(
      Array.from(r.rateForm().querySelectorAll('.pt-field__error')).map((e) => r.text(e)),
    ).toEqual(['Questa coppia ha già una tariffa.']);
    expect(r.rowTitles().length).toBe(1);

    r.choose(0, 'l-3');
    r.choose(1, 'l-1');
    await r.submit();

    expect(r.rowTitles()).toEqual([
      'Cantiere A14, Chieti Scalo → Magazzino centrale, Pescara',
      'Magazzino centrale, Pescara → Cantiere A14, Chieti Scalo',
    ]);
  });

  it('a pair being edited is not refused as its own duplicate, and the same location may be both sides', async () => {
    const r = render((host) => {
      host.level.set('PerLocationPair');
      host.answer.set([rateOf(active(MAGAZZINO), active(CANTIERE))]);
    });
    await r.open('Modifica');
    r.choose(1, 'l-1');

    await r.submit();

    expect(r.rowTitles()).toEqual(['Magazzino centrale, Pescara → Magazzino centrale, Pescara']);
  });

  it.each([
    ['PerDeliveryLocation', 1],
    ['PerLocationPair', 2],
  ] as const)(
    '"Nuovo luogo" is offered beside each location select of %s',
    async (level, count) => {
      const r = render((host) => host.level.set(level));

      await r.open('Aggiungi tariffa');

      const buttons = Array.from(r.rateForm().querySelectorAll('button')).filter(
        (b) => r.text(b) === 'Nuovo luogo',
      );
      expect(buttons.length).toBe(count);
    },
  );

  it('a location created from the dialog stays among the options and is told by its name on the row', async () => {
    const r = render();
    await r.open('Aggiungi tariffa');
    r.button('Nuovo luogo').click();
    await settle(r.fixture);
    const name = r.element.querySelector<HTMLInputElement>('#location-name')!;
    name.value = 'Piattaforma ecologica';
    name.dispatchEvent(new Event('input'));
    const municipality = r.element.querySelector<HTMLInputElement>('#location-municipality')!;
    municipality.value = 'San Giovanni Teatino';
    municipality.dispatchEvent(new Event('input'));
    r.element
      .querySelector<HTMLFormElement>('#location-form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(r.fixture);
    http
      .expectOne((req) => req.method === 'POST')
      .flush({
        id: 'l-7',
        name: 'Piattaforma ecologica',
        municipality: 'San Giovanni Teatino',
      });
    await settle(r.fixture);

    expect(r.selects()[0].value).toBe('l-7');
    r.type('day', '34');
    r.type('night', '46');
    r.type('callFee', '35');
    await r.submit();

    expect(r.rowTitles()).toEqual(['Piattaforma ecologica, San Giovanni Teatino']);
    await r.open('Aggiungi tariffa');
    expect(r.optionLabels(0)).not.toContain('Piattaforma ecologica, San Giovanni Teatino');
    await r.open('Annulla');
  });

  it('"Togli" removes the row at once, without a question, and nothing is confirmed', () => {
    const r = render((host) =>
      host.answer.set([rateOf(null, active(CANTIERE)), rateOf(null, active(DISCARICA))]),
    );

    r.element.querySelector<HTMLButtonElement>('button[data-remove]')!.click();
    r.fixture.detectChanges();

    expect(r.rowTitles()).toEqual(['Discarica Cerratina, Lanciano']);
    expect(r.element.querySelector('dialog[open]')).toBeNull();
    expect(r.host.confirmed).toEqual([]);
  });

  it('removing the last row shows the empty state and moves the focus to "Aggiungi tariffa"', async () => {
    const r = render((host) => host.answer.set([rateOf(null, active(CANTIERE))]));

    r.element.querySelector<HTMLButtonElement>('button[data-remove]')!.click();
    await settle(r.fixture);

    expect(r.text(r.element.querySelector('.pt-empty .pt-title'))).toBe('Nessuna tariffa');
    expect(document.activeElement).toBe(r.button('Aggiungi tariffa'));
  });

  it('a removed location is offered again', async () => {
    const r = render((host) => host.answer.set([rateOf(null, active(CANTIERE))]));

    r.element.querySelector<HTMLButtonElement>('button[data-remove]')!.click();
    r.fixture.detectChanges();
    await r.open('Aggiungi tariffa');

    expect(r.optionLabels(0)).toContain('Cantiere A14, Chieti Scalo');
  });

  it('"Conferma" emits the rates sorted, as written', async () => {
    const r = render((host) =>
      host.answer.set([rateOf(null, active(MAGAZZINO)), rateOf(null, active(CANTIERE))]),
    );

    r.button('Conferma').click();
    await settle(r.fixture);

    expect(r.host.confirmed).toEqual([
      [rateOf(null, active(CANTIERE)), rateOf(null, active(MAGAZZINO))],
    ]);
  });

  it('without the night surcharge the confirmed rates hold no night values', async () => {
    const r = render((host) => host.answer.set([rateOf(null, active(CANTIERE))]));
    r.host.night.set(false);
    r.fixture.detectChanges();

    r.button('Conferma').click();
    await settle(r.fixture);

    expect(r.host.confirmed[0][0].rate).toEqual({ day: 30, night: null, callFee: null });
  });

  it('adding the night surcharge keeps the rates and "Conferma" names the first row with no night price', async () => {
    const r = render((host) => {
      host.night.set(false);
      host.answer.set([
        rateOf(null, active(MAGAZZINO), { rate: { day: 40, night: null, callFee: null } }),
        rateOf(null, active(CANTIERE), { rate: { day: 30, night: null, callFee: null } }),
      ]);
    });
    r.host.night.set(true);
    r.fixture.detectChanges();

    expect(r.rowTitles().length).toBe(2);
    r.button('Conferma').click();
    await settle(r.fixture);

    expect(r.notice()).toBe('Completa i prezzi notturni: Cantiere A14, Chieti Scalo.');
    expect(r.host.confirmed).toEqual([]);
    expect(document.activeElement).toBe(
      r.element.querySelectorAll<HTMLButtonElement>('button[data-edit]')[0],
    );
  });

  it('"Modifica" on a row with no night price opens the dialog with the day price kept and empty night fields', async () => {
    const r = render((host) => {
      host.night.set(false);
      host.answer.set([
        rateOf(null, active(CANTIERE), { rate: { day: 30, night: null, callFee: null } }),
      ]);
    });
    r.host.night.set(true);
    r.fixture.detectChanges();

    await r.open('Modifica');

    expect([r.field('day').value, r.field('night').value, r.field('callFee').value]).toEqual([
      '30',
      '',
      '',
    ]);
    r.type('night', '42');
    r.type('callFee', '35');
    await r.submit();

    r.button('Conferma').click();
    await settle(r.fixture);
    expect(r.host.confirmed[0][0].rate).toEqual({ day: 30, night: 42, callFee: 35 });
  });

  it.each([
    ['level', (host: Host) => host.level.set('PerLocationPair')],
    ['pricing mode', (host: Host) => host.mode.set('ByTrip')],
  ] as const)('the draft starts again when the %s changes', (_, change) => {
    const r = render((host) => host.answer.set([rateOf(null, active(CANTIERE))]));
    expect(r.rowTitles().length).toBe(1);

    change(r.host);
    r.fixture.detectChanges();

    expect(r.rowTitles()).toEqual([]);
    expect(r.element.querySelector('.pt-empty')).not.toBeNull();
  });

  it('while the locations are being read the select is disabled, and a failed read says so under it', async () => {
    const r = render((host) => host.rateable.set(null));
    await r.open('Aggiungi tariffa');
    expect(r.selects()[0].disabled).toBe(true);

    r.host.failed.set(true);
    r.fixture.detectChanges();

    expect(r.selects()[0].disabled).toBe(false);
    expect(r.text(r.rateForm().querySelector('.pt-field__error'))).toBe(
      'Non è stato possibile leggere i luoghi. Chiudi e riapri la finestra per riprovare.',
    );
  });

  it('opening the dialog asks to read the locations again only after a failed read', async () => {
    const r = render();
    await r.open('Aggiungi tariffa');
    expect(r.host.retried).toBe(0);
    await r.open('Annulla');

    r.host.failed.set(true);
    r.fixture.detectChanges();
    await r.open('Aggiungi tariffa');

    expect(r.host.retried).toBe(1);
  });

  it('saving a row moved to another location gives the focus to the "Modifica" of its new row', async () => {
    const r = render((host) =>
      host.answer.set([rateOf(null, active(CANTIERE)), rateOf(null, active(DISCARICA))]),
    );
    await r.open('Modifica');
    r.choose(0, MAGAZZINO.id);
    await r.submit();

    expect(r.rowTitles()).toEqual(['Discarica Cerratina, Lanciano', 'Magazzino centrale, Pescara']);
    expect(document.activeElement).toBe(r.element.querySelectorAll('[data-edit]')[1]);
  });

  it('an answer re-emitted while a row is being edited does not turn the edit into a new row', async () => {
    const r = render((host) => host.answer.set([rateOf(null, active(CANTIERE))]));
    await r.open('Modifica');

    r.host.answer.set([rateOf(null, active(CANTIERE))]);
    r.fixture.detectChanges();
    r.type('day', '31');
    await r.submit();

    expect(r.rowTitles()).toEqual(['Cantiere A14, Chieti Scalo']);
    expect(r.rowTerms()[0]).toContain('31,00 €/h di giorno');
  });

  it('a pair being edited is not refused as a duplicate of itself after the answer is re-emitted', async () => {
    const r = render((host) => {
      host.level.set('PerLocationPair');
      host.answer.set([rateOf(active(MAGAZZINO), active(CANTIERE))]);
    });
    await r.open('Modifica');

    r.host.answer.set([rateOf(active(MAGAZZINO), active(CANTIERE))]);
    r.fixture.detectChanges();
    await r.submit();

    expect(r.rowTitles().length).toBe(1);
    expect(r.rateForm()).toBeNull();
  });

  it('without the night surcharge the rows tell no night values, even when the draft still holds them', () => {
    const r = render((host) => host.answer.set([rateOf(null, active(CANTIERE))]));
    expect(r.rowTerms()[0]).toContain('di notte');

    r.host.night.set(false);
    r.fixture.detectChanges();

    expect(r.rowTerms()).toEqual(['30,00 €/h · minimo 60,00 €']);
  });

  it('an empty answer replacing an empty one keeps what was written, a new answer replaces it', async () => {
    const r = render();
    await r.open('Aggiungi tariffa');
    r.choose(0, 'l-3');
    r.type('day', '30');
    r.type('night', '42');
    r.type('callFee', '35');
    await r.submit();
    expect(r.rowTitles().length).toBe(1);

    r.host.answer.set([]);
    r.fixture.detectChanges();
    expect(r.rowTitles()).toEqual(['Cantiere A14, Chieti Scalo']);

    r.host.answer.set([rateOf(null, active(DISCARICA))]);
    r.fixture.detectChanges();
    expect(r.rowTitles()).toEqual(['Discarica Cerratina, Lanciano']);
  });

  it('the message under the rows goes away when the night surcharge, the level or the pricing mode changes', async () => {
    const r = render();
    const shown = async () => {
      r.button('Conferma').click();
      await settle(r.fixture);
      expect(r.notice()).toBe('Aggiungi almeno una tariffa.');
    };

    await shown();
    r.host.night.set(false);
    r.fixture.detectChanges();
    expect(r.notice()).toBeUndefined();

    await shown();
    r.host.level.set('PerPickupLocation');
    r.fixture.detectChanges();
    expect(r.notice()).toBeUndefined();

    await shown();
    r.host.mode.set('ByWeight');
    r.fixture.detectChanges();
    expect(r.notice()).toBeUndefined();
  });

  it('Escape in the dialog does not reach the question that holds it', async () => {
    const r = render();
    await r.open('Aggiungi tariffa');
    let escaped = 0;
    r.element.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Escape') {
        escaped++;
      }
    });

    r.field('day').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(escaped).toBe(0);
  });
});

describe('location rates of a contract', () => {
  const dto = (over: Partial<ContractLocationRate> = {}): ContractLocationRate => ({
    pickup: { id: 'l1', name: 'Magazzino', municipality: 'Pescara', status: 'Active' },
    delivery: {
      id: 'l2',
      name: 'Cantiere SP49',
      municipality: 'Spoltore',
      status: 'Deactivated',
    },
    dayPrice: 30,
    nightPrice: 42,
    nightCallFee: 35,
    minimumRule: 'TieredOverage',
    minimumAmount: 50,
    minimumThreshold: 4,
    minimumOveragePrice: 12,
    ...over,
  });

  it('a rate read from the contract keeps its locations, marks the deactivated one and takes its minimum', () => {
    expect(locationRateAnswerOf(dto(), 'ByHour')).toEqual({
      pickup: { id: 'l1', name: 'Magazzino', municipality: 'Pescara', deactivated: false },
      delivery: { id: 'l2', name: 'Cantiere SP49', municipality: 'Spoltore', deactivated: true },
      rate: { day: 30, night: 42, callFee: 35 },
      minimum: { kind: 'TieredOverage', amount: 50, threshold: 4, overage: 12 },
    });
  });

  it('a side the level does not use stays null, and a trip price or no rule has no minimum', () => {
    const single = locationRateAnswerOf(dto({ pickup: null }), 'ByHour');
    expect(single.pickup).toBeNull();
    expect(single.delivery?.id).toBe('l2');
    expect(locationRateAnswerOf(dto(), 'ByTrip').minimum).toBeNull();
    expect(locationRateAnswerOf(dto({ minimumRule: null }), 'ByHour').minimum).toBeNull();
  });

  it('the request item of a rate carries the ids of its locations and the seven rate members', () => {
    expect(locationRateRequestOf(locationRateAnswerOf(dto({ pickup: null }), 'ByHour'))).toEqual({
      pickupLocationId: null,
      deliveryLocationId: 'l2',
      dayPrice: 30,
      nightPrice: 42,
      nightCallFee: 35,
      minimumRule: 'TieredOverage',
      minimumAmount: 50,
      minimumThreshold: 4,
      minimumOveragePrice: 12,
    });
  });

  it('the key of the rates leaves the names and the status out, so a renamed or deactivated location is no change', () => {
    const active = locationRateAnswerOf(dto(), 'ByHour');
    const renamed = locationRateAnswerOf(
      dto({
        delivery: { id: 'l2', name: 'Altro nome', municipality: 'Altrove', status: 'Active' },
      }),
      'ByHour',
    );

    expect(locationRatesKey([renamed])).toEqual(locationRatesKey([active]));
    expect(locationRatesKey([active])[0]).toEqual({
      pickup: 'l1',
      delivery: 'l2',
      rate: { day: 30, night: 42, callFee: 35 },
      minimum: { kind: 'TieredOverage', amount: 50, threshold: 4, overage: 12 },
    });
  });
});
