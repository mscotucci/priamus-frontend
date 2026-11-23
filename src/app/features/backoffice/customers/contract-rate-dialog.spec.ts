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
import {
  type ConfirmedRate,
  ContractRateDialog,
  type RateDialogTitles,
  type RatePlaces,
  type RateSubject,
} from './contract-rate-dialog';

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
      [titles]="titles()"
      [notice]="notice()"
      [places]="places()"
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
  readonly titles = signal<RateDialogTitles>({
    new: 'contracts.form.rateDialog.new',
    edit: 'contracts.form.rateDialog.edit',
  });
  readonly notice = signal<string | null>(null);
  readonly places = signal<RatePlaces | null>(null);
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

  it('the rate dialog is the wide one', () => {
    const { element } = render();

    expect(element.querySelector('dialog.pt-dialog')!.classList.contains('pt-dialog--lg')).toBe(
      true,
    );
  });

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
        places: [],
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
        places: [],
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

describe('ContractRateDialog places and extras', () => {
  const PLACES: RatePlaces = {
    legend: 'contracts.form.rateDialog.places.location.legend',
    hint: 'contracts.form.rateDialog.places.location.hint',
    all: 'contracts.form.rateDialog.places.location.all',
    required: 'contracts.form.rateDialog.places.location.required',
    options: [
      { key: 'p-1', label: 'Cantiere A14, Chieti Scalo' },
      { key: 'p-2', label: 'Discarica Cerratina, Lanciano' },
      {
        key: 'p-3',
        label: 'Magazzino centrale, Pescara',
        pill: { key: 'contracts.form.locationRates.deactivated', tone: 'danger' },
      },
    ],
    ticked: ['p-1'],
    // the vehicle l-1 holds another rate on p-2
    blocked: (ids) =>
      ids[0] === 'l-1' ? [{ key: 'p-2', text: "ha già l'altra tariffa di questo mezzo" }] : [],
  };

  const open = (overrides: Partial<RatePlaces> = {}, chosen = '') => {
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
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.subjects.set([subject(DELIVERY, chosen)]);
    host.places.set({ ...PLACES, ...overrides });
    fixture.detectChanges();
    TestBed.tick();
    const element = fixture.nativeElement as HTMLElement;
    const text = (node: Element | null | undefined) =>
      node?.textContent?.replace(/\s+/g, ' ').trim();
    const boxes = () => Array.from(element.querySelectorAll<HTMLInputElement>('input[data-place]'));
    const all = () => element.querySelector<HTMLInputElement>('input[data-places-all]')!;
    const choose = (id: string) => {
      const select = element.querySelector<HTMLSelectElement>('form select')!;
      select.value = id;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const click = (box: HTMLInputElement) => {
      box.click();
      fixture.detectChanges();
    };
    const submit = async () => {
      element
        .querySelector('form[id^="rate-dialog-"]')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(fixture);
    };
    const prices = () => {
      for (const [name, value] of [
        ['day', '34'],
        ['night', '46'],
        ['callFee', '35'],
      ]) {
        const input = element.querySelector<HTMLInputElement>(`input[id$="-${name}"]`)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
      }
      fixture.detectChanges();
    };
    return { fixture, host, element, text, boxes, all, choose, click, submit, prices };
  };

  afterEach(() => document.body.replaceChildren());

  it('the fieldset sits between the select and the prices, with its legend, its hint, "Tutti i luoghi" and one checkbox per option', () => {
    const { element, text, boxes, all } = open();

    const order = Array.from(
      element.querySelectorAll(
        'form select, form fieldset[aria-describedby], form input[id$="-day"]',
      ),
    ).map((node) => node.tagName);
    expect(order).toEqual(['SELECT', 'FIELDSET', 'INPUT']);
    const fieldset = element.querySelector('fieldset')!;
    expect(text(fieldset.querySelector('legend'))).toBe('Luoghi in cui vale questa tariffa');
    expect(text(fieldset.querySelector('.pt-field__hint'))).toBe(
      'Nei luoghi spuntati, un viaggio fatto con questo mezzo usa questa tariffa al posto di quella del luogo.',
    );
    expect(text(all().closest('label'))).toBe('Tutti i luoghi');
    expect(boxes().map((box) => text(box.closest('label')))).toEqual([
      'Cantiere A14, Chieti Scalo',
      'Discarica Cerratina, Lanciano',
      'Magazzino centrale, Pescara Disattivato',
    ]);
    expect(boxes().map((box) => box.checked)).toEqual([true, false, false]);
  });

  it('an option can carry the pill', () => {
    const { boxes } = open();

    const label = boxes()[2].closest('label')!;
    expect(label.querySelector('.pt-pill--danger')?.textContent?.trim()).toBe('Disattivato');
    expect(boxes()[0].closest('label')!.querySelector('.pt-pill')).toBeNull();
  });

  it('an option that cannot be ticked is disabled, unticked and shows its text', () => {
    const { boxes, text, choose } = open({ ticked: ['p-1', 'p-2'] }, 'l-2');
    expect(boxes().map((box) => box.checked)).toEqual([true, true, false]);

    choose('l-1');

    expect(boxes().map((box) => box.disabled)).toEqual([false, true, false]);
    expect(boxes()[1].checked).toBe(false);
    expect(text(boxes()[1].closest('label'))).toBe(
      "Discarica Cerratina, Lanciano · ha già l'altra tariffa di questo mezzo",
    );
  });

  it('changing the chosen subject unticks the options that became not tickable, and a later subject frees them', async () => {
    const r = open({ ticked: ['p-1', 'p-2'] }, 'l-2');
    r.prices();

    r.choose('l-1');
    r.choose('l-2');

    expect(r.boxes().map((box) => [box.disabled, box.checked])).toEqual([
      [false, true],
      [false, false],
      [false, false],
    ]);
    await r.submit();
    expect(r.host.confirmed[0].places).toEqual(['p-1']);
  });

  it('an option not tickable when the dialog opens is not ticked', () => {
    const { boxes } = open({ ticked: ['p-1', 'p-2'] }, 'l-1');

    expect(boxes().map((box) => [box.disabled, box.checked])).toEqual([
      [false, true],
      [true, false],
      [false, false],
    ]);
  });

  it('"Tutti i luoghi" ticks every tickable option, shows ticked when all are, and unticks them again', () => {
    const { boxes, all, click, choose } = open({ ticked: [] }, 'l-2');
    choose('l-1');

    click(all());
    expect(boxes().map((box) => box.checked)).toEqual([true, false, true]);
    expect(all().checked).toBe(true);

    click(all());
    expect(boxes().map((box) => box.checked)).toEqual([false, false, false]);
    expect(all().checked).toBe(false);
  });

  it('"Tutti i luoghi" shows ticked once the last option is ticked by hand and unticked when one is cleared', () => {
    const { boxes, all, click } = open({ ticked: ['p-1', 'p-2'] }, 'l-2');
    expect(all().checked).toBe(false);

    click(boxes()[2]);
    expect(all().checked).toBe(true);

    click(boxes()[0]);
    expect(all().checked).toBe(false);
  });

  it('submitting with nothing ticked shows the error under the fieldset, keeps the dialog open and moves the focus there', async () => {
    const r = open({ ticked: [] }, 'l-2');
    r.prices();

    await r.submit();

    const fieldset = r.element.querySelector('fieldset')!;
    expect(r.text(fieldset.querySelector('.pt-field__error'))).toBe('Scegli almeno un luogo.');
    expect(fieldset.getAttribute('aria-describedby')).toContain(
      fieldset.querySelector('.pt-field__error')!.id,
    );
    expect(r.host.confirmed).toEqual([]);
    expect(document.activeElement).toBe(r.all());

    r.click(r.boxes()[0]);
    expect(fieldset.querySelector('.pt-field__error')).toBeNull();
  });

  it('when every option is blocked for the chosen subject, "Tutti i luoghi" is disabled', () => {
    const { all, boxes } = open(
      {
        blocked: () =>
          PLACES.options.map((option) => ({ key: option.key, text: "ha già l'altra tariffa" })),
      },
      'l-1',
    );

    expect(boxes().every((box) => box.disabled)).toBe(true);
    expect(all().disabled).toBe(true);
  });

  it('a ticked key that matches no option does not confirm, and asks for a place', async () => {
    const r = open({ ticked: ['gone'] }, 'l-2');
    r.prices();

    await r.submit();

    expect(r.host.confirmed).toEqual([]);
    expect(r.text(r.element.querySelector('fieldset .pt-field__error'))).toBe(
      'Scegli almeno un luogo.',
    );
  });

  it('confirming returns the ticked keys, in the order of the options', async () => {
    const r = open({ ticked: ['p-3'] }, 'l-2');
    r.prices();
    r.click(r.boxes()[0]);

    await r.submit();

    expect(r.host.confirmed.length).toBe(1);
    expect(r.host.confirmed[0].places).toEqual(['p-1', 'p-3']);
  });

  it('the ticked keys are read once: a caller that emits new ones later does not change what is ticked', () => {
    const r = open({ ticked: ['p-1'] }, 'l-2');

    r.host.places.set({ ...PLACES, ticked: ['p-2', 'p-3'] });
    r.fixture.detectChanges();

    expect(r.boxes().map((box) => box.checked)).toEqual([true, false, false]);
  });

  it('the title keys are an input and the notice shows above the first select', () => {
    const r = open();
    expect(r.text(r.element.querySelector('.pt-title'))).toBe('Nuova tariffa');
    expect(r.element.querySelector('.pt-notice')).toBeNull();

    r.host.titles.set({
      new: 'contracts.form.rateDialog.newVehicle',
      edit: 'contracts.form.rateDialog.editVehicle',
    });
    r.host.notice.set(
      'Copia di Cantiere A14, Chieti Scalo. Scegli il luogo e cambia quello che serve.',
    );
    r.fixture.detectChanges();
    expect(r.text(r.element.querySelector('.pt-title'))).toBe('Nuova tariffa del mezzo');
    r.host.editing.set(true);
    r.fixture.detectChanges();
    expect(r.text(r.element.querySelector('.pt-title'))).toBe('Modifica tariffa del mezzo');

    const notice = r.element.querySelector('form .pt-notice.pt-notice--info')!;
    expect(r.text(notice)).toBe(
      'Copia di Cantiere A14, Chieti Scalo. Scegli il luogo e cambia quello che serve.',
    );
    expect(notice.nextElementSibling!.querySelector('select')).not.toBeNull();
  });

  it('a dialog without the new inputs has no fieldset, no notice and confirms no places', async () => {
    const r = open();
    r.host.places.set(null);
    r.choose('l-2');
    r.fixture.detectChanges();
    r.prices();

    expect(r.element.querySelector('fieldset input[data-place]')).toBeNull();
    expect(r.element.querySelector('.pt-notice')).toBeNull();
    await r.submit();
    expect(r.host.confirmed[0].places).toEqual([]);
  });
});
