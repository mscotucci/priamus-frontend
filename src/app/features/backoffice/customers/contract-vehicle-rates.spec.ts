import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import italian from '../../../../../public/i18n/it.json';
import type { RateableVehicle } from '../vehicles/vehicles-api';
import type { PricingMode } from './contracts-api';
import { ContractVehicleRates, type VehicleRateAnswer } from './contract-vehicle-rates';

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
};

@Component({
  imports: [ContractVehicleRates],
  template: `
    <app-contract-vehicle-rates
      [night]="night()"
      [mode]="mode()"
      [rateable]="rateable()"
      [loading]="loading()"
      [failed]="failed()"
      [answer]="answer()"
      [cancellable]="cancellable()"
      (confirmed)="confirmed.push($event)"
      (cancelled)="cancelled = cancelled + 1"
    />
  `,
})
class Host {
  readonly night = signal(false);
  readonly mode = signal<PricingMode>('ByHour');
  readonly rateable = signal<RateableVehicle[] | null>([AUTOSPURGO, GRU, FLOOR]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly answer = signal<VehicleRateAnswer[] | null>(null);
  readonly cancellable = signal(false);
  readonly confirmed: VehicleRateAnswer[][] = [];
  cancelled = 0;
}

describe('ContractVehicleRates', () => {
  const render = () => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    TestBed.inject(TranslateService).use('it');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;

    const radios = () =>
      Array.from(element.querySelectorAll<HTMLInputElement>('input[name="vehicle-rates"]'));
    const blocks = () => Array.from(element.querySelectorAll<HTMLElement>('.pt-card'));
    const button = (label: string) =>
      Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.includes(label),
      )!;
    const text = (node: Element | null | undefined) =>
      node?.textContent?.replace(/\s+/g, ' ').trim();
    const settle = () => fixture.detectChanges();
    const yes = () => {
      radios()[1].click();
      settle();
    };
    const choose = (block: number, vehicleId: string) => {
      const select = blocks()[block].querySelector('select')!;
      select.value = vehicleId;
      select.dispatchEvent(new Event('change'));
      settle();
    };
    const type = (block: number, field: string, value: string) => {
      const input = blocks()[block].querySelector<HTMLInputElement>(`input[id$="-${field}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      settle();
    };
    const optionLabels = (block: number) =>
      Array.from(blocks()[block].querySelectorAll('option'))
        .slice(1)
        .map((o) => text(o));
    const errors = (block: number) =>
      Array.from(blocks()[block].querySelectorAll('.pt-field__error')).map((e) => text(e));
    const confirm = () => {
      button('Conferma').click();
      settle();
    };
    const fill = (block: number, vehicleId: string, day = '55') => {
      choose(block, vehicleId);
      type(block, 'day', day);
    };
    return {
      fixture,
      element,
      host,
      radios,
      blocks,
      button,
      text,
      settle,
      yes,
      choose,
      type,
      optionLabels,
      errors,
      confirm,
      fill,
    };
  };

  it('"Sì" shows "Mezzo 1" with a remove button, the select "<plate> · <description>", the day price with its unit, the minimum rules, "Aggiungi un mezzo" and "Conferma"', () => {
    const { element, blocks, yes, text, optionLabels, button } = render();

    expect(text(element.querySelector('legend'))).toBe('Ci sono mezzi con una tariffa diversa?');
    expect(element.textContent).toContain('Stessa tariffa per tutti i mezzi');
    expect(element.textContent).toContain('Alcuni mezzi hanno una tariffa propria');
    expect(blocks().length).toBe(0);

    yes();

    expect(blocks().length).toBe(1);
    const block = blocks()[0];
    expect(text(block.querySelector('p.pt-label'))).toBe('Mezzo 1');
    expect(block.querySelector('button')!.getAttribute('aria-label')).toBe('Togli il mezzo 1');
    expect(optionLabels(0)).toEqual([
      'AB123CD · Autospurgo Scania P410',
      'GH456JK · Gru mobile 15t',
      'EF789LM · Walking floor 30t',
    ]);
    expect(text(block.querySelector('.pt-input-group__addon'))).toBe('€/h');
    expect(block.querySelectorAll('input[id$="-night"], input[id$="-callFee"]').length).toBe(0);
    expect(text(block.querySelector('fieldset'))).toContain('Nessun minimo');
    expect(text(block.querySelector('fieldset'))).toContain('Minimo fisso');
    expect(text(block.querySelector('fieldset'))).toContain('Scaglione con eccesso');
    expect(button('Aggiungi un mezzo')).toBeTruthy();
    expect(button('Conferma')).toBeTruthy();
  });

  it('the night price and the night call fee show only with the night surcharge, each with its unit', () => {
    const { host, fixture, blocks, yes } = render();
    host.night.set(true);
    fixture.detectChanges();
    yes();

    const units = Array.from(blocks()[0].querySelectorAll('.pt-input-group__addon')).map((u) =>
      u.textContent?.trim(),
    );
    expect(units).toEqual(['€/h', '€/h', '€']);
    expect(blocks()[0].querySelector('input[id$="-night"]')).not.toBeNull();
    expect(blocks()[0].querySelector('input[id$="-callFee"]')).not.toBeNull();
  });

  it('a contract priced by trip shows no minimum in the block', () => {
    const { host, fixture, blocks, yes, text } = render();
    host.mode.set('ByTrip');
    fixture.detectChanges();
    yes();

    expect(blocks()[0].querySelector('fieldset')).toBeNull();
    expect(text(blocks()[0].querySelector('.pt-input-group__addon'))).toBe('€');
  });

  it('the select offers only the rateable vehicles and never one chosen in another block', () => {
    const { button, settle, yes, choose, optionLabels } = render();
    yes();
    choose(0, 'v-1');
    button('Aggiungi un mezzo').click();
    settle();

    expect(optionLabels(1)).toEqual(['GH456JK · Gru mobile 15t', 'EF789LM · Walking floor 30t']);
    expect(optionLabels(0)).toEqual([
      'AB123CD · Autospurgo Scania P410',
      'GH456JK · Gru mobile 15t',
      'EF789LM · Walking floor 30t',
    ]);

    choose(1, 'v-2');
    expect(optionLabels(0)).toEqual([
      'AB123CD · Autospurgo Scania P410',
      'EF789LM · Walking floor 30t',
    ]);
  });

  it('a decommissioned vehicle of the answer stays in its block with the mark and is not offered to other blocks', () => {
    const { host, fixture, blocks, button, settle, optionLabels, text } = render();
    host.answer.set([DISMESSO]);
    fixture.detectChanges();

    expect(blocks().length).toBe(1);
    expect(text(blocks()[0].querySelector('p.pt-label'))).toBe('Mezzo 1 Dismesso');
    const select = blocks()[0].querySelector('select')!;
    expect(text(select.selectedOptions[0])).toBe('ZZ999ZZ · Vecchia cisterna');
    expect(blocks()[0].querySelector<HTMLInputElement>('input[id$="-day"]')!.value).toBe('48');

    button('Aggiungi un mezzo').click();
    settle();

    expect(optionLabels(1)).not.toContain('ZZ999ZZ · Vecchia cisterna');
    expect(optionLabels(1).length).toBe(3);
  });

  it('confirming keeps the decommissioned vehicle with its rate unchanged', () => {
    const { host, fixture, confirm } = render();
    host.answer.set([DISMESSO]);
    fixture.detectChanges();

    confirm();

    expect(host.confirmed).toEqual([[DISMESSO]]);
  });

  it.each([
    {
      night: false,
      mode: 'ByHour' as PricingMode,
      day: '',
      expected: ['Inserisci il prezzo diurno.'],
    },
    {
      night: false,
      mode: 'ByHour' as PricingMode,
      day: '0',
      expected: ['Inserisci un importo maggiore di zero.'],
    },
    {
      night: false,
      mode: 'ByHour' as PricingMode,
      day: '10,123',
      expected: ['Usa al massimo due decimali.'],
    },
    {
      night: true,
      mode: 'ByHour' as PricingMode,
      day: '55',
      expected: ['Inserisci il prezzo notturno.', 'Inserisci la chiamata notturna.'],
    },
  ])(
    'the day and night fields of a block are validated under the field ($day, night $night)',
    ({ night, mode, day, expected }) => {
      const { host, fixture, blocks, yes, fill, confirm, errors } = render();
      host.night.set(night);
      host.mode.set(mode);
      fixture.detectChanges();
      yes();
      fill(0, 'v-1', day);

      confirm();

      expect(errors(0)).toEqual(expected);
      expect(host.confirmed).toEqual([]);
      expect(blocks()[0].querySelectorAll('input[aria-invalid="true"]').length).toBe(
        expected.length,
      );
    },
  );

  it.each([
    {
      night: '49,99',
      expected: ['Il prezzo notturno non può essere più basso del prezzo diurno.'],
    },
    { night: '50', expected: [] },
  ])(
    'a vehicle block refuses a night price below its day price and accepts an equal one (night $night)',
    ({ night, expected }) => {
      const { host, fixture, yes, fill, type, confirm, errors } = render();
      host.night.set(true);
      fixture.detectChanges();
      yes();
      fill(0, 'v-1', '50');
      type(0, 'night', night);
      type(0, 'callFee', '10');

      confirm();

      expect(errors(0)).toEqual(expected);
      expect(host.confirmed.length).toBe(expected.length === 0 ? 1 : 0);
    },
  );

  it('the minimum of a block is validated: a fixed minimum needs its amount, a tiered one its three values', () => {
    const { blocks, yes, fill, confirm, errors, settle } = render();
    yes();
    fill(0, 'v-1');

    blocks()[0].querySelectorAll<HTMLInputElement>('fieldset input[type="radio"]')[1].click();
    settle();
    confirm();
    expect(errors(0)).toEqual(["Inserisci l'importo minimo."]);

    blocks()[0].querySelectorAll<HTMLInputElement>('fieldset input[type="radio"]')[2].click();
    settle();
    confirm();
    expect(errors(0)).toEqual([
      "Inserisci l'importo minimo.",
      'Inserisci la soglia.',
      "Inserisci il costo dell'eccedenza.",
    ]);
  });

  it('picking another minimum keeps the error of a price still invalid and drops those of the minimum fields', () => {
    const { blocks, yes, fill, confirm, errors, settle } = render();
    yes();
    fill(0, 'v-1', '');
    blocks()[0].querySelectorAll<HTMLInputElement>('fieldset input[type="radio"]')[1].click();
    settle();
    confirm();
    expect(errors(0)).toEqual(['Inserisci il prezzo diurno.', "Inserisci l'importo minimo."]);

    blocks()[0].querySelectorAll<HTMLInputElement>('fieldset input[type="radio"]')[0].click();
    settle();

    expect(errors(0)).toEqual(['Inserisci il prezzo diurno.']);
  });

  it('a contract priced by trip confirms the vehicle rate with no minimum', () => {
    const { host, fixture, yes, fill, confirm } = render();
    host.mode.set('ByTrip');
    fixture.detectChanges();
    yes();
    fill(0, 'v-1', '120,5');

    confirm();

    expect(host.confirmed).toEqual([
      [
        {
          vehicleId: 'v-1',
          licensePlate: 'AB123CD',
          description: 'Autospurgo Scania P410',
          decommissioned: false,
          rate: { day: 120.5, night: null, callFee: null },
          minimum: null,
        },
      ],
    ]);
  });

  it('confirming with an empty select shows "Scegli un mezzo." under it and confirms nothing', () => {
    const { host, blocks, yes, type, confirm, errors } = render();
    yes();
    type(0, 'day', '55');

    confirm();

    expect(errors(0)).toEqual(['Scegli un mezzo.']);
    expect(blocks()[0].querySelector('select')!.getAttribute('aria-invalid')).toBe('true');
    expect(host.confirmed).toEqual([]);
  });

  it('every block must be complete, and a complete answer is confirmed with the vehicles, rates and minimum entered', () => {
    const { host, fixture, blocks, button, settle, yes, fill, type, confirm, errors } = render();
    host.night.set(true);
    fixture.detectChanges();
    yes();
    fill(0, 'v-1');
    type(0, 'night', '70');
    type(0, 'callFee', '0');
    button('Aggiungi un mezzo').click();
    settle();
    expect(blocks().length).toBe(2);

    confirm();
    expect(errors(0)).toEqual([]);
    expect(errors(1)).toEqual([
      'Scegli un mezzo.',
      'Inserisci il prezzo diurno.',
      'Inserisci il prezzo notturno.',
      'Inserisci la chiamata notturna.',
    ]);
    expect(host.confirmed).toEqual([]);

    fill(1, 'v-2', '48');
    type(1, 'night', '60');
    type(1, 'callFee', '40');
    blocks()[1].querySelectorAll<HTMLInputElement>('fieldset input[type="radio"]')[1].click();
    settle();
    type(1, 'amount', '120');
    confirm();

    expect(host.confirmed).toEqual([
      [
        {
          vehicleId: 'v-1',
          licensePlate: 'AB123CD',
          description: 'Autospurgo Scania P410',
          decommissioned: false,
          rate: { day: 55, night: 70, callFee: 0 },
          minimum: { kind: 'None', amount: null, threshold: null, overage: null },
        },
        {
          vehicleId: 'v-2',
          licensePlate: 'GH456JK',
          description: 'Gru mobile 15t',
          decommissioned: false,
          rate: { day: 48, night: 60, callFee: 40 },
          minimum: { kind: 'FixedMinimum', amount: 120, threshold: null, overage: null },
        },
      ],
    ]);
  });

  it('removing the last block leaves the question unanswered', () => {
    const { host, radios, blocks, yes, settle, element } = render();
    yes();

    blocks()[0].querySelector('button')!.click();
    settle();

    expect(blocks().length).toBe(0);
    expect(radios().every((radio) => !radio.checked)).toBe(true);
    expect(element.textContent).not.toContain('Conferma');
    expect(host.confirmed).toEqual([]);
  });

  it('changing the answer to "No" confirms an empty answer and clears the vehicle rates entered', () => {
    const { host, radios, blocks, settle, yes, fill } = render();
    yes();
    fill(0, 'v-1');

    radios()[0].click();
    settle();

    expect(host.confirmed).toEqual([[]]);
    expect(blocks().length).toBe(0);

    yes();
    expect(blocks().length).toBe(1);
    expect(blocks()[0].querySelector('select')!.value).toBe('');
    expect(blocks()[0].querySelector<HTMLInputElement>('input[id$="-day"]')!.value).toBe('');
  });

  it('an arrow key moves to "No" without confirming it, and "Sì" is never confirmed by a choice', () => {
    const { host, radios, blocks, settle } = render();
    const no = radios()[0];

    no.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    no.click();
    no.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }));
    settle();
    expect(host.confirmed).toEqual([]);

    no.click();
    settle();
    expect(host.confirmed).toEqual([[]]);

    radios()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    settle();
    expect(host.confirmed).toEqual([[]]);
    expect(blocks().length).toBe(1);

    no.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    no.click();
    no.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', bubbles: true }));
    settle();
    expect(host.confirmed).toEqual([[]]);
    expect(blocks().length).toBe(0);
  });

  it('tells Enter or Space while "No" and "Sì" are the question, Tab then "Conferma" once the blocks are open', () => {
    const { fixture, yes } = render();
    const keys = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.pt-keys') as NodeListOf<Element>, (p) =>
        Array.from(p.children, (group) => group.textContent?.replace(/\s+/g, ' ').trim()).join(
          ' · ',
        ),
      );

    expect(keys()).toEqual(['↑ ↓ scegli · Invio o Spazio conferma']);
    yes();
    expect(keys()).toEqual(['↑ ↓ scegli · Tab vai ai campi, poi «Conferma»']);
  });

  it('a reopened question offers "Annulla modifica" under the actions, with Esc in the keys under it', () => {
    const { fixture, yes } = render();
    const element = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.cancellable.set(true);
    fixture.detectChanges();
    yes();

    const keys = element.querySelector('.pt-keys')!;
    expect(keys.textContent).toContain('annulla la modifica');
    const cancel = keys
      .closest('app-contract-keys')!
      .previousElementSibling!.querySelector('button')!;
    expect(cancel.textContent?.trim()).toBe('Annulla modifica');
    cancel.click();
    expect(fixture.componentInstance.cancelled).toBe(1);
  });

  it('when the vehicles could not be read the block shows the message under the select', () => {
    const { host, fixture, blocks, yes, text } = render();
    host.rateable.set(null);
    host.failed.set(true);
    fixture.detectChanges();
    yes();

    expect(text(blocks()[0].querySelector('.pt-field__error'))).toBe(
      'Non è stato possibile leggere i mezzi. Ricarica la pagina per riprovare.',
    );
  });

  it('no text of the component uses the internal term', () => {
    const { host, fixture, element, yes } = render();
    host.night.set(true);
    fixture.detectChanges();
    yes();

    expect(element.textContent!.toLowerCase()).not.toContain('override');
    expect(JSON.stringify(italian.contracts.form.vehicleRates).toLowerCase()).not.toContain(
      'override',
    );
    expect(JSON.stringify(italian.contracts.form.vehicleRates)).toContain('tariffa');
  });
});
