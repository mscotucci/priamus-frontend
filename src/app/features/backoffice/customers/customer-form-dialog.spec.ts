import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { Toast } from '../../../core/toast/toast';
import type { CustomerListItem } from './customers-api';
import { CustomerFormDialog } from './customer-form-dialog';
import { CustomersFacade } from './customers-facade';

const URL = '/api/registry/customers';

const ROW: CustomerListItem = {
  id: '5',
  companyName: 'Cantine Vestine S.r.l.',
  vatNumber: '02134760681',
  taxCode: 'MRCGLI72D45G438K',
  address: "Contrada Fonte Ruccia 4, Città Sant'Angelo (PE)",
  status: 'Deactivated',
  lastModifiedAt: '2026-11-03T12:00:00Z',
  version: 3,
};

describe('CustomerFormDialog', () => {
  let http: HttpTestingController;

  const render = (customer: CustomerListItem | null = null) => {
    stubModalDialog();
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        CustomersFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CustomerFormDialog);
    fixture.componentRef.setInput('customer', customer);
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    TestBed.tick();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, closedCount: () => closed };
  };

  const writes = () => http.match((r) => r.url.startsWith(URL) && r.method !== 'GET');

  const type = (element: HTMLElement, selector: string, value: string) => {
    const field = element.querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const fill = (
    element: HTMLElement,
    values: { name?: string; vat?: string; tax?: string; address?: string },
  ) => {
    type(element, '#customer-name', values.name ?? 'Edilcave SpA');
    type(element, '#customer-vat', values.vat ?? '');
    type(element, '#customer-tax', values.tax ?? '');
    type(element, '#customer-address', values.address ?? '');
  };

  const submit = async (fixture: ReturnType<typeof render>['fixture']) => {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(fixture);
  };

  const text = (element: HTMLElement, selector: string) =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  it('a new customer shows the title, the line, the four fields and Annulla / Crea cliente', () => {
    const { element } = render();

    expect(text(element, '.pt-title')).toBe('Nuovo cliente');
    expect(text(element, '.pt-dialog__head .pt-muted')).toBe(
      'Solo la ragione sociale è obbligatoria.',
    );
    expect(Array.from(element.querySelectorAll('label')).map((l) => l.textContent?.trim())).toEqual(
      ['Ragione sociale', 'Partita IVA', 'Codice fiscale', 'Sede'],
    );
    expect(
      Array.from(element.querySelectorAll('.pt-dialog__actions button')).map((b) =>
        b.textContent?.trim(),
      ),
    ).toEqual(['Annulla', 'Crea cliente']);
    expect(element.querySelector('dialog')!.open).toBe(true);
    expect(element.querySelector('.pt-tile use')?.getAttribute('href')).toBe('icons.svg#building');
  });

  it('a muted line states the rule under each field, and VAT number and tax code are monospace', () => {
    const { element } = render();

    expect(text(element, '#customer-name-note')).toBe(
      'Come compare sui documenti del cliente. Massimo 150 caratteri.',
    );
    expect(text(element, '#customer-vat-note')).toBe(
      '11 cifre; spazi e prefisso IT vengono tolti. Vuota per i clienti esteri.',
    );
    expect(text(element, '#customer-tax-note')).toBe(
      "16 caratteri per una persona, 11 cifre per un'azienda o un ente.",
    );
    expect(text(element, '#customer-address-note')).toBe(
      'Indirizzo su una riga. Massimo 200 caratteri.',
    );
    expect(element.querySelectorAll('.pt-field__hint')).toHaveLength(4);
    const mono = (id: string) =>
      element.querySelector(`#customer-${id}`)!.classList.contains('pt-mono');
    expect([mono('name'), mono('vat'), mono('tax'), mono('address')]).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it.each([
    ['Disattivato', ROW, 'Disattivato: non selezionabile sui nuovi viaggi.'],
    ['Attivo', { ...ROW, status: 'Active' as const }, 'Attivo: selezionabile sui nuovi viaggi.'],
  ])(
    'Modifica on a customer %s opens the dialog with the status in the line, the fields prefilled and Salva modifiche',
    (_status, customer, line) => {
      const { element } = render(customer);

      expect(text(element, '.pt-title')).toBe('Modifica cliente');
      expect(text(element, '.pt-dialog__head .pt-muted')).toBe(line);
      expect(element.querySelector<HTMLInputElement>('#customer-name')!.value).toBe(
        'Cantine Vestine S.r.l.',
      );
      expect(element.querySelector<HTMLInputElement>('#customer-vat')!.value).toBe('02134760681');
      expect(element.querySelector<HTMLInputElement>('#customer-tax')!.value).toBe(
        'MRCGLI72D45G438K',
      );
      expect(element.querySelector<HTMLInputElement>('#customer-address')!.value).toBe(
        "Contrada Fonte Ruccia 4, Città Sant'Angelo (PE)",
      );
      expect(text(element, '.pt-btn--primary')).toBe('Salva modifiche');
      expect(element.querySelectorAll('select, input[type="checkbox"]')).toHaveLength(0);
    },
  );

  it('a customer without VAT number, tax code and address opens with those fields empty', () => {
    const { element } = render({ ...ROW, vatNumber: null, taxCode: null, address: null });

    expect(element.querySelector<HTMLInputElement>('#customer-vat')!.value).toBe('');
    expect(element.querySelector<HTMLInputElement>('#customer-tax')!.value).toBe('');
    expect(element.querySelector<HTMLInputElement>('#customer-address')!.value).toBe('');
  });

  it.each([
    ['an empty company name', '', 'Inserisci la ragione sociale.'],
    ['a blank company name', '    ', 'Inserisci la ragione sociale.'],
    ['151 characters', 'a'.repeat(151), 'La ragione sociale può avere al massimo 150 caratteri.'],
  ])(
    '%s sends no request and shows the message under Ragione sociale',
    async (_n, name, message) => {
      const { fixture, element } = render();
      fill(element, { name });

      await submit(fixture);

      expect(writes()).toHaveLength(0);
      expect(text(element, '#customer-name-note')).toBe(message);
      expect(element.querySelector('#customer-name')!.getAttribute('aria-invalid')).toBe('true');
      http.match(() => true);
    },
  );

  it.each([
    ['ten digits', '0145528068'],
    ['twelve digits', '014552806831'],
    ['a letter among the digits', '0145528068A'],
    ['a prefix other than IT', 'DE 01455280683'],
  ])(
    'a VAT number of %s sends no request and shows the message under Partita IVA',
    async (_n, vat) => {
      const { fixture, element } = render();
      fill(element, { vat });

      await submit(fixture);

      expect(writes()).toHaveLength(0);
      expect(text(element, '#customer-vat-note')).toBe(
        'Partita IVA non valida: controlla le 11 cifre.',
      );
      http.match(() => true);
    },
  );

  it.each([
    ['fifteen characters', 'MRCGLI72D45G438'],
    ['ten digits', '0145528068'],
    ['a punctuation mark', 'MRCGLI72D45G43.K'],
  ])(
    'a tax code of %s sends no request and shows the message under Codice fiscale',
    async (_n, tax) => {
      const { fixture, element } = render();
      fill(element, { tax });

      await submit(fixture);

      expect(writes()).toHaveLength(0);
      expect(text(element, '#customer-tax-note')).toBe(
        'Codice fiscale non valido: 16 lettere e cifre oppure 11 cifre.',
      );
      http.match(() => true);
    },
  );

  it('an address of 201 characters sends no request and shows the message under Sede', async () => {
    const { fixture, element } = render();
    fill(element, { address: 'a'.repeat(201) });

    await submit(fixture);

    expect(writes()).toHaveLength(0);
    expect(text(element, '#customer-address-note')).toBe(
      'La sede può avere al massimo 200 caratteri.',
    );
    http.match(() => true);
  });

  it('only the company name is required: the others are sent as null when empty', async () => {
    const { fixture, element } = render();
    fill(element, { name: '  Edilcave SpA  ', vat: '   ', tax: '', address: '  ' });

    await submit(fixture);

    const [post] = writes();
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      companyName: 'Edilcave SpA',
      vatNumber: null,
      taxCode: null,
      address: null,
    });
    http.match(() => true);
  });

  it('values at their limits are sent trimmed, the codes as typed', async () => {
    const { fixture, element } = render();
    fill(element, {
      name: 'n'.repeat(150),
      vat: ' it 0145 5280683 ',
      tax: 'mrcgli72d45g438k',
      address: `  ${'a'.repeat(200)}  `,
    });

    await submit(fixture);

    expect(writes()[0].request.body).toEqual({
      companyName: 'n'.repeat(150),
      vatNumber: ' it 0145 5280683 ',
      taxCode: 'mrcgli72d45g438k',
      address: 'a'.repeat(200),
    });
    http.match(() => true);
  });

  it('the edit sends a PUT with the version the dialog was opened on', async () => {
    const { fixture } = render(ROW);

    await submit(fixture);

    const [put] = writes();
    expect(put.request.method).toBe('PUT');
    expect(put.request.url).toBe(`${URL}/5`);
    expect(put.request.body).toEqual({
      companyName: 'Cantine Vestine S.r.l.',
      vatNumber: '02134760681',
      taxCode: 'MRCGLI72D45G438K',
      address: "Contrada Fonte Ruccia 4, Città Sant'Angelo (PE)",
      version: 3,
    });
    http.match(() => true);
  });

  it('while saving, fields and buttons are disabled, the primary button shows progress and the dialog cannot be closed', async () => {
    const { fixture, element, closedCount } = render();
    fill(element, {});

    await submit(fixture);
    const dialog = element.querySelector('dialog')!;

    expect(writes()).toHaveLength(1);
    expect(
      Array.from(element.querySelectorAll('input')).every((f) => (f as HTMLInputElement).disabled),
    ).toBe(true);
    expect(Array.from(element.querySelectorAll('button')).every((b) => b.disabled)).toBe(true);
    expect(text(element, '.pt-btn--primary')).toBe('Salvataggio in corso…');
    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(closedCount()).toBe(0);
    http.match(() => true);
  });

  it('Annulla and Escape close the dialog whatever was typed, and a click on the dialog does not', () => {
    const { fixture, element, closedCount } = render();
    fill(element, {});
    fixture.detectChanges();
    const dialog = element.querySelector('dialog')!;

    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(closedCount()).toBe(0);

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(closedCount()).toBe(1);

    element.querySelector<HTMLButtonElement>('.pt-dialog__actions button')!.click();
    expect(closedCount()).toBe(2);
    expect(writes()).toHaveLength(0);
    http.match(() => true);
  });

  it('a VAT number already used shows the backend detail in a danger notice above the fields and keeps the values', async () => {
    const { fixture, element, closedCount } = render();
    fill(element, { vat: '02134760681' });
    await submit(fixture);
    const detail =
      'La partita IVA 02134760681 è già registrata sul cliente Cantine Vestine S.r.l. (disattivato). Per riprenderlo, riattivalo dalla lista.';

    http
      .match((r) => r.method === 'POST')[0]
      .flush(
        { errorCode: 'Registry.Customer.VatNumberTakenByDeactivated', detail },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(fixture);

    const notice = element.querySelector('.pt-notice--danger')!;
    expect(notice.textContent?.trim()).toBe(detail);
    expect(notice.compareDocumentPosition(element.querySelector('.pt-field')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(element.querySelector<HTMLInputElement>('#customer-vat')!.value).toBe('02134760681');
    expect(element.querySelector<HTMLInputElement>('#customer-name')!.disabled).toBe(false);
    expect(closedCount()).toBe(0);
    http.match(() => true);
  });

  it('a 409 on the edit stays inside the dialog, which stays open, and the list reloads', async () => {
    const { fixture, element, closedCount } = render(ROW);
    await submit(fixture);

    http
      .match((r) => r.method === 'PUT')[0]
      .flush(
        {
          errorCode: 'Registry.Customer.ConcurrentUpdate',
          detail: 'Il cliente è stato modificato da un altro utente nel frattempo.',
        },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(fixture);

    expect(text(element, '.pt-notice--danger')).toBe(
      'Il cliente è stato modificato da un altro utente nel frattempo.',
    );
    expect(closedCount()).toBe(0);
    expect(
      http.match((r) => r.method === 'GET' && r.url === '/api/registry/customers'),
    ).toHaveLength(1);
    http.match(() => true);
  });

  it('a failure without a usable body shows the generic message above the fields and puts the focus on Ragione sociale', async () => {
    const { fixture, element } = render();
    document.body.appendChild(element);
    fill(element, {});
    await submit(fixture);

    http.match((r) => r.method === 'POST')[0].flush(null, { status: 500, statusText: 'Error' });
    await settle(fixture);

    expect(text(element, '.pt-notice--danger')).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
    expect(document.activeElement).toBe(element.querySelector('#customer-name'));
    element.remove();
    http.match(() => true);
  });

  it('a backend 400 on VatNumber shows under the VAT field, ignoring case, with no notice above', async () => {
    const { fixture, element } = render();
    fill(element, { vat: '01455280684' });
    await submit(fixture);

    http
      .match((r) => r.method === 'POST')[0]
      .flush(
        {
          errors: {
            VatNumber: ['Partita IVA non valida.'],
            COMPANYNAME: ['Nome errato.', 'Troppo lungo.'],
            TaxCode: ['Codice errato.'],
            Address: ['Sede errata.'],
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle(fixture);

    expect(text(element, '#customer-vat-note')).toBe('Partita IVA non valida.');
    expect(text(element, '#customer-name-note')).toBe('Nome errato. Troppo lungo.');
    expect(text(element, '#customer-tax-note')).toBe('Codice errato.');
    expect(text(element, '#customer-address-note')).toBe('Sede errata.');
    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    http.match(() => true);
  });

  it('an invalid resubmit after a refusal removes the old notice', async () => {
    const { fixture, element } = render();
    fill(element, {});
    await submit(fixture);
    http.match((r) => r.method === 'POST')[0].flush(null, { status: 500, statusText: 'Error' });
    await settle(fixture);
    expect(element.querySelector('.pt-notice--danger')).not.toBeNull();

    type(element, '#customer-name', '');
    await submit(fixture);

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(writes()).toHaveLength(0);
    http.match(() => true);
  });

  it('on success the dialog closes, the toast names the stored company name and the list is asked again', async () => {
    const { fixture, element, closedCount } = render();
    http.expectOne((r) => r.url === URL && r.method === 'GET').flush({ data: [], totalCount: 0 });
    await settle(fixture);
    fill(element, { name: 'Edilcave SpA' });
    await submit(fixture);

    http
      .match((r) => r.method === 'POST')[0]
      .flush(
        {
          id: '9',
          companyName: 'Edilcave SpA',
          vatNumber: null,
          taxCode: null,
          address: null,
          status: 'Active',
          lastModifiedAt: '2026-11-16T08:00:00Z',
          version: 1,
        },
        { status: 201, statusText: 'Created' },
      );
    await settle(fixture);

    expect(closedCount()).toBe(1);
    expect(TestBed.inject(Toast).current()).toBe('Cliente Edilcave SpA creato');
    http.expectOne((r) => r.url === URL && r.method === 'GET');
  });

  it('a successful edit toasts "modificato"', async () => {
    const { fixture, closedCount } = render(ROW);
    await submit(fixture);

    http.match((r) => r.method === 'PUT')[0].flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);

    expect(closedCount()).toBe(1);
    expect(TestBed.inject(Toast).current()).toBe('Cliente Cantine Vestine S.r.l. modificato');
    http.match(() => true);
  });
});
