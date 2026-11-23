import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import italian from '../../../../../public/i18n/it.json';
import type { RateableVehicle } from '../vehicles/vehicles-api';
import type { BillingLevel, PricingMode } from './contracts-api';
import type { RatedLocation } from './contract-location-rates';
import {
  ContractVehicleRates,
  type RatedPlace,
  type VehicleRateAnswer,
} from './contract-vehicle-rates';

const AUTOSPURGO: RateableVehicle = {
  id: 'v-1',
  licensePlate: 'AB123CD',
  description: 'Autospurgo Scania P410',
};
const GRU: RateableVehicle = { id: 'v-2', licensePlate: 'GH456JK', description: 'Gru mobile 15t' };
const FLOOR: RateableVehicle = {
  id: 'v-3',
  licensePlate: 'EF789LM',
  description: 'Walking floor 30t',
};

const DISMESSO: VehicleRateAnswer = {
  vehicleId: 'v-9',
  licensePlate: 'ZZ999ZZ',
  description: 'Vecchia cisterna',
  decommissioned: true,
  rate: { day: 48, night: null, callFee: null },
  minimum: { kind: 'None', amount: null, threshold: null, overage: null },
  places: [],
};

const rateOf = (
  vehicle: RateableVehicle,
  overrides: Partial<VehicleRateAnswer> = {},
): VehicleRateAnswer => ({
  vehicleId: vehicle.id,
  licensePlate: vehicle.licensePlate,
  description: vehicle.description,
  decommissioned: false,
  rate: { day: 55, night: 70, callFee: 40 },
  minimum: { kind: 'FixedMinimum', amount: 120, threshold: null, overage: null },
  places: [],
  ...overrides,
});

@Component({
  imports: [ContractVehicleRates],
  template: `
    <app-contract-vehicle-rates
      [night]="night()"
      [mode]="mode()"
      [level]="level()"
      [places]="places()"
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
  readonly night = signal(false);
  readonly mode = signal<PricingMode>('ByHour');
  readonly level = signal<BillingLevel>('FlatRate');
  readonly places = signal<RatedPlace[]>([]);
  readonly rateable = signal<RateableVehicle[] | null>([AUTOSPURGO, GRU, FLOOR]);
  readonly failed = signal(false);
  readonly answer = signal<VehicleRateAnswer[] | null>(null);
  readonly cancellable = signal(false);
  readonly confirmed: VehicleRateAnswer[][] = [];
  cancelled = 0;
  retried = 0;
}

describe('ContractVehicleRates', () => {
  const render = (setup: (host: Host) => void = () => undefined) => {
    stubModalDialog();
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    TestBed.inject(TranslateService).use('it');
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    setup(fixture.componentInstance);
    fixture.detectChanges();
    TestBed.tick();
    const element = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;

    const text = (node: Element | null | undefined) =>
      node?.textContent?.replace(/\s+/g, ' ').trim();
    const radios = () =>
      Array.from(element.querySelectorAll<HTMLInputElement>('input[name="vehicle-rates"]'));
    const button = (label: string) =>
      Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => text(b) === label,
      )!;
    const rows = () => Array.from(element.querySelectorAll('app-contract-rate-rows li'));
    const rowTitles = () =>
      Array.from(element.querySelectorAll('app-contract-rate-rows li strong')).map((s) => text(s));
    const rowTerms = () =>
      Array.from(element.querySelectorAll('app-contract-rate-rows li .pt-muted')).map((s) =>
        text(s),
      );
    const dialogOpen = () => element.querySelector('app-contract-rate-dialog') !== null;
    const rateForm = () => element.querySelector<HTMLFormElement>('form[id^="rate-dialog-"]')!;
    const select = () => rateForm().querySelector('select')!;
    const optionLabels = () =>
      Array.from(select().querySelectorAll('option'))
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
    const choose = (id: string) => {
      select().value = id;
      select().dispatchEvent(new Event('change'));
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
    const yes = () => {
      radios()[1].click();
      fixture.detectChanges();
    };
    const notice = () => text(element.querySelector('.pt-field__error[role="alert"]'));
    return {
      fixture,
      element,
      host,
      text,
      radios,
      button,
      rows,
      rowTitles,
      rowTerms,
      dialogOpen,
      rateForm,
      select,
      optionLabels,
      field,
      type,
      choose,
      submit,
      open,
      yes,
      notice,
    };
  };

  afterEach(() => document.body.replaceChildren());

  it('"Sì" shows no rows at first, then "Aggiungi un mezzo" and "Conferma"', () => {
    const r = render();

    expect(r.text(r.element.querySelector('legend'))).toBe(
      'Ci sono mezzi con una tariffa diversa?',
    );
    expect(r.element.textContent).toContain('Stessa tariffa per tutti i mezzi');
    expect(r.element.textContent).toContain('Alcuni mezzi hanno una tariffa propria');
    expect(r.button('Aggiungi un mezzo')).toBeUndefined();

    r.yes();

    expect(r.rows().length).toBe(0);
    expect(r.dialogOpen()).toBe(false);
    expect(r.button('Aggiungi un mezzo')).toBeTruthy();
    expect(r.button('Conferma')).toBeTruthy();
  });

  it('each vehicle rate is a row with the plate in monospace, the description above the terms, "Modifica" and "Togli"', () => {
    const r = render((host) => {
      host.night.set(true);
      host.answer.set([rateOf(AUTOSPURGO), DISMESSO]);
    });

    expect(r.rows().length).toBe(2);
    expect(r.rowTitles()).toEqual([
      'AB123CD Autospurgo Scania P410',
      'ZZ999ZZ Vecchia cisterna Dismesso',
    ]);
    expect(r.rows()[0].querySelector('strong .pt-mono')?.textContent).toBe('AB123CD');
    expect(r.rowTerms()).toEqual([
      '55,00 €/h di giorno · 70,00 €/h di notte · chiamata 40,00 € · minimo 120,00 €',
      '48,00 €/h · nessun minimo',
    ]);
    expect(r.rows()[0].querySelector('.pt-pill')).toBeNull();
    expect(r.text(r.rows()[1].querySelector('.pt-pill--warn'))).toBe('Dismesso');
    for (const row of r.rows()) {
      expect(Array.from(row.querySelectorAll('button')).map((b) => b.textContent?.trim())).toEqual([
        'Modifica',
        'Togli',
      ]);
    }
  });

  it('"Aggiungi un mezzo" opens "Nuova tariffa" with the line, a vehicle select and no "Nuovo mezzo"', async () => {
    const r = render((host) => {
      host.night.set(true);
      host.mode.set('ByWeight');
    });
    r.yes();

    await r.open('Aggiungi un mezzo');

    expect(r.text(r.element.querySelector('app-dialog .pt-title'))).toBe('Nuova tariffa');
    expect(r.text(r.element.querySelector('app-dialog .pt-dialog__head .pt-muted'))).toBe(
      'Forfettario · a peso · con maggiorazione notturna',
    );
    expect(r.text(r.rateForm().querySelector('label.pt-label'))).toBe('Mezzo');
    expect(r.optionLabels()).toEqual([
      'AB123CD · Autospurgo Scania P410',
      'GH456JK · Gru mobile 15t',
      'EF789LM · Walking floor 30t',
    ]);
    expect(r.element.textContent).not.toContain('Nuovo mezzo');
    expect(r.element.textContent).not.toContain('Nuovo luogo');
    expect(r.field('night')).not.toBeNull();
  });

  it('"Aggiungi" with a vehicle and a price adds the row, and the vehicle is not offered again', async () => {
    const r = render();
    r.yes();
    await r.open('Aggiungi un mezzo');
    r.choose('v-2');
    r.type('day', '48');

    await r.submit();

    expect(r.dialogOpen()).toBe(false);
    expect(r.rowTitles()).toEqual(['GH456JK Gru mobile 15t']);
    expect(r.host.confirmed).toEqual([]);

    await r.open('Aggiungi un mezzo');
    expect(r.optionLabels()).toEqual([
      'AB123CD · Autospurgo Scania P410',
      'EF789LM · Walking floor 30t',
    ]);
  });

  it('the dialog without a vehicle shows "Scegli un mezzo." under the select and adds nothing', async () => {
    const r = render();
    r.yes();
    await r.open('Aggiungi un mezzo');
    r.type('day', '48');

    await r.submit();

    expect(r.dialogOpen()).toBe(true);
    expect(r.text(r.rateForm().querySelector('.pt-field > .pt-field__error'))).toBe(
      'Scegli un mezzo.',
    );
    expect(r.rows().length).toBe(0);
  });

  it('"Modifica" opens "Modifica tariffa" prefilled, and "Salva" replaces the row', async () => {
    const r = render((host) => host.answer.set([rateOf(AUTOSPURGO)]));

    await r.open('Modifica');

    expect(r.text(r.element.querySelector('app-dialog .pt-title'))).toBe('Modifica tariffa');
    expect(r.select().value).toBe('v-1');
    expect(r.field('day').value).toBe('55');
    expect(r.field('amount').value).toBe('120');
    expect(r.optionLabels()).toEqual([
      'AB123CD · Autospurgo Scania P410',
      'GH456JK · Gru mobile 15t',
      'EF789LM · Walking floor 30t',
    ]);

    r.choose('v-2');
    r.type('day', '60');
    await r.submit();

    expect(r.rowTitles()).toEqual(['GH456JK Gru mobile 15t']);
    expect(r.rowTerms()[0]).toContain('60,00 €/h');
  });

  it('saving a row moved to another vehicle gives the focus to the "Modifica" of its new row', async () => {
    const r = render((host) => host.answer.set([rateOf(AUTOSPURGO)]));
    await r.open('Modifica');
    r.choose(GRU.id);
    await r.submit();

    expect(r.rowTitles().length).toBe(1);
    expect(document.activeElement).toBe(r.element.querySelector('[data-edit]'));
  });

  it('a decommissioned vehicle of the answer stays selectable on its own row and is not offered to the other rows', async () => {
    const r = render((host) => host.answer.set([DISMESSO, rateOf(AUTOSPURGO)]));

    await r.open('Aggiungi un mezzo');
    expect(r.optionLabels()).not.toContain('ZZ999ZZ · Vecchia cisterna');
    r.button('Annulla').click();
    await settle(r.fixture);

    await r.open('Modifica');
    expect(r.optionLabels()).not.toContain('ZZ999ZZ · Vecchia cisterna');
    r.button('Annulla').click();
    await settle(r.fixture);

    await r.open('Modifica', 1);
    expect(r.optionLabels()[0]).toBe('ZZ999ZZ · Vecchia cisterna');
    expect(r.select().value).toBe('v-9');
    expect(r.field('day').value).toBe('48');
  });

  it('confirming keeps the decommissioned vehicle with its rate unchanged', () => {
    const r = render((host) => host.answer.set([DISMESSO]));

    r.button('Conferma').click();
    r.fixture.detectChanges();

    expect(r.host.confirmed).toEqual([[DISMESSO]]);
  });

  it('rows holding night prices are told and confirmed without them once the contract has no night surcharge', () => {
    const r = render((host) => {
      host.night.set(true);
      host.answer.set([rateOf(AUTOSPURGO)]);
    });
    expect(r.rowTerms()[0]).toContain('di notte');

    r.host.night.set(false);
    r.fixture.detectChanges();
    expect(r.rowTerms()[0]).not.toContain('di notte');

    r.button('Conferma').click();
    r.fixture.detectChanges();

    expect(r.host.confirmed[0].map((entry) => entry.rate)).toEqual([
      { day: 55, night: null, callFee: null },
    ]);
  });

  it('a rate under a trip price confirms with no minimum', async () => {
    const r = render((host) => host.mode.set('ByTrip'));
    r.yes();
    await r.open('Aggiungi un mezzo');
    r.choose('v-1');
    r.type('day', '120,5');
    await r.submit();

    r.button('Conferma').click();
    r.fixture.detectChanges();

    expect(r.host.confirmed).toEqual([
      [
        {
          vehicleId: 'v-1',
          licensePlate: 'AB123CD',
          description: 'Autospurgo Scania P410',
          decommissioned: false,
          rate: { day: 120.5, night: null, callFee: null },
          minimum: null,
          places: [],
        },
      ],
    ]);
  });

  it('"Conferma" without rows shows "Aggiungi almeno un mezzo." and confirms nothing', async () => {
    const r = render();
    r.yes();

    r.button('Conferma').click();
    await settle(r.fixture);

    expect(r.notice()).toBe('Aggiungi almeno un mezzo.');
    expect(r.host.confirmed).toEqual([]);
    expect(document.activeElement).toBe(r.button('Aggiungi un mezzo'));
  });

  it('the message goes away with the first row added', async () => {
    const r = render();
    r.yes();
    r.button('Conferma').click();
    r.fixture.detectChanges();
    await r.open('Aggiungi un mezzo');
    r.choose('v-1');
    r.type('day', '55');

    await r.submit();

    expect(r.notice()).toBeUndefined();
  });

  it('the rows are sorted by plate, and "Conferma" emits them in that order', () => {
    const r = render((host) =>
      host.answer.set([rateOf(GRU), rateOf(FLOOR), rateOf(AUTOSPURGO), DISMESSO]),
    );

    expect(r.rowTitles().map((title) => title?.split(' ')[0])).toEqual([
      'AB123CD',
      'EF789LM',
      'GH456JK',
      'ZZ999ZZ',
    ]);

    r.button('Conferma').click();
    r.fixture.detectChanges();

    expect(r.host.confirmed[0].map((entry) => entry.licensePlate)).toEqual([
      'AB123CD',
      'EF789LM',
      'GH456JK',
      'ZZ999ZZ',
    ]);
  });

  it('a row added later takes its place by plate', async () => {
    const r = render((host) => host.answer.set([rateOf(GRU)]));
    await r.open('Aggiungi un mezzo');
    r.choose('v-1');
    r.type('day', '30');

    await r.submit();

    expect(r.rowTitles()).toEqual(['AB123CD Autospurgo Scania P410', 'GH456JK Gru mobile 15t']);
  });

  it('"Togli" removes the row at once, and removing the last one leaves "Sì" chosen with the list empty', async () => {
    const r = render((host) => host.answer.set([rateOf(AUTOSPURGO), rateOf(GRU)]));

    r.element.querySelector<HTMLButtonElement>('button[data-remove]')!.click();
    r.fixture.detectChanges();
    expect(r.rowTitles()).toEqual(['GH456JK Gru mobile 15t']);
    expect(r.host.confirmed).toEqual([]);

    r.element.querySelector<HTMLButtonElement>('button[data-remove]')!.click();
    await settle(r.fixture);

    expect(r.rows().length).toBe(0);
    expect(r.radios()[1].checked).toBe(true);
    expect(r.button('Conferma')).toBeTruthy();
    expect(document.activeElement).toBe(r.button('Aggiungi un mezzo'));
    expect(r.host.confirmed).toEqual([]);
  });

  it('changing the answer to "No" confirms an empty answer and clears the vehicle rates entered', () => {
    const r = render((host) => host.answer.set([rateOf(AUTOSPURGO)]));

    r.radios()[0].click();
    r.fixture.detectChanges();

    expect(r.host.confirmed).toEqual([[]]);
    expect(r.rows().length).toBe(0);

    r.yes();
    expect(r.rows().length).toBe(0);
  });

  it('an arrow key moves to "No" without confirming it, and "Sì" is never confirmed by a choice', () => {
    const r = render();
    const no = r.radios()[0];

    no.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    no.click();
    no.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }));
    r.fixture.detectChanges();
    expect(r.host.confirmed).toEqual([]);

    no.click();
    r.fixture.detectChanges();
    expect(r.host.confirmed).toEqual([[]]);

    r.radios()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    r.fixture.detectChanges();
    expect(r.host.confirmed).toEqual([[]]);
    expect(r.button('Conferma')).toBeTruthy();

    no.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    no.click();
    no.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', bubbles: true }));
    r.fixture.detectChanges();
    expect(r.host.confirmed).toEqual([[]]);
    expect(r.button('Conferma')).toBeUndefined();
  });

  it('tells Enter or Space while "No" and "Sì" are the question, Tab then "Conferma" once the rows are open', () => {
    const r = render();
    const keys = () =>
      Array.from(r.element.querySelectorAll('.pt-keys'), (p) =>
        Array.from(p.children, (group) => group.textContent?.replace(/\s+/g, ' ').trim()).join(
          ' · ',
        ),
      );

    expect(keys()).toEqual(['↑ ↓ scegli · Invio o Spazio conferma']);
    r.yes();
    expect(keys()).toEqual(['↑ ↓ scegli · Tab vai ai campi, poi «Conferma»']);
  });

  it('a reopened question offers "Annulla modifica" under the actions, with Esc in the keys under it', () => {
    const r = render((host) => host.cancellable.set(true));
    r.yes();

    const keys = r.element.querySelector('.pt-keys')!;
    expect(keys.textContent).toContain('annulla la modifica');
    const cancel = keys
      .closest('app-contract-keys')!
      .previousElementSibling!.querySelector('button')!;
    expect(cancel.textContent?.trim()).toBe('Annulla modifica');
    cancel.click();
    expect(r.host.cancelled).toBe(1);
  });

  it('while the vehicles are being read the select is disabled, and a failed read says so under it', async () => {
    const r = render((host) => host.rateable.set(null));
    r.yes();
    await r.open('Aggiungi un mezzo');
    expect(r.select().disabled).toBe(true);

    r.host.failed.set(true);
    r.fixture.detectChanges();

    expect(r.select().disabled).toBe(false);
    expect(r.text(r.rateForm().querySelector('.pt-field__error'))).toBe(
      'Non è stato possibile leggere i mezzi. Chiudi e riapri la finestra per riprovare.',
    );
  });

  it('opening the dialog asks to read the vehicles again only after a failed read', async () => {
    const r = render();
    r.yes();
    await r.open('Aggiungi un mezzo');
    expect(r.host.retried).toBe(0);
    await r.open('Annulla');

    r.host.failed.set(true);
    r.fixture.detectChanges();
    await r.open('Aggiungi un mezzo');

    expect(r.host.retried).toBe(1);
  });

  it('Escape in the dialog does not reach the question that holds it', async () => {
    const r = render();
    r.yes();
    await r.open('Aggiungi un mezzo');
    let reached = false;
    r.element.parentElement!.addEventListener('keydown', () => (reached = true));

    r.rateForm().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(reached).toBe(false);
  });

  it('no text of the component uses the internal term', () => {
    const r = render();
    r.yes();

    expect(r.element.textContent!.toLowerCase()).not.toContain('override');
    expect(JSON.stringify(italian.contracts.form.vehicleRates).toLowerCase()).not.toContain(
      'override',
    );
    expect(JSON.stringify(italian.contracts.form.vehicleRates)).toContain('tariffa');
  });

  it('a flat-rate contract keeps its titles and has no places fieldset in the dialog', async () => {
    const r = render((host) => host.answer.set([rateOf(AUTOSPURGO)]));

    await r.open('Modifica');

    expect(r.text(r.element.querySelector('app-dialog .pt-title'))).toBe('Modifica tariffa');
    expect(r.rateForm().querySelector('fieldset input[data-place]')).toBeNull();
    expect(r.rows()[0].querySelectorAll('li > span:first-child > span').length).toBe(1);
  });

  it('with the night surcharge added on a flat-rate contract the rows stay and "Conferma" asks for their night values', async () => {
    const r = render((host) =>
      host.answer.set([
        rateOf(GRU, { rate: { day: 48, night: 60, callFee: 30 } }),
        rateOf(AUTOSPURGO, { rate: { day: 50, night: null, callFee: null } }),
      ]),
    );
    r.host.night.set(true);
    r.fixture.detectChanges();
    expect(r.rows().length).toBe(2);

    r.button('Conferma').click();
    await settle(r.fixture);

    expect(r.notice()).toBe('Completa i prezzi notturni: AB123CD · Autospurgo Scania P410.');
    expect(r.host.confirmed).toEqual([]);
    expect(document.activeElement).toBe(r.rows()[0].querySelector('[data-edit]'));

    await r.open('Modifica');
    expect(r.field('day').value).toBe('50');
    expect(r.field('night').value).toBe('');
  });

  it('a flat-rate answer whose rows all lack night values opens on "Sì" with its rows under the night surcharge', () => {
    const r = render((host) => {
      host.night.set(true);
      host.answer.set([rateOf(GRU, { rate: { day: 48, night: null, callFee: null } })]);
    });

    expect(r.radios()[1].checked).toBe(true);
    expect(r.rows().length).toBe(1);
  });

  it('a decommissioned vehicle with night values is confirmed without them once the contract has no night surcharge', () => {
    const stored = { ...DISMESSO, rate: { day: 48, night: 60, callFee: 30 } };
    const r = render((host) => host.answer.set([stored]));

    r.button('Conferma').click();
    r.fixture.detectChanges();

    expect(r.host.confirmed).toEqual([
      [{ ...stored, rate: { day: 48, night: null, callFee: null } }],
    ]);
  });

  describe.each([
    {
      name: 'PerDeliveryLocation',
      level: 'PerDeliveryLocation' as const,
      billing: 'Per luogo di consegna',
      sorted: ['Cantiere nord, Chieti', 'Magazzino centrale, Pescara', 'Porto, Ortona'],
      one: 'Vale in 1 luogo su 3:',
      many: 'Vale in 2 luoghi su 3:',
      all: 'Vale in tutti i 3 luoghi',
      legend: 'Luoghi in cui vale questa tariffa',
      allBox: 'Tutti i luoghi',
      required: 'Scegli almeno un luogo.',
      hint: 'Nei luoghi spuntati, un viaggio fatto con questo mezzo usa questa tariffa al posto di quella del luogo.',
    },
    {
      name: 'PerLocationPair',
      level: 'PerLocationPair' as const,
      billing: 'Per coppia di luoghi',
      sorted: [
        'Cantiere nord, Chieti → Porto, Ortona',
        'Magazzino centrale, Pescara → Cantiere nord, Chieti',
        'Magazzino centrale, Pescara → Porto, Ortona',
      ],
      one: 'Vale in 1 coppia su 3:',
      many: 'Vale in 2 coppie su 3:',
      all: 'Vale in tutte le 3 coppie',
      legend: 'Coppie in cui vale questa tariffa',
      allBox: 'Tutte le coppie',
      required: 'Scegli almeno una coppia.',
      hint: 'Nelle coppie spuntate, un viaggio fatto con questo mezzo usa questa tariffa al posto di quella della coppia.',
    },
  ])('on $name', (config) => {
    const location = (id: string, name: string, municipality: string): RatedLocation => ({
      id,
      name,
      municipality,
      deactivated: false,
    });
    const CANTIERE = location('l-1', 'Cantiere nord', 'Chieti');
    const MAGAZZINO = location('l-2', 'Magazzino centrale', 'Pescara');
    const PORTO = location('l-3', 'Porto', 'Ortona');
    // sorted as the sheet shows them: A before B before C
    const [A, B, C]: RatedPlace[] =
      config.level === 'PerLocationPair'
        ? [
            { pickup: CANTIERE, delivery: PORTO },
            { pickup: MAGAZZINO, delivery: CANTIERE },
            { pickup: MAGAZZINO, delivery: PORTO },
          ]
        : [CANTIERE, MAGAZZINO, PORTO].map((delivery) => ({ pickup: null, delivery }));
    const PLACES = [C, A, B];

    const setup = (host: Host, answer: VehicleRateAnswer[] = [], places = PLACES) => {
      host.level.set(config.level);
      host.places.set(places);
      host.answer.set(answer);
    };
    const detail = (row: Element) =>
      row.querySelector('li > span:first-child > span:nth-child(3)')?.textContent;
    const boxes = (r: ReturnType<typeof render>) =>
      Array.from(r.rateForm().querySelectorAll<HTMLInputElement>('input[data-place]'));
    const ticked = (r: ReturnType<typeof render>) => boxes(r).map((box) => box.checked);
    const tick = (r: ReturnType<typeof render>, box: HTMLInputElement, on = true) => {
      box.checked = on;
      box.dispatchEvent(new Event('change'));
      r.fixture.detectChanges();
    };
    const squash = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim();

    it('each vehicle rate is a row with its "Vale in" line, one place, some places or all of them', () => {
      const r = render((host) =>
        setup(host, [
          rateOf(AUTOSPURGO, { places: [A] }),
          rateOf(GRU, { places: [B, A] }),
          rateOf(FLOOR, { places: [A, B, C] }),
        ]),
      );

      expect(r.rowTitles()).toEqual([
        'AB123CD Autospurgo Scania P410',
        'EF789LM Walking floor 30t',
        'GH456JK Gru mobile 15t',
      ]);
      const lines = r.rows().map((row) => squash(detail(row)));
      expect(lines).toEqual([
        `${config.one} ${config.sorted[0]}`,
        config.all,
        `${config.many} ${config.sorted[0]} · ${config.sorted[1]}`,
      ]);
      for (const row of r.rows()) {
        expect(
          Array.from(row.querySelectorAll('button')).map((b) => b.textContent?.trim()),
        ).toEqual(['Modifica', 'Togli']);
      }
    });

    it('a vehicle with two rates has two rows, by first place', () => {
      const r = render((host) =>
        setup(host, [
          rateOf(AUTOSPURGO, { places: [C], rate: { day: 60, night: 70, callFee: 40 } }),
          rateOf(AUTOSPURGO, { places: [A, B] }),
        ]),
      );

      expect(r.rowTitles()).toEqual([
        'AB123CD Autospurgo Scania P410',
        'AB123CD Autospurgo Scania P410',
      ]);
      expect(r.rowTerms()[0]).toContain('55,00');
      expect(r.rowTerms()[1]).toContain('60,00');
      expect(squash(detail(r.rows()[1]))).toBe(`${config.one} ${config.sorted[2]}`);
    });

    it('"Aggiungi un mezzo" opens the vehicle dialog with the select, the places fieldset and then the prices', async () => {
      const r = render((host) => setup(host, [rateOf(AUTOSPURGO, { places: [A] })]));

      await r.open('Aggiungi un mezzo');

      expect(r.text(r.element.querySelector('app-dialog .pt-title'))).toBe(
        'Nuova tariffa del mezzo',
      );
      expect(r.text(r.element.querySelector('app-dialog .pt-dialog__head .pt-muted'))).toBe(
        `${config.billing} · a ore · senza maggiorazione notturna`,
      );
      const fieldset = r.rateForm().querySelector('fieldset')!;
      expect(r.text(fieldset.querySelector('legend'))).toBe(config.legend);
      expect(r.text(fieldset.querySelector('p'))).toBe(config.hint);
      expect(r.text(fieldset.querySelector('label:has([data-places-all])'))).toBe(config.allBox);
      expect(boxes(r).map((box) => r.text(box.closest('label')))).toEqual(config.sorted);
      expect(ticked(r)).toEqual([false, false, false]);
      const after = (a: Node, b: Node) =>
        Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      expect(after(r.select(), fieldset)).toBe(true);
      expect(after(fieldset, r.field('day'))).toBe(true);
      // a vehicle that already has a rate can receive another
      expect(r.optionLabels()).toEqual([
        'AB123CD · Autospurgo Scania P410',
        'GH456JK · Gru mobile 15t',
        'EF789LM · Walking floor 30t',
      ]);
    });

    it('"Modifica" opens "Modifica tariffa del mezzo" with the places of the row ticked', async () => {
      const r = render((host) => setup(host, [rateOf(AUTOSPURGO, { places: [A, C] })]));

      await r.open('Modifica');

      expect(r.text(r.element.querySelector('app-dialog .pt-title'))).toBe(
        'Modifica tariffa del mezzo',
      );
      expect(ticked(r)).toEqual([true, false, true]);
    });

    it('a place where the chosen vehicle has another rate cannot be ticked and says so', async () => {
      const r = render((host) =>
        setup(host, [
          rateOf(AUTOSPURGO, { places: [B], rate: { day: 60, night: 70, callFee: 40 } }),
        ]),
      );
      await r.open('Aggiungi un mezzo');
      expect(boxes(r).every((box) => !box.disabled)).toBe(true);

      r.choose('v-1');

      expect(boxes(r).map((box) => box.disabled)).toEqual([false, true, false]);
      expect(r.text(boxes(r)[1].closest('label'))).toBe(
        `${config.sorted[1]} · ha già l'altra tariffa di questo mezzo (60,00 €/h di giorno)`,
      );

      r.choose('v-2');
      expect(boxes(r).every((box) => !box.disabled)).toBe(true);
    });

    it('changing the vehicle on "Modifica" unticks the places the new vehicle already holds', async () => {
      const r = render((host) =>
        setup(host, [
          rateOf(GRU, { places: [A, B] }),
          rateOf(AUTOSPURGO, { places: [B], rate: { day: 60, night: 70, callFee: 40 } }),
        ]),
      );

      await r.open('Modifica', 1);
      expect(r.select().value).toBe('v-2');
      expect(ticked(r)).toEqual([true, true, false]);

      r.choose('v-1');

      expect(ticked(r)).toEqual([true, false, false]);
      expect(boxes(r)[1].disabled).toBe(true);

      await r.submit();

      expect(r.rowTitles()).toEqual([
        'AB123CD Autospurgo Scania P410',
        'AB123CD Autospurgo Scania P410',
      ]);
      r.button('Conferma').click();
      r.fixture.detectChanges();
      expect(r.host.confirmed[0].map((entry) => [entry.vehicleId, entry.places])).toEqual([
        ['v-1', [A]],
        ['v-1', [B]],
      ]);
    });

    it('confirming the dialog with no place shows the message of the level and adds nothing', async () => {
      const r = render((host) => setup(host));
      r.yes();
      await r.open('Aggiungi un mezzo');
      r.choose('v-2');
      r.type('day', '48');

      await r.submit();

      expect(r.dialogOpen()).toBe(true);
      expect(r.text(r.rateForm().querySelector('fieldset .pt-field__error'))).toBe(config.required);
      expect(r.rows().length).toBe(0);
    });

    it('the ticked places become the places of the new row, and "Tutti" ticks every place', async () => {
      const r = render((host) => setup(host));
      r.yes();
      await r.open('Aggiungi un mezzo');
      r.choose('v-2');
      r.type('day', '48');
      tick(r, boxes(r)[2]);
      tick(r, boxes(r)[0]);

      await r.submit();

      expect(squash(detail(r.rows()[0]))).toBe(
        `${config.many} ${config.sorted[0]} · ${config.sorted[2]}`,
      );
      r.button('Conferma').click();
      r.fixture.detectChanges();
      expect(r.host.confirmed[0][0].places).toEqual([A, C]);

      await r.open('Aggiungi un mezzo');
      r.choose('v-1');
      r.type('day', '30');
      tick(r, r.rateForm().querySelector<HTMLInputElement>('[data-places-all]')!);
      expect(ticked(r)).toEqual([true, true, true]);
      await r.submit();

      expect(squash(detail(r.rows()[0]))).toBe(config.all);
    });

    it('"Conferma" merges the rates of a vehicle that are equal and keeps the other', () => {
      const r = render((host) => {
        host.night.set(true);
        setup(host, [
          rateOf(AUTOSPURGO, { places: [A] }),
          rateOf(AUTOSPURGO, { places: [C] }),
          rateOf(AUTOSPURGO, { places: [B], rate: { day: 60, night: 70, callFee: 40 } }),
          rateOf(GRU, { places: [A] }),
        ]);
      });
      expect(r.rows().length).toBe(4);

      r.button('Conferma').click();
      r.fixture.detectChanges();

      expect(
        r.host.confirmed[0].map((entry) => [entry.vehicleId, entry.rate.day, entry.places]),
      ).toEqual([
        ['v-1', 55, [A, C]],
        ['v-1', 60, [B]],
        ['v-2', 55, [A]],
      ]);
    });

    it('with the night surcharge added the rows stay and "Conferma" asks for the night values of the first incomplete one', async () => {
      const r = render((host) =>
        setup(host, [
          rateOf(GRU, { places: [B], rate: { day: 48, night: null, callFee: null } }),
          rateOf(AUTOSPURGO, { places: [A], rate: { day: 50, night: null, callFee: null } }),
        ]),
      );
      r.host.night.set(true);
      r.fixture.detectChanges();
      expect(r.rows().length).toBe(2);

      r.button('Conferma').click();
      await settle(r.fixture);

      expect(r.notice()).toBe('Completa i prezzi notturni: AB123CD · Autospurgo Scania P410.');
      expect(r.host.confirmed).toEqual([]);
      expect(document.activeElement).toBe(r.rows()[0].querySelector('[data-edit]'));

      await r.open('Modifica');
      expect(r.field('day').value).toBe('50');
      expect(ticked(r)).toEqual([true, false, false]);
    });

    it('an answer whose rows all lack night values opens on "Sì", and "No" clears the rows', () => {
      const r = render((host) => {
        host.night.set(true);
        setup(host, [rateOf(GRU, { places: [A], rate: { day: 48, night: null, callFee: null } })]);
      });

      expect(r.radios()[1].checked).toBe(true);
      expect(r.rows().length).toBe(1);

      r.radios()[0].click();
      r.fixture.detectChanges();

      expect(r.host.confirmed).toEqual([[]]);
      expect(r.rows().length).toBe(0);
    });

    it('a decommissioned vehicle keeps its row and its pill, and its own option in the dialog', async () => {
      const r = render((host) => setup(host, [{ ...DISMESSO, places: [B] }]));

      expect(r.rowTitles()).toEqual(['ZZ999ZZ Vecchia cisterna Dismesso']);
      expect(r.text(r.rows()[0].querySelector('.pt-pill--warn'))).toBe('Dismesso');
      expect(squash(detail(r.rows()[0]))).toBe(`${config.one} ${config.sorted[1]}`);

      await r.open('Modifica');
      expect(r.optionLabels()[0]).toBe('ZZ999ZZ · Vecchia cisterna');
      expect(r.select().value).toBe('v-9');
      r.button('Annulla').click();
      await settle(r.fixture);

      r.button('Conferma').click();
      r.fixture.detectChanges();
      expect(r.host.confirmed).toEqual([[{ ...DISMESSO, places: [B] }]]);
    });

    it.each([
      { name: 'rateable vehicles read', rateable: [AUTOSPURGO, GRU, FLOOR] },
      { name: 'vehicles not loaded yet', rateable: null },
    ])(
      'two rows of a vehicle known only to the draft are confirmed unchanged ($name)',
      ({ rateable }) => {
        const first: VehicleRateAnswer = {
          ...DISMESSO,
          places: [A],
          rate: { day: 48, night: null, callFee: null },
        };
        const second: VehicleRateAnswer = {
          ...DISMESSO,
          places: [B, C],
          rate: { day: 62, night: null, callFee: null },
          minimum: { kind: 'FixedMinimum', amount: 90, threshold: null, overage: null },
        };
        const r = render((host) => {
          host.rateable.set(rateable);
          setup(host, [first, second]);
        });

        r.button('Conferma').click();
        r.fixture.detectChanges();

        expect(r.host.confirmed).toEqual([[first, second]]);
      },
    );

    it('a deactivated place keeps its pill in the row and in the dialog', async () => {
      const gone = (place: RatedPlace): RatedPlace => ({
        pickup: place.pickup,
        delivery: place.delivery === null ? null : { ...place.delivery, deactivated: true },
      });
      const off = gone(A);
      const r = render((host) => setup(host, [rateOf(AUTOSPURGO, { places: [off] })], [C, off, B]));

      expect(
        r.text(
          r.rows()[0].querySelector('li > span:first-child > span:nth-child(3) .pt-pill--danger'),
        ),
      ).toBe('Disattivato');

      await r.open('Modifica');

      const first = boxes(r)[0].closest('label')!;
      expect(r.text(first.querySelector('.pt-pill--danger'))).toBe('Disattivato');
      expect(boxes(r).filter((box) => box.closest('label')!.querySelector('.pt-pill')).length).toBe(
        1,
      );
      expect(ticked(r)).toEqual([true, false, false]);
    });
  });
});
