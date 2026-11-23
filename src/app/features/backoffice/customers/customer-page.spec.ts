import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Layout } from '../../../core/layout/layout';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { Toast } from '../../../core/toast/toast';
import type { Contract, ContractLocationRate } from './contracts-api';
import { CustomerPage } from './customer-page';
import type { CustomerListItem } from './customers-api';
import { CustomersFacade } from './customers-facade';

const CUSTOMER_URL = '/api/registry/customers/c1';
const CONTRACTS_URL = '/api/registry/customers/c1/contracts';

const customer: CustomerListItem = {
  id: 'c1',
  companyName: 'Cantieri Edili Pescara S.r.l.',
  vatNumber: '01873420689',
  taxCode: null,
  address: 'Via Tiburtina Valeria 210, 65129 Pescara (PE)',
  status: 'Active',
  lastModifiedAt: '2026-05-14T12:00:00Z',
  version: 1,
};

const contract = (values: Partial<Contract>): Contract => ({
  id: 'k1',
  customerId: 'c1',
  validFrom: '2026-01-01',
  validTo: '2026-03-31',
  status: 'Expired',
  billingLevel: 'FlatRate',
  pricingMode: 'ByHour',
  requiredDocuments: [],
  nightSurcharge: false,
  dayPrice: null,
  nightPrice: null,
  nightCallFee: null,
  minimumRule: null,
  minimumAmount: null,
  minimumThreshold: null,
  minimumOveragePrice: null,
  vehicleRates: [],
  locationRates: [],
  version: 1,
  ...values,
});

const contracts: Contract[] = [
  contract({
    id: 'k3',
    validFrom: '2027-01-01',
    validTo: null,
    status: 'Upcoming',
    billingLevel: 'PerLocationPair',
    nightSurcharge: true,
    requiredDocuments: ['DeliveryNote', 'WasteForm'],
  }),
  contract({
    id: 'k2',
    validFrom: '2026-04-01',
    validTo: '2026-12-31',
    status: 'Current',
    nightSurcharge: true,
    requiredDocuments: ['DeliveryNote', 'DailySummary'],
  }),
  contract({ id: 'k1', pricingMode: 'ByTrip', requiredDocuments: [] }),
];

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

interface Harness {
  fixture: ComponentFixture<Host>;
  routeNativeElement: HTMLElement;
  detectChanges: () => void;
}

describe('CustomerPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    stubModalDialog();
  });

  const render = async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        CustomersFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'customers/:customerId', component: CustomerPage }]),
        { provide: Layout, useValue: { openDrawer: () => undefined } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Host);
    void TestBed.inject(Router).navigateByUrl('/customers/c1');
    await settle(fixture);
    return {
      fixture,
      routeNativeElement: fixture.nativeElement as HTMLElement,
      detectChanges: () => fixture.detectChanges(),
    };
  };

  const answer = async (
    harness: Harness,
    customerBody: CustomerListItem | null,
    contractsBody: Contract[] = [],
  ) => {
    if (customerBody === null) {
      http.expectOne(CUSTOMER_URL).flush(null, { status: 404, statusText: 'Not Found' });
    } else {
      http.expectOne(CUSTOMER_URL).flush(customerBody);
    }
    http.expectOne(CONTRACTS_URL).flush(contractsBody);
    await settle(harness.fixture);
    return harness.routeNativeElement as HTMLElement;
  };

  const text = (element: Element | null | undefined) =>
    element?.textContent?.replace(/\s+/g, ' ').trim();

  const cells = (element: HTMLElement, row: number) =>
    Array.from(element.querySelectorAll('tbody tr')[row].querySelectorAll('td'));

  const buttons = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('.pt-topbar__actions button')).map((b) =>
      b.textContent?.trim(),
    );

  it('the top bar shows the breadcrumb, the company name, the status and the actions, and the card the VAT number, tax code and address', async () => {
    const element = await answer(await render(), customer);

    const items = Array.from(element.querySelectorAll('.pt-breadcrumb li'));
    expect(items.map((li) => text(li))).toEqual(['Anagrafiche', 'Clienti']);
    expect(items[0].querySelector('a')).toBeNull();
    expect(items[1].querySelector('a')?.getAttribute('href')).toBe('/customers');
    expect(element.querySelector('h1')?.textContent).toBe('Cantieri Edili Pescara S.r.l.');
    const pill = element.querySelector('.pt-topbar__heading .pt-pill')!;
    expect(pill.textContent?.trim()).toBe('Attivo');
    expect(pill.classList.contains('pt-pill--success')).toBe(true);
    expect(buttons(element)).toEqual(['Modifica', 'Disattiva']);

    const card = element.querySelector('main section.pt-card')!;
    expect(
      Array.from(card.children).map((field) => [
        text(field.querySelector('.pt-label')),
        text(field.lastElementChild),
      ]),
    ).toEqual([
      ['Partita IVA', '01873420689'],
      ['Codice fiscale', '—'],
      ['Sede', 'Via Tiburtina Valeria 210, 65129 Pescara (PE)'],
    ]);
    expect(card.querySelector('.pt-mono')?.textContent).toBe('01873420689');
  });

  it('a customer that does not exist shows the not-found state and no data', async () => {
    const element = await answer(await render(), null);

    expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe('Cliente non trovato');
    expect(element.querySelector('h1')?.textContent).toBe('Cliente non trovato');
    expect(element.querySelector('.pt-empty a')).toBeNull();
    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.pt-topbar__actions button')).toBeNull();
  });

  it('while the customer loads a loading indicator is shown, and a failed load offers "Riprova" that reads the customer and its contracts again', async () => {
    const harness = await render();
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.querySelector('main .pt-spinner')).not.toBeNull();

    http.expectOne(CUSTOMER_URL).flush(null, { status: 500, statusText: 'Server Error' });
    http.expectOne(CONTRACTS_URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle(harness.fixture);

    const notice = element.querySelector('main .pt-notice--danger')!;
    expect(notice.textContent).toContain('Si è verificato un errore. Riprova tra poco.');
    const retry = notice.querySelector('button')!;
    expect(retry.textContent?.trim()).toBe('Riprova');

    retry.click();
    TestBed.tick();
    http.expectOne(CUSTOMER_URL).flush(customer);
    http.expectOne(CONTRACTS_URL).flush(contracts);
    await settle(harness.fixture);
    expect(element.querySelector('h1')?.textContent).toBe('Cantieri Edili Pescara S.r.l.');
    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('while the contracts load the section shows a loading indicator, and a failed read offers "Riprova" that reads them again', async () => {
    const harness = await render();
    const element = harness.routeNativeElement as HTMLElement;
    http.expectOne(CUSTOMER_URL).flush(customer);
    await settle(harness.fixture);

    expect(element.querySelector('main section:last-of-type .pt-spinner')).not.toBeNull();
    expect(element.querySelector('table')).toBeNull();

    http.expectOne(CONTRACTS_URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle(harness.fixture);
    const notice = element.querySelector('main section:last-of-type .pt-notice--danger')!;
    expect(notice.textContent).toContain('Si è verificato un errore. Riprova tra poco.');
    const retry = notice.querySelector('button')!;
    expect(retry.textContent?.trim()).toBe('Riprova');

    retry.click();
    TestBed.tick();
    http.expectOne(CONTRACTS_URL).flush(contracts);
    await settle(harness.fixture);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('reading the contracts again (after a save) keeps the table and shows a small indicator until the new rows arrive', async () => {
    const harness = await render();
    const element = await answer(harness, customer, contracts);
    expect(element.querySelector('main .pt-spinner')).toBeNull();

    TestBed.inject(CustomersFacade).reloadContracts();
    await settle(harness.fixture);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(element.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('main .pt-spinner--sm')?.getAttribute('role')).toBe('status');

    http.expectOne(CONTRACTS_URL).flush([...contracts, contract({ id: 'k0' })]);
    await settle(harness.fixture);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(element.querySelector('table')?.hasAttribute('aria-busy')).toBe(false);
    expect(element.querySelector('main .pt-spinner')).toBeNull();
  });

  it('the table has the eight columns and shows validity, status, billing, mode, rate, night and documents as received', async () => {
    const element = await answer(await render(), customer, contracts);

    expect(Array.from(element.querySelectorAll('th')).map((th) => th.textContent?.trim())).toEqual([
      'Validità',
      'Stato',
      'Livello di fatturazione',
      'Modalità',
      'Tariffa',
      'Notturno',
      'Documenti obbligatori',
      'Azioni',
    ]);
    expect(
      Array.from(element.querySelectorAll('tbody tr')).map((_, row) =>
        cells(element, row)
          .slice(0, 7)
          .map((cell) => text(cell)),
      ),
    ).toEqual([
      [
        'dal 01/01/2027',
        'Futuro',
        'Per coppia di luoghi',
        'A ore',
        '—',
        'Sì',
        'DDT, formulario rifiuti',
      ],
      [
        'dal 01/04/2026 al 31/12/2026',
        'In vigore',
        'Forfettario',
        'A ore',
        '—',
        'Sì',
        'DDT, riepilogo di fine giornata',
      ],
      ['dal 01/01/2026 al 31/03/2026', 'Scaduto', 'Forfettario', 'A viaggio', '—', 'No', 'Nessuno'],
    ]);
  });

  it('the documents start with an uppercase letter, whichever comes first', async () => {
    const element = await answer(await render(), customer, [
      contract({ requiredDocuments: ['DeliverySlip', 'WasteForm'] }),
    ]);

    expect(text(cells(element, 0)[6])).toBe('Bolla, formulario rifiuti');
  });

  it('the status pill shows the status the API sends, with its colour', async () => {
    const element = await answer(await render(), customer, contracts);
    const pill = (row: number) => cells(element, row)[1].querySelector('.pt-pill')!;

    expect(pill(0).classList.contains('pt-pill--info')).toBe(true);
    expect(pill(1).classList.contains('pt-pill--success')).toBe(true);
    expect(pill(2).textContent?.trim()).toBe('Scaduto');
    expect(pill(2).className.trim()).toBe('pt-pill');
  });

  it('each row has "Modifica", described by its validity, linking to the contract page', async () => {
    const element = await answer(await render(), customer, contracts);

    const links = Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      row.querySelector('a')!,
    );
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/customers/c1/contracts/k3',
      '/customers/c1/contracts/k2',
      '/customers/c1/contracts/k1',
    ]);
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Modifica', 'Modifica', 'Modifica']);
    expect(text(element.querySelector(`[id="${links[1].getAttribute('aria-describedby')}"]`))).toBe(
      'dal 01/04/2026 al 31/12/2026',
    );
  });

  it('a customer with no contracts shows "Nessun contratto" in place of the table', async () => {
    const element = await answer(await render(), customer, []);

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.pt-empty .pt-title')?.textContent).toBe('Nessun contratto');
    expect(element.querySelector('.pt-empty .pt-muted')?.textContent).toBe(
      'Aggiungi il primo con "Nuovo contratto".',
    );
  });

  it('an active customer has "Nuovo contratto", which opens the page of a new contract', async () => {
    const element = await answer(await render(), customer, contracts);
    const add = Array.from(element.querySelectorAll('main a')).find(
      (a) => a.textContent?.trim() === 'Nuovo contratto',
    )!;

    expect(add.getAttribute('href')).toBe('/customers/c1/contracts/new');
    expect(element.querySelector('main .pt-notice--info')).toBeNull();
  });

  it('the "Tariffa" column shows the day price with the unit of each pricing mode, and "—" muted when there is no rate', async () => {
    const element = await answer(await render(), customer, [
      contract({ id: 'a', pricingMode: 'ByHour', dayPrice: 30 }),
      contract({ id: 'b', pricingMode: 'ByWeight', dayPrice: 18.5 }),
      contract({ id: 'c', pricingMode: 'ByDistance', dayPrice: 1.2 }),
      contract({ id: 'd', pricingMode: 'ByTrip', dayPrice: 150 }),
      contract({
        id: 'e',
        pricingMode: 'ByHour',
        nightSurcharge: true,
        dayPrice: 30,
        nightPrice: 42,
        nightCallFee: 35,
      }),
      contract({ id: 'f', pricingMode: 'ByHour' }),
    ]);

    const rate = (row: number) => cells(element, row)[4];
    expect([0, 1, 2, 3, 4, 5].map((row) => text(rate(row)))).toEqual([
      '30,00 €/h',
      '18,50 €/ton',
      '1,20 €/km',
      '150,00 €',
      '30,00 €/h',
      '—',
    ]);
    expect(rate(0).classList.contains('pt-num')).toBe(true);
    expect(rate(5).classList.contains('pt-num')).toBe(true);
    expect(rate(0).classList.contains('pt-muted')).toBe(false);
    expect(rate(5).classList.contains('pt-muted')).toBe(true);
  });

  it('the "Tariffa" column of a location contract counts its locations or pairs, and a flat-rate contract keeps its day price', async () => {
    const rateOf = (id: string): ContractLocationRate => ({
      pickup: { id, name: 'Cantiere ' + id, municipality: 'Chieti', status: 'Active' },
      delivery: null,
      dayPrice: 30,
      nightPrice: null,
      nightCallFee: null,
      minimumRule: null,
      minimumAmount: null,
      minimumThreshold: null,
      minimumOveragePrice: null,
    });
    const pairOf = (id: string): ContractLocationRate => ({
      ...rateOf(id),
      delivery: { id: 'd' + id, name: 'Discarica', municipality: 'Lanciano', status: 'Active' },
    });
    const element = await answer(await render(), customer, [
      contract({ id: 'a', billingLevel: 'PerPickupLocation', locationRates: [rateOf('1')] }),
      contract({
        id: 'b',
        billingLevel: 'PerDeliveryLocation',
        locationRates: [rateOf('1'), rateOf('2'), rateOf('3')],
      }),
      contract({ id: 'c', billingLevel: 'PerLocationPair', locationRates: [pairOf('1')] }),
      contract({
        id: 'd',
        billingLevel: 'PerLocationPair',
        locationRates: [pairOf('1'), pairOf('2')],
      }),
      contract({ id: 'e', dayPrice: 30 }),
      contract({ id: 'f', billingLevel: 'PerLocationPair' }),
    ]);

    const rate = (row: number) => cells(element, row)[4];
    expect([0, 1, 2, 3, 4, 5].map((row) => text(rate(row)))).toEqual([
      '1 luogo',
      '3 luoghi',
      '1 coppia',
      '2 coppie',
      '30,00 €/h',
      '—',
    ]);
    expect(rate(0).classList.contains('pt-muted')).toBe(false);
    expect(rate(5).classList.contains('pt-muted')).toBe(true);
  });

  it('the "Tariffa" column shows the contract day price only, even when the contract has vehicle rates', async () => {
    const element = await answer(await render(), customer, [
      contract({
        id: 'a',
        pricingMode: 'ByHour',
        dayPrice: 30,
        vehicleRates: [
          {
            vehicleId: 'v1',
            licensePlate: 'AB123CD',
            description: 'Autospurgo Scania P410',
            vehicleStatus: 'Active',
            pickup: null,
            delivery: null,
            dayPrice: 55,
            nightPrice: null,
            nightCallFee: null,
            minimumRule: 'None',
            minimumAmount: null,
            minimumThreshold: null,
            minimumOveragePrice: null,
          },
        ],
      }),
    ]);

    expect(text(cells(element, 0)[4])).toBe('30,00 €/h');
  });

  it('the "Tariffa" column of a location contract with vehicle rates still counts its locations and pairs', async () => {
    const rateOf = (id: string, deliveryId: string | null): ContractLocationRate => ({
      pickup: { id, name: 'Cantiere ' + id, municipality: 'Chieti', status: 'Active' },
      delivery:
        deliveryId === null
          ? null
          : { id: deliveryId, name: 'Discarica', municipality: 'Lanciano', status: 'Active' },
      dayPrice: 30,
      nightPrice: null,
      nightCallFee: null,
      minimumRule: null,
      minimumAmount: null,
      minimumThreshold: null,
      minimumOveragePrice: null,
    });
    const vehicleOn = (place: ContractLocationRate) => ({
      ...place,
      vehicleId: 'v1',
      licensePlate: 'AB123CD',
      description: 'Autospurgo Scania P410',
      vehicleStatus: 'Active' as const,
      dayPrice: 55,
    });
    const single = [rateOf('1', null), rateOf('2', null)];
    const pairs = [rateOf('1', 'd1'), rateOf('2', 'd2'), rateOf('3', 'd3')];
    const element = await answer(await render(), customer, [
      contract({
        id: 'a',
        billingLevel: 'PerPickupLocation',
        locationRates: single,
        vehicleRates: single.map(vehicleOn),
      }),
      contract({
        id: 'b',
        billingLevel: 'PerLocationPair',
        locationRates: pairs,
        vehicleRates: [vehicleOn(pairs[0])],
      }),
    ]);

    expect([0, 1].map((row) => text(cells(element, row)[4]))).toEqual(['2 luoghi', '3 coppie']);
  });

  it('a deactivated customer has a notice on the contracts and "Apri"in place of "Modifica" on each row, with the same link', async () => {
    const element = await answer(await render(), { ...customer, status: 'Deactivated' }, contracts);

    expect(text(element.querySelector('main .pt-notice--info'))).toBe(
      'Il cliente è disattivato: i suoi contratti si possono solo consultare. Riattivalo per aggiungerne o modificarli.',
    );
    const links = Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      row.querySelector('a')!,
    );
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Apri', 'Apri', 'Apri']);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/customers/c1/contracts/k3',
      '/customers/c1/contracts/k2',
      '/customers/c1/contracts/k1',
    ]);
    expect(text(element.querySelector(`[id="${links[1].getAttribute('aria-describedby')}"]`))).toBe(
      'dal 01/04/2026 al 31/12/2026',
    );
  });

  it('a deactivated customer has no "Nuovo contratto", a notice says why, and the contracts are still listed', async () => {
    const element = await answer(await render(), { ...customer, status: 'Deactivated' }, contracts);

    expect(
      Array.from(element.querySelectorAll('main a')).some(
        (a) => a.textContent?.trim() === 'Nuovo contratto',
      ),
    ).toBe(false);
    expect(element.querySelector('main .pt-notice--info')).not.toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(element.querySelector('.pt-topbar__heading .pt-pill')?.textContent?.trim()).toBe(
      'Disattivato',
    );
    expect(buttons(element)).toEqual(['Modifica', 'Riattiva']);
  });

  it('"Modifica" opens the customer dialog on the data, and after the save the page shows the new data', async () => {
    const harness = await render();
    const element = await answer(harness, customer, contracts);

    Array.from(element.querySelectorAll<HTMLButtonElement>('.pt-topbar__actions button'))
      .find((b) => b.textContent?.trim() === 'Modifica')!
      .click();
    harness.detectChanges();
    const dialog = element.querySelector('dialog')!;
    const name = dialog.querySelector<HTMLInputElement>('input')!;
    expect(name.value).toBe('Cantieri Edili Pescara S.r.l.');

    name.value = 'Cantieri Edili Abruzzo S.r.l.';
    name.dispatchEvent(new Event('input'));
    harness.detectChanges();
    dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(harness.fixture);

    const put = http.expectOne((r) => r.url === CUSTOMER_URL && r.method === 'PUT');
    expect(put.request.body.companyName).toBe('Cantieri Edili Abruzzo S.r.l.');
    expect(put.request.body.version).toBe(1);
    put.flush(null, { status: 204, statusText: 'No Content' });
    await settle(harness.fixture);

    http
      .expectOne((r) => r.url === CUSTOMER_URL && r.method === 'GET')
      .flush({ ...customer, companyName: 'Cantieri Edili Abruzzo S.r.l.', version: 2 });
    await settle(harness.fixture);

    expect(element.querySelector('h1')?.textContent).toBe('Cantieri Edili Abruzzo S.r.l.');
    expect(element.querySelector('dialog')).toBeNull();
    expect(TestBed.inject(Toast).current()).toBe(
      'Cliente Cantieri Edili Abruzzo S.r.l. modificato',
    );
  });

  it('after a stale 409 the customer dialog stays open on the old version with the typed name, although the page refetches other data', async () => {
    const harness = await render();
    const element = await answer(harness, customer, contracts);

    Array.from(element.querySelectorAll<HTMLButtonElement>('.pt-topbar__actions button'))
      .find((b) => b.textContent?.trim() === 'Modifica')!
      .click();
    harness.detectChanges();
    const name = element.querySelector<HTMLInputElement>('dialog input')!;
    name.value = 'Cantieri Edili Abruzzo S.r.l.';
    name.dispatchEvent(new Event('input'));
    harness.detectChanges();
    element.querySelector('dialog form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(harness.fixture);

    http
      .expectOne((r) => r.url === CUSTOMER_URL && r.method === 'PUT')
      .flush(
        {
          errorCode: 'Registry.Customer.ConcurrentUpdate',
          detail: 'Il cliente è stato modificato da un altro utente nel frattempo.',
        },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(harness.fixture);
    http
      .expectOne((r) => r.url === CUSTOMER_URL && r.method === 'GET')
      .flush({ ...customer, companyName: 'Altro Nome S.r.l.', version: 2 });
    http.match((r) => r.url === CONTRACTS_URL);
    await settle(harness.fixture);

    expect(element.querySelector('h1')?.textContent).toBe('Altro Nome S.r.l.');
    expect(element.querySelector('dialog')).not.toBeNull();
    expect(element.querySelector<HTMLInputElement>('dialog input')!.value).toBe(
      'Cantieri Edili Abruzzo S.r.l.',
    );
  });

  it('"Disattiva" asks to confirm, and after the confirmation the page shows the new status', async () => {
    const harness = await render();
    const element = await answer(harness, customer, contracts);

    Array.from(element.querySelectorAll<HTMLButtonElement>('.pt-topbar__actions button'))
      .find((b) => b.textContent?.trim() === 'Disattiva')!
      .click();
    harness.detectChanges();
    const dialog = element.querySelector('dialog')!;
    expect(dialog.textContent).toContain('Disattivare il cliente Cantieri Edili Pescara S.r.l.?');

    dialog.querySelectorAll<HTMLButtonElement>('.pt-dialog__actions button')[1].click();
    await settle(harness.fixture);
    const post = http.expectOne(`${CUSTOMER_URL}/deactivate`);
    post.flush(null, { status: 204, statusText: 'No Content' });
    await settle(harness.fixture);
    http
      .expectOne((r) => r.url === CUSTOMER_URL && r.method === 'GET')
      .flush({ ...customer, status: 'Deactivated', version: 2 });
    await settle(harness.fixture);

    expect(element.querySelector('.pt-topbar__heading .pt-pill')?.textContent?.trim()).toBe(
      'Disattivato',
    );
    expect(buttons(element)).toEqual(['Modifica', 'Riattiva']);
  });

  it('after a stale 409 on "Disattiva" the dialog stays on the old version, and a second confirmation sends that version', async () => {
    const harness = await render();
    const element = await answer(harness, customer, contracts);

    Array.from(element.querySelectorAll<HTMLButtonElement>('.pt-topbar__actions button'))
      .find((b) => b.textContent?.trim() === 'Disattiva')!
      .click();
    harness.detectChanges();
    const confirm = () =>
      element
        .querySelector('dialog')!
        .querySelectorAll<HTMLButtonElement>('.pt-dialog__actions button')[1]
        .click();
    confirm();
    await settle(harness.fixture);
    http.expectOne(`${CUSTOMER_URL}/deactivate`).flush(
      {
        errorCode: 'Registry.Customer.ConcurrentUpdate',
        detail: 'Il cliente è stato modificato da un altro utente nel frattempo.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await settle(harness.fixture);
    http
      .expectOne((r) => r.url === CUSTOMER_URL && r.method === 'GET')
      .flush({ ...customer, companyName: 'Altro Nome S.r.l.', version: 2 });
    http.match((r) => r.url === CONTRACTS_URL);
    await settle(harness.fixture);

    expect(element.querySelector('h1')?.textContent).toBe('Altro Nome S.r.l.');
    expect(element.querySelector('dialog')!.textContent).toContain(
      'Disattivare il cliente Cantieri Edili Pescara S.r.l.?',
    );
    confirm();
    await settle(harness.fixture);
    const second = http.expectOne(`${CUSTOMER_URL}/deactivate`);
    expect(second.request.body.version).toBe(1);
    second.flush(null, { status: 204, statusText: 'No Content' });
    http.match(() => true);
  });

  it('"Riattiva" reactivates at once and the page shows the new status, on the same button that keeps the focus', async () => {
    const harness = await render();
    const element = await answer(harness, { ...customer, status: 'Deactivated' }, contracts);

    const reactivate = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.pt-topbar__actions button'),
    ).find((b) => b.textContent?.trim() === 'Riattiva')!;
    reactivate.focus();
    reactivate.click();
    await settle(harness.fixture);
    http
      .expectOne(`${CUSTOMER_URL}/reactivate`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await settle(harness.fixture);
    http
      .expectOne((r) => r.url === CUSTOMER_URL && r.method === 'GET')
      .flush({ ...customer, version: 3 });
    await settle(harness.fixture);

    expect(element.querySelector('.pt-topbar__heading .pt-pill')?.textContent?.trim()).toBe(
      'Attivo',
    );
    expect(buttons(element)).toEqual(['Modifica', 'Disattiva']);
    expect(reactivate.isConnected).toBe(true);
    expect(reactivate.textContent?.trim()).toBe('Disattiva');
    expect(document.activeElement).toBe(reactivate);
  });
});
