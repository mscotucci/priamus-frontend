import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { LocationsFacade, type SavedLocation } from '../locations/locations-facade';
import type { PricingMode } from './contracts-api';
import type { Minimum, Rate } from './contract-rate';
import { type ConfirmedRate, ContractRateDialog, type RateSubject } from './contract-rate-dialog';

const MAGAZZINO = { id: 'l-1', label: 'Magazzino centrale, Pescara' };
const DISCARICA = { id: 'l-2', label: 'Discarica Cerratina, Lanciano' };

const subject = (
  label: string,
  chosen = '',
  overrides: Partial<RateSubject> = {},
): RateSubject => ({
  label,
  placeholder: 'contracts.form.vehicleRates.vehicle.placeholder',
  required: 'contracts.form.vehicleRates.vehicle.required',
  loadFailed: 'contracts.form.vehicleRates.vehicle.loadFailed',
  options: [MAGAZZINO, DISCARICA],
  chosen,
  loading: false,
  failed: false,
  canCreate: true,
  ...overrides,
});

const DELIVERY = 'contracts.form.vehicleRates.vehicle.label';

@Component({
  imports: [ContractRateDialog],
  host: { '(keydown.escape)': 'escaped = escaped + 1' },
  template: `
    <app-contract-rate-dialog
      [editing]="editing()"
      line="Per luogo di consegna · a ore · con maggiorazione notturna"
      icon="pin"
      [night]="night()"
      [mode]="mode()"
      [subjects]="subjects()"
      [rate]="rate()"
      [minimum]="minimum()"
      [check]="check()"
      (confirmed)="confirmed.push($event)"
      (cancelled)="cancelled = cancelled + 1"
      (locationCreated)="created.push($event)"
    />
  `,
})
class Host {
  readonly editing = signal(false);
  readonly night = signal(true);
  readonly mode = signal<PricingMode>('ByHour');
  readonly subjects = signal<RateSubject[]>([subject(DELIVERY)]);
  readonly rate = signal<Rate | null>(null);
  readonly minimum = signal<Minimum | null>(null);
  readonly check = signal<(ids: string[]) => string | null>(() => null);
  readonly confirmed: ConfirmedRate[] = [];
  readonly created: SavedLocation[] = [];
  cancelled = 0;
  escaped = 0;
}

describe('ContractRateDialog', () => {
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
    setup(fixture.componentInstance);
    fixture.detectChanges();
    TestBed.tick();
    const element = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;

    const text = (node: Element | null | undefined) =>
      node?.textContent?.replace(/\s+/g, ' ').trim();
    const rateForm = () => element.querySelector<HTMLFormElement>('form[id^="rate-dialog-"]')!;
    const field = (name: string) =>
      element.querySelector<HTMLInputElement>(`input[id$="-${name}"]`)!;
    const selects = () => Array.from(rateForm().querySelectorAll('select'));
    const button = (label: string) =>
      Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => text(b) === label,
      )!;
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
    const errors = () =>
      Array.from(rateForm().querySelectorAll('.pt-field__error')).map((e) => text(e));
    return {
      fixture,
      element,
      host,
      text,
      rateForm,
      field,
      selects,
      button,
      type,
      choose,
      submit,
      errors,
    };
  };

  const fillPrices = (r: ReturnType<typeof render>) => {
    r.type('day', '34');
    r.type('night', '46');
    r.type('callFee', '35');
  };

  it('a new rate shows the title, the line, the select with its placeholder, the prices with their unit and Annulla / Aggiungi', () => {
    const { element, text, selects, button } = render();

    expect(text(element.querySelector('.pt-title'))).toBe('Nuova tariffa');
    expect(text(element.querySelector('.pt-dialog__head .pt-muted'))).toBe(
      'Per luogo di consegna · a ore · con maggiorazione notturna',
    );
    expect(selects().length).toBe(1);
    expect(text(selects()[0].querySelector('option'))).toBe('Scegli un mezzo');
    expect(
      Array.from(selects()[0].querySelectorAll('option'))
        .slice(1)
        .map((o) => text(o)),
    ).toEqual([MAGAZZINO.label, DISCARICA.label]);
    expect(
      Array.from(element.querySelectorAll('.pt-input-group__addon')).map((a) => text(a)),
    ).toEqual(['€/h', '€/h', '€']);
    expect(button('Annulla')).toBeTruthy();
    expect(button('Aggiungi')).toBeTruthy();
    expect(button('Nuovo luogo')).toBeTruthy();
  });

  it('an edit is prefilled, titled "Modifica tariffa" and saved with "Salva"', async () => {
    const r = render((host) => {
      host.editing.set(true);
      host.subjects.set([subject(DELIVERY, 'l-2')]);
      host.rate.set({ day: 34, night: 46, callFee: 35 });
      host.minimum.set({ kind: 'FixedMinimum', amount: 60, threshold: null, overage: null });
    });

    expect(r.text(r.element.querySelector('.pt-title'))).toBe('Modifica tariffa');
    expect(r.button('Salva')).toBeTruthy();
    expect(r.selects()[0].value).toBe('l-2');
    expect([r.field('day').value, r.field('night').value, r.field('callFee').value]).toEqual([
      '34',
      '46',
      '35',
    ]);
    expect(r.field('amount').value).toBe('60');

    r.type('day', '36,5');
    await r.submit();

    expect(r.host.confirmed).toEqual([
      {
        ids: ['l-2'],
        rate: { day: 36.5, night: 46, callFee: 35 },
        minimum: { kind: 'FixedMinimum', amount: 60, threshold: null, overage: null },
      },
    ]);
  });

  it('an empty select shows "Scegli un mezzo." under it, nothing is confirmed and the select has the focus', async () => {
    const r = render();
    fillPrices(r);

    await r.submit();

    expect(r.errors()).toEqual(['Scegli un mezzo.']);
    expect(r.host.confirmed).toEqual([]);
    expect(document.activeElement).toBe(r.selects()[0]);
  });

  it('each invalid price shows its message under its field, the first invalid field has the focus and nothing is confirmed', async () => {
    const r = render();
    r.choose(0, 'l-1');
    r.type('day', '');
    r.type('night', '1,234');
    r.type('callFee', '-1');

    await r.submit();

    const under = (name: string) =>
      r.text(r.field(name).closest('.pt-field')!.querySelector('.pt-field__error'));
    expect([under('day'), under('night'), under('callFee')]).toEqual([
      'Inserisci il prezzo diurno.',
      'Usa al massimo due decimali.',
      "L'importo non può essere negativo.",
    ]);
    expect(r.errors()).toEqual([
      'Inserisci il prezzo diurno.',
      'Usa al massimo due decimali.',
      "L'importo non può essere negativo.",
    ]);
    expect(document.activeElement).toBe(r.field('day'));
    expect(r.host.confirmed).toEqual([]);
  });

  it('a night price below the day price is refused under the night field', async () => {
    const r = render();
    r.choose(0, 'l-1');
    r.type('day', '40');
    r.type('night', '30');
    r.type('callFee', '35');

    await r.submit();

    expect(r.errors()).toEqual(['Il prezzo notturno non può essere più basso del prezzo diurno.']);
    expect(document.activeElement).toBe(r.field('night'));
  });

  it('the minimum fields show their own errors and changing the minimum kind keeps the price errors', async () => {
    const r = render();
    r.choose(0, 'l-1');
    r.type('night', '46');
    r.type('callFee', '35');
    r.element.querySelectorAll<HTMLInputElement>('input[type="radio"]')[2].click();
    r.fixture.detectChanges();

    await r.submit();
    expect(r.errors()).toEqual([
      'Inserisci il prezzo diurno.',
      "Inserisci l'importo minimo.",
      'Inserisci la soglia.',
      "Inserisci il costo dell'eccedenza.",
    ]);

    r.element.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();
    r.fixture.detectChanges();
    expect(r.errors()).toEqual(['Inserisci il prezzo diurno.']);
  });

  it('without the night surcharge only the day price is asked, and a rate confirms with null night values', async () => {
    const r = render();
    r.host.night.set(false);
    r.fixture.detectChanges();
    r.choose(0, 'l-1');
    r.type('day', '34');
    r.element.querySelectorAll<HTMLInputElement>('input[type="radio"]')[0].click();

    expect(r.element.querySelector('input[id$="-night"]')).toBeNull();
    expect(r.element.querySelector('input[id$="-callFee"]')).toBeNull();

    await r.submit();

    expect(r.host.confirmed).toEqual([
      {
        ids: ['l-1'],
        rate: { day: 34, night: null, callFee: null },
        minimum: { kind: 'None', amount: null, threshold: null, overage: null },
      },
    ]);
  });

  it('a rate priced by trip has no minimum rule and confirms with no minimum', async () => {
    const r = render();
    r.host.mode.set('ByTrip');
    r.fixture.detectChanges();
    r.choose(0, 'l-1');
    fillPrices(r);

    expect(r.element.querySelector('fieldset')).toBeNull();
    expect(
      Array.from(r.element.querySelectorAll('.pt-input-group__addon')).map((a) =>
        a.textContent?.trim(),
      ),
    ).toEqual(['€', '€', '€']);

    await r.submit();

    expect(r.host.confirmed[0].minimum).toBeNull();
  });

  it('a refused combination shows its message under the last select and confirms nothing', async () => {
    const r = render((host) => {
      host.subjects.set([subject('contracts.form.field.day.label'), subject(DELIVERY)]);
      host.check.set((ids) => (ids[0] === ids[1] ? 'contracts.form.error.invalid' : null));
    });
    r.choose(0, 'l-1');
    r.choose(1, 'l-1');
    fillPrices(r);

    await r.submit();

    const fields = Array.from(r.rateForm().querySelectorAll('.pt-field'));
    expect(fields[0].querySelector('.pt-field__error')).toBeNull();
    expect(fields[1].querySelector('.pt-field__error')?.textContent?.trim()).toBe(
      'Inserisci un importo valido.',
    );
    expect(document.activeElement).toBe(r.selects()[1]);
    expect(r.host.confirmed).toEqual([]);

    r.choose(1, 'l-2');
    await r.submit();
    expect(r.host.confirmed[0].ids).toEqual(['l-1', 'l-2']);
  });

  it('"Nuovo luogo" opens the location dialog over the rate dialog, the created location is chosen and the other values stay', async () => {
    const r = render();
    r.type('day', '34');
    r.button('Nuovo luogo').click();
    await settle(r.fixture);

    expect(r.element.querySelector('app-location-form-dialog')).not.toBeNull();
    expect(r.rateForm().querySelector('app-location-form-dialog')).toBeNull();
    expect(r.element.querySelectorAll('form').length).toBe(2);

    const name = r.element.querySelector<HTMLInputElement>('#location-name')!;
    name.value = 'Cantiere A14';
    name.dispatchEvent(new Event('input'));
    const municipality = r.element.querySelector<HTMLInputElement>('#location-municipality')!;
    municipality.value = 'Chieti';
    municipality.dispatchEvent(new Event('input'));
    r.element
      .querySelector<HTMLFormElement>('#location-form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(r.fixture);
    http
      .expectOne((req) => req.method === 'POST')
      .flush({
        id: 'l-9',
        name: 'Cantiere A14',
        municipality: 'Chieti',
      });
    await settle(r.fixture);

    expect(r.element.querySelector('app-location-form-dialog')).toBeNull();
    expect(r.selects()[0].value).toBe('l-9');
    expect(r.text(r.selects()[0].selectedOptions[0])).toBe('Cantiere A14, Chieti');
    expect(r.field('day').value).toBe('34');
    expect(r.host.created).toEqual([{ id: 'l-9', name: 'Cantiere A14', municipality: 'Chieti' }]);
  });

  it('"Nuovo luogo" on each of two selects chooses the created location in that select only', async () => {
    const r = render((host) =>
      host.subjects.set([subject('contracts.form.field.day.label'), subject(DELIVERY)]),
    );
    r.choose(0, 'l-1');

    const create = async (button: number, name: string) => {
      Array.from(r.element.querySelectorAll<HTMLButtonElement>('button'))
        .filter((b) => r.text(b) === 'Nuovo luogo')
        [button].click();
      await settle(r.fixture);
      const nameInput = r.element.querySelector<HTMLInputElement>('#location-name')!;
      nameInput.value = name;
      nameInput.dispatchEvent(new Event('input'));
      const municipality = r.element.querySelector<HTMLInputElement>('#location-municipality')!;
      municipality.value = 'Chieti';
      municipality.dispatchEvent(new Event('input'));
      r.element
        .querySelector<HTMLFormElement>('#location-form')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(r.fixture);
      http
        .expectOne((req) => req.method === 'POST')
        .flush({ id: 'new-' + button, name, municipality: 'Chieti' });
      await settle(r.fixture);
    };

    await create(1, 'Cantiere B');
    expect(r.selects().map((s) => s.value)).toEqual(['l-1', 'new-1']);
    await create(0, 'Cantiere C');
    expect(r.selects().map((s) => s.value)).toEqual(['new-0', 'new-1']);
  });

  it('cancelling the location dialog returns to the rate dialog unchanged', async () => {
    const r = render();
    r.choose(0, 'l-2');
    r.type('day', '34');
    r.button('Nuovo luogo').click();
    await settle(r.fixture);

    const dialogs = Array.from(r.element.querySelectorAll('app-dialog'));
    const cancel = Array.from(dialogs[1].querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => r.text(b) === 'Annulla',
    )!;
    cancel.click();
    await settle(r.fixture);

    expect(r.element.querySelector('app-location-form-dialog')).toBeNull();
    expect(r.element.querySelector('app-contract-rate-dialog app-dialog')).not.toBeNull();
    expect(r.selects()[0].value).toBe('l-2');
    expect(r.field('day').value).toBe('34');
    expect(r.host.cancelled).toBe(0);
    expect(r.host.created).toEqual([]);
  });

  it('"Annulla" and Escape close the dialog, and Escape never reaches the card behind', () => {
    const r = render();

    r.button('Annulla').click();
    expect(r.host.cancelled).toBe(1);

    const dialog = r.element.querySelector('dialog')!;
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(r.host.cancelled).toBe(2);

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    r.field('day').dispatchEvent(escape);
    expect(r.host.escaped).toBe(0);
  });

  it('Escape in the location dialog closes only that dialog and does not reach the card behind', async () => {
    const r = render();
    r.button('Nuovo luogo').click();
    await settle(r.fixture);

    const location = r.element.querySelectorAll('dialog')[1];
    location.dispatchEvent(new Event('cancel', { cancelable: true }));
    await settle(r.fixture);
    expect(r.element.querySelector('app-location-form-dialog')).toBeNull();
    expect(r.host.cancelled).toBe(0);

    r.button('Nuovo luogo').click();
    await settle(r.fixture);
    r.element
      .querySelector<HTMLInputElement>('#location-name')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(r.host.escaped).toBe(0);
  });

  it('a failed or loading read disables or flags the select with its message', () => {
    const r = render();
    r.host.subjects.set([subject(DELIVERY, '', { failed: true })]);
    r.fixture.detectChanges();

    expect(r.errors()).toEqual([
      'Non è stato possibile leggere i mezzi. Chiudi e riapri la finestra per riprovare.',
    ]);

    r.host.subjects.set([subject(DELIVERY, '', { loading: true })]);
    r.fixture.detectChanges();
    expect(r.selects()[0].disabled).toBe(true);
  });

  it('new subjects, rate and minimum objects from the caller while the dialog is open do not reset the choice, the prices or the minimum kind', () => {
    const r = render();
    r.choose(0, 'l-2');
    r.type('day', '34');
    r.element.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();
    r.fixture.detectChanges();

    r.host.subjects.set([subject(DELIVERY, '', { loading: true })]);
    r.fixture.detectChanges();
    r.host.subjects.set([
      subject(DELIVERY, '', {
        options: [MAGAZZINO, DISCARICA, { id: 'l-3', label: 'Nuovo, Chieti' }],
      }),
    ]);
    r.host.rate.set({ day: 99, night: 99, callFee: 99 });
    r.host.minimum.set({ kind: 'TieredOverage', amount: 1, threshold: 1, overage: 1 });
    r.fixture.detectChanges();

    expect(r.selects()[0].value).toBe('l-2');
    expect(r.field('day').value).toBe('34');
    expect(r.field('amount')).toBeTruthy();
    expect(r.element.querySelector('input[id$="-threshold"]')).toBeNull();
  });

  it('in a pair, re-emitting the subjects after a location was created keeps both choices', async () => {
    const r = render((host) =>
      host.subjects.set([subject('contracts.form.field.day.label'), subject(DELIVERY)]),
    );
    r.choose(0, 'l-1');
    Array.from(r.element.querySelectorAll<HTMLButtonElement>('button'))
      .filter((b) => r.text(b) === 'Nuovo luogo')[1]
      .click();
    await settle(r.fixture);
    const name = r.element.querySelector<HTMLInputElement>('#location-name')!;
    name.value = 'Cantiere B';
    name.dispatchEvent(new Event('input'));
    const municipality = r.element.querySelector<HTMLInputElement>('#location-municipality')!;
    municipality.value = 'Chieti';
    municipality.dispatchEvent(new Event('input'));
    r.element
      .querySelector<HTMLFormElement>('#location-form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(r.fixture);
    http
      .expectOne((req) => req.method === 'POST')
      .flush({ id: 'new-1', name: 'Cantiere B', municipality: 'Chieti' });
    await settle(r.fixture);

    r.host.subjects.set([
      subject('contracts.form.field.day.label'),
      subject(DELIVERY, '', {
        options: [MAGAZZINO, DISCARICA, { id: 'new-1', label: 'Cantiere B, Chieti' }],
      }),
    ]);
    r.fixture.detectChanges();

    expect(r.selects().map((s) => s.value)).toEqual(['l-1', 'new-1']);
  });

  it('with a select still loading and an invalid price, the focus goes to the price field', async () => {
    const r = render((host) => host.subjects.set([subject(DELIVERY, '', { loading: true })]));
    r.type('day', '');

    await r.submit();

    expect(r.selects()[0].disabled).toBe(true);
    expect(r.selects()[0].getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(r.field('day'));
  });
});
