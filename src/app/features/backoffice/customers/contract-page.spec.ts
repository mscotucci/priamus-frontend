import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Layout } from '../../../core/layout/layout';
import { Toast } from '../../../core/toast/toast';
import { stubModalDialog, stubScrollIntoView } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { LeaveConfirmation } from '../../../shared/guards/leave-confirmation';
import { unsavedChangesGuard } from '../../../shared/guards/unsaved-changes-guard';
import { ContractPage } from './contract-page';
import type { Contract, ContractLocationRate, ContractVehicleRate } from './contracts-api';
import type { CustomerListItem } from './customers-api';
import { CustomersFacade } from './customers-facade';
import { LocationsFacade } from '../locations/locations-facade';

const CUSTOMER_URL = '/api/registry/customers/c1';
const CONTRACTS_URL = '/api/registry/customers/c1/contracts';
const CONTRACT_URL = '/api/registry/customers/c1/contracts/k1';

const customer: CustomerListItem = {
  id: 'c1',
  companyName: 'Cantieri Edili Pescara S.r.l.',
  vatNumber: '01873420689',
  taxCode: null,
  address: null,
  status: 'Active',
  lastModifiedAt: '2026-05-14T12:00:00Z',
  version: 1,
};

const existing: Contract = {
  id: 'k1',
  customerId: 'c1',
  validFrom: '2026-04-01',
  validTo: '2027-03-31',
  status: 'Current',
  billingLevel: 'PerPickupLocation',
  pricingMode: 'ByHour',
  requiredDocuments: ['DeliveryNote', 'DailySummary'],
  nightSurcharge: true,
  dayPrice: null,
  nightPrice: null,
  nightCallFee: null,
  minimumRule: null,
  minimumAmount: null,
  minimumThreshold: null,
  minimumOveragePrice: null,
  vehicleRates: [],
  locationRates: [
    {
      pickup: { id: 'l1', name: 'Cantiere A14', municipality: 'Chieti Scalo', status: 'Active' },
      delivery: null,
      dayPrice: 30,
      nightPrice: 42,
      nightCallFee: 35,
      minimumRule: 'None',
      minimumAmount: null,
      minimumThreshold: null,
      minimumOveragePrice: null,
    },
  ],
  version: 3,
};

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

interface Harness {
  fixture: ComponentFixture<Host>;
  element: HTMLElement;
  page: () => ContractPage;
}

describe('ContractPage', () => {
  let http: HttpTestingController;

  /** Holds the navigation to the customer page back until it is resolved. */
  let gate: Promise<boolean>;

  const render = async (url: string): Promise<Harness> => {
    gate = Promise.resolve(true);
    stubModalDialog();
    stubScrollIntoView();
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        CustomersFacade,
        LocationsFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'customers/:customerId', component: Host, canActivate: [() => gate] },
          {
            path: 'customers/:customerId/contracts/new',
            component: ContractPage,
            canDeactivate: [unsavedChangesGuard],
          },
          {
            path: 'customers/:customerId/contracts/:contractId',
            component: ContractPage,
            canDeactivate: [unsavedChangesGuard],
          },
        ]),
        { provide: Layout, useValue: { openDrawer: () => undefined } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(Host);
    void TestBed.inject(Router).navigateByUrl(url);
    await settle(fixture);
    return {
      fixture,
      element: fixture.nativeElement as HTMLElement,
      page: () => fixture.debugElement.query(By.directive(ContractPage)).componentInstance,
    };
  };

  const openNew = async () => {
    const harness = await render('/customers/c1/contracts/new');
    http.expectOne(CUSTOMER_URL).flush(customer);
    http.expectOne(CONTRACTS_URL).flush([]);
    await settle(harness.fixture);
    return harness;
  };

  const openExisting = async (contract: Contract = existing) => {
    const harness = await render('/customers/c1/contracts/k1');
    http.expectOne(CUSTOMER_URL).flush(customer);
    http.expectOne(CONTRACTS_URL).flush([]);
    http.expectOne(CONTRACT_URL).flush(contract);
    await settle(harness.fixture);
    return harness;
  };

  const text = (element: Element | null | undefined) =>
    element?.textContent?.replace(/\s+/g, ' ').trim();

  const questions = (harness: Harness) =>
    Array.from(harness.element.querySelectorAll('.pt-question'));

  const titles = (harness: Harness) => questions(harness).map((q) => text(q.querySelector('h3')));

  const saveButtons = (harness: Harness) =>
    Array.from(harness.element.querySelectorAll<HTMLButtonElement>('button')).filter(
      (b) => b.textContent?.trim() === 'Salva contratto',
    );

  const click = async (harness: Harness, element: Element | null | undefined) => {
    (element as HTMLElement).click();
    await settle(harness.fixture);
  };

  const buttonIn = (root: Element, label: string) =>
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === label);

  /** Picks the choice titled `title` in the open question. */
  const choose = async (harness: Harness, title: string) => {
    const label = Array.from(
      harness.element.querySelectorAll('.pt-question[aria-current="step"] .pt-choice'),
    ).find((l) => text(l.querySelector('strong')) === title);
    await click(harness, label?.querySelector('input'));
  };

  /** Changes a term of a location contract without breaking its answers: ticks "formulario rifiuti" in question 9. */
  const addWasteForm = async (harness: Harness) => {
    await click(harness, buttonIn(questions(harness)[7], 'Modifica'));
    await click(harness, harness.element.querySelectorAll('input[type="checkbox"]')[2]);
    await click(harness, buttonIn(questions(harness)[7], 'Conferma selezione'));
  };

  /** Saves a contract in force with changed terms: corrects it in place through the dialog. */
  const saveInPlace = async (harness: Harness, button = 0) => {
    await click(harness, saveButtons(harness)[button]);
    const dialog = harness.element.querySelector('dialog')!;
    await click(harness, dialog.querySelectorAll('input[name="change-scope"]')[1]);
    await click(harness, buttonIn(dialog, 'Salva'));
  };

  const confirmValidity = async (harness: Harness, from: string, to = '') => {
    const set = (id: string, value: string) => {
      const input = harness.element.querySelector<HTMLInputElement>(id)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('#contract-from', from);
    set('#contract-to', to);
    await click(harness, buttonIn(harness.element, 'Conferma'));
  };

  /** Types `value` in the field with `id`, as the user would. */
  const type = (harness: Harness, id: string, value: string) => {
    const input = harness.element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  /** Answers question 6 with a day price only (the contract has no night surcharge). */
  const answerRate = async (harness: Harness, day = '30') => {
    type(harness, 'rate-day', day);
    await click(harness, buttonIn(harness.element, 'Conferma'));
  };

  /** Answers question 7 with "Nessun minimo". */
  const answerNoMinimum = async (harness: Harness) => {
    await choose(harness, 'Nessun minimo');
    await click(harness, buttonIn(harness.element, 'Conferma'));
  };

  /** Answers question 8 with "No": no vehicle has a rate of its own. */
  const answerNoVehicleRates = async (harness: Harness) => {
    await choose(harness, 'No');
  };

  /** Answers every question of a new contract the shortest way. */
  const answerAll = async (harness: Harness) => {
    await confirmValidity(harness, '2027-01-01');
    await choose(harness, 'No');
    await choose(harness, 'A ore');
    await choose(harness, 'No');
    await answerRate(harness);
    await answerNoMinimum(harness);
    await answerNoVehicleRates(harness);
    await click(harness, buttonIn(harness.element, 'Conferma selezione'));
  };

  it('a new contract shows the breadcrumb up to the customer, the title "Nuovo contratto", no status pill and "Annulla" and a disabled "Salva contratto"', async () => {
    const harness = await openNew();

    const items = Array.from(harness.element.querySelectorAll('.pt-breadcrumb li'));
    expect(items.map((li) => text(li))).toEqual([
      'Anagrafiche',
      'Clienti',
      'Cantieri Edili Pescara S.r.l.',
    ]);
    expect(items.map((li) => li.querySelector('a')?.getAttribute('href') ?? null)).toEqual([
      null,
      '/customers',
      '/customers/c1',
    ]);
    expect(text(harness.element.querySelector('h1'))).toBe('Nuovo contratto');
    expect(harness.element.querySelector('.pt-topbar__heading .pt-pill')).toBeNull();
    const actions = harness.element.querySelector('.pt-topbar__actions')!;
    const cancel = Array.from(actions.querySelectorAll('a')).find(
      (a) => a.textContent?.trim() === 'Annulla',
    );
    expect(cancel?.getAttribute('href')).toBe('/customers/c1');
    expect(saveButtons(harness)[0].disabled).toBe(true);
  });

  it('a new contract of a deactivated customer asks no question: the notice says why and "Salva contratto" stays disabled', async () => {
    const harness = await render('/customers/c1/contracts/new');
    http.expectOne(CUSTOMER_URL).flush({ ...customer, status: 'Deactivated' });
    http.expectOne(CONTRACTS_URL).flush([]);
    await settle(harness.fixture);

    expect(questions(harness)).toHaveLength(0);
    expect(text(harness.element.querySelector('main .pt-notice--info'))).toBe(
      'Il cliente è disattivato: non si possono aggiungere contratti. Riattivalo per aggiungerne uno.',
    );
    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
  });

  it('an editable contract tells the page keys under the introduction; a read-only one does not', async () => {
    const editable = await openNew();
    expect(
      Array.from(editable.element.querySelector('[data-page-keys]')!.children, (group) =>
        text(group),
      ),
    ).toEqual(['Da un «Modifica»:', "↑ ↓ passa a un'altra domanda", 'Invio modifica']);
  });

  it('a read-only contract does not tell the page keys', async () => {
    const readOnly = await render('/customers/c1/contracts/k1');
    http.expectOne(CUSTOMER_URL).flush({ ...customer, status: 'Deactivated' });
    http.expectOne(CONTRACTS_URL).flush([]);
    http.expectOne(CONTRACT_URL).flush(existing);
    await settle(readOnly.fixture);
    expect(readOnly.element.querySelector('[data-page-keys]')).toBeNull();
  });

  it('the contract of a deactivated customer is read-only: answers without "Modifica", no save or "Annulla", the notice says why', async () => {
    const harness = await render('/customers/c1/contracts/k1');
    http.expectOne(CUSTOMER_URL).flush({ ...customer, status: 'Deactivated' });
    http.expectOne(CONTRACTS_URL).flush([]);
    http.expectOne(CONTRACT_URL).flush(existing);
    await settle(harness.fixture);

    expect(text(harness.element.querySelector('main > .pt-notice--info'))).toBe(
      'Il cliente è disattivato: il contratto si può solo consultare. Riattivalo per modificarlo.',
    );
    expect(questions(harness)).toHaveLength(8);
    expect(questions(harness).every((q) => q.classList.contains('pt-question--answered'))).toBe(
      true,
    );
    expect(questions(harness).every((q) => buttonIn(q, 'Modifica') === undefined)).toBe(true);
    expect(saveButtons(harness)).toHaveLength(0);
    expect(
      harness.element.querySelectorAll('.pt-topbar__actions a, .pt-topbar__actions button'),
    ).toHaveLength(0);
    expect(harness.element.querySelector('main > section.pt-card')).toBeNull();
  });

  it('the top bar shows "Annulla" and "Salva contratto" only once the page is loaded', async () => {
    const harness = await render('/customers/c1/contracts/k1');
    const actions = () =>
      harness.element.querySelectorAll('.pt-topbar__actions a, .pt-topbar__actions button');

    expect(actions()).toHaveLength(0);

    http.expectOne(CUSTOMER_URL).flush(customer);
    http.expectOne(CONTRACTS_URL).flush([]);
    await settle(harness.fixture);
    expect(actions()).toHaveLength(0);

    http.expectOne(CONTRACT_URL).flush(existing);
    await settle(harness.fixture);
    expect(Array.from(actions()).map((a) => text(a))).toEqual(['Annulla', 'Salva contratto']);
  });

  it('the contract of an active customer shows no read-only notice and keeps "Modifica"', async () => {
    const harness = await openExisting();

    expect(harness.element.querySelector('main > .pt-notice--info')).toBeNull();
    expect(buttonIn(questions(harness)[0], 'Modifica')).toBeDefined();
  });

  it('a new contract asks no question until the customer is read', async () => {
    const harness = await render('/customers/c1/contracts/new');

    expect(questions(harness)).toHaveLength(0);
    expect(harness.element.querySelector('main .pt-spinner')).not.toBeNull();
    http.expectOne(CUSTOMER_URL).flush(customer);
    http.expectOne(CONTRACTS_URL).flush([]);
    await settle(harness.fixture);
    expect(questions(harness)).toHaveLength(1);
  });

  it('an answer moves the focus to the next step, then to the final "Salva contratto"; "Modifica" moves it into the reopened question', async () => {
    const harness = await openNew();
    const current = () => harness.element.querySelector('.pt-question[aria-current="step"]');

    buttonIn(harness.element, 'Conferma')!.focus();
    await confirmValidity(harness, '2027-01-01');
    expect(current()?.contains(document.activeElement)).toBe(true);

    await choose(harness, 'No');
    await choose(harness, 'A ore');
    await choose(harness, 'No');
    expect(current()?.contains(document.activeElement)).toBe(true);
    await answerRate(harness);
    expect(current()?.contains(document.activeElement)).toBe(true);
    await answerNoMinimum(harness);
    expect(current()?.contains(document.activeElement)).toBe(true);
    await answerNoVehicleRates(harness);
    await click(harness, buttonIn(harness.element, 'Conferma selezione'));
    const finalSave = saveButtons(harness)[1];
    expect(document.activeElement).toBe(finalSave);

    const modify = buttonIn(questions(harness)[2], 'Modifica')!;
    modify.focus();
    await click(harness, modify);
    expect(document.activeElement).toBe(current()?.querySelector('input:checked'));
  });

  it('an existing contract has the title "Contratto" under the same breadcrumb, and its status pill', async () => {
    const harness = await openExisting();

    expect(text(harness.element.querySelector('h1'))).toBe('Contratto');
    expect(text(harness.element.querySelector('.pt-breadcrumb li:last-child'))).toBe(
      'Cantieri Edili Pescara S.r.l.',
    );
    const pill = harness.element.querySelector('.pt-topbar__heading .pt-pill')!;
    expect(pill.textContent?.trim()).toBe('In vigore');
    expect(pill.classList.contains('pt-pill--success')).toBe(true);
  });

  it('a new contract shows only question 1, and each question appears when the previous one is answered', async () => {
    const harness = await openNew();

    expect(titles(harness)).toEqual(['Da quando vale il contratto?']);

    await confirmValidity(harness, '2027-01-01');
    expect(titles(harness)).toEqual([
      'Da quando vale il contratto?',
      'La fatturazione prevede luoghi obbligatori?',
    ]);

    await choose(harness, 'No');
    expect(titles(harness)).toEqual([
      'Da quando vale il contratto?',
      'La fatturazione prevede luoghi obbligatori?',
      'Modalità di pagamento',
    ]);
  });

  it('an answered question collapses to its answer with "Modifica", which reopens it', async () => {
    const harness = await openNew();
    await confirmValidity(harness, '2027-01-01');
    await choose(harness, 'No');

    const second = questions(harness)[1];
    expect(second.getAttribute('aria-current')).toBeNull();
    expect(second.classList.contains('pt-question--answered')).toBe(true);
    expect(text(second.querySelector('.pt-question__answer'))).toBe('Nessun luogo obbligatorio');
    expect(second.querySelector('.pt-choice')).toBeNull();

    await click(harness, buttonIn(second, 'Modifica'));

    const reopened = questions(harness)[1];
    expect(reopened.getAttribute('aria-current')).toBe('step');
    expect(reopened.querySelectorAll('.pt-choice').length).toBe(2);
    expect(
      reopened.querySelector<HTMLInputElement>('input:checked')?.closest('label')?.textContent,
    ).toContain('No');
  });

  it('an existing contract starts with every question collapsed to its answer', async () => {
    const harness = await openExisting();

    expect(questions(harness).length).toBe(8);
    expect(questions(harness).every((q) => q.classList.contains('pt-question--answered'))).toBe(
      true,
    );
    expect(harness.element.querySelector('[aria-current="step"]')).toBeNull();
    expect(questions(harness).map((q) => text(q.querySelector('.pt-question__answer')))).toEqual([
      'dal 01/04/2026 al 31/03/2027',
      'Luoghi obbligatori',
      'Solo il luogo di partenza',
      'Pagamento a ore',
      'Maggiorazione notturna',
      '1 luogo con tariffa Cantiere A14, Chieti Scalo · 30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 € · nessun minimo',
      'Stessa tariffa per tutti i mezzi',
      'DDT, riepilogo di fine giornata',
    ]);
  });

  it('confirming an end before the start shows a message under "Al" and keeps question 1 open', async () => {
    const harness = await openNew();

    await confirmValidity(harness, '2027-01-10', '2027-01-09');

    const error = harness.element.querySelector('#contract-to-error')!;
    expect(error.textContent?.trim()).toBe(
      'La data di fine non può essere precedente alla data di inizio.',
    );
    expect(harness.element.querySelector('#contract-to')?.getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(titles(harness).length).toBe(1);

    await confirmValidity(harness, '2027-01-10', '2027-01-10');
    expect(titles(harness).length).toBe(2);
  });

  it('confirming without "Dal" shows a message under "Dal"', async () => {
    const harness = await openNew();

    await confirmValidity(harness, '');

    expect(harness.element.querySelector('#contract-from-error')?.textContent?.trim()).toBe(
      'Inserisci la data di inizio.',
    );
    expect(titles(harness).length).toBe(1);
  });

  it('question 3 appears only when question 2 is "Sì", and the billing level is derived from the answers', async () => {
    const cases: [string | null, string | null, string | null][] = [
      ['No', null, 'FlatRate'],
      ['Sì', 'Solo partenza', 'PerPickupLocation'],
      ['Sì', 'Solo consegna', 'PerDeliveryLocation'],
      ['Sì', 'Entrambi', 'PerLocationPair'],
      ['Sì', null, null],
    ];
    for (const [locations, which, billing] of cases) {
      TestBed.resetTestingModule();
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, locations!);
      const asked = titles(harness).includes('Quali luoghi sono obbligatori?');
      if (which) {
        await choose(harness, which);
      }

      expect(asked).toBe(locations === 'Sì');
      expect(harness.page().billingLevel()).toBe(billing);
    }
  });

  it('the pricing modes, the night choice and the four documents are offered in the order of the questions', async () => {
    const harness = await openNew();
    await confirmValidity(harness, '2027-01-01');
    await choose(harness, 'No');

    const open = () =>
      Array.from(
        harness.element.querySelectorAll('.pt-question[aria-current="step"] .pt-choice strong'),
      ).map((s) => s.textContent);
    expect(open()).toEqual(['A ore', 'A peso', 'A km', 'A viaggio']);
    await choose(harness, 'A km');
    expect(open()).toEqual(['No', 'Sì']);
    await choose(harness, 'No');
    await answerRate(harness);
    expect(open()).toEqual(['Nessun minimo', 'Minimo fisso', 'Scaglione con eccesso']);
    await answerNoMinimum(harness);
    expect(open()).toEqual(['No', 'Sì']);
    await answerNoVehicleRates(harness);
    expect(open()).toEqual([
      'DDT (Documento di Trasporto)',
      'Bolla di consegna',
      'Formulario rifiuti (FIR)',
      'Riepilogo fine giornata',
    ]);
  });

  it('setting question 2 to "No" removes question 3 and its answer and keeps every other answer', async () => {
    const harness = await openExisting();

    await click(harness, buttonIn(questions(harness)[1], 'Modifica'));
    await choose(harness, 'No');

    expect(titles(harness)).not.toContain('Quali luoghi sono obbligatori?');
    expect(harness.page().billingLevel()).toBe('FlatRate');
    expect(questions(harness).map((q) => text(q.querySelector('.pt-question__answer')))).toEqual([
      'dal 01/04/2026 al 31/03/2027',
      'Nessun luogo obbligatorio',
      'Pagamento a ore',
      'Maggiorazione notturna',
      undefined,
      'DDT, riepilogo di fine giornata',
    ]);

    await click(harness, buttonIn(questions(harness)[1], 'Modifica'));
    await choose(harness, 'Sì');
    expect(questions(harness)[2].getAttribute('aria-current')).toBe('step');
    expect(harness.page().billingLevel()).toBeNull();
  });

  it('changing the pricing mode of an existing contract keeps the other answers', async () => {
    const harness = await openExisting();

    await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
    await choose(harness, 'A viaggio');

    expect(questions(harness).map((q) => text(q.querySelector('.pt-question__answer')))).toEqual([
      'dal 01/04/2026 al 31/03/2027',
      'Luoghi obbligatori',
      'Solo il luogo di partenza',
      'Pagamento a viaggio',
      'Maggiorazione notturna',
      undefined,
      'DDT, riepilogo di fine giornata',
    ]);
  });

  it('"Salva contratto" is disabled until every shown question has an answer, in the top bar and in the closing card', async () => {
    const harness = await openNew();
    await confirmValidity(harness, '2027-01-01');
    await choose(harness, 'No');
    await choose(harness, 'A ore');
    await choose(harness, 'No');

    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
    expect(harness.element.querySelector('main section.pt-card')).toBeNull();

    await answerRate(harness);
    await answerNoMinimum(harness);
    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
    await answerNoVehicleRates(harness);
    await click(harness, buttonIn(harness.element, 'Conferma selezione'));

    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([false, false]);
    expect(text(harness.element.querySelector('main > section.pt-card .pt-title'))).toBe(
      'Configurazione completata',
    );
  });

  it('answering "Sì" to question 2 without question 3 keeps "Salva contratto" disabled, and an existing contract has it enabled', async () => {
    const harness = await openExisting();
    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([false, false]);

    await click(harness, buttonIn(questions(harness)[1], 'Modifica'));
    await choose(harness, 'No');
    await click(harness, buttonIn(questions(harness)[1], 'Modifica'));
    await choose(harness, 'Sì');

    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
  });

  it('confirming with no document ticked means no required document and the answer reads "Nessuno"', async () => {
    const harness = await openNew();
    await answerAll(harness);

    const last = questions(harness).at(-1)!;
    expect(last.classList.contains('pt-question--answered')).toBe(true);
    expect(text(last.querySelector('.pt-question__answer'))).toBe('Nessuno');
    expect(saveButtons(harness)[0].disabled).toBe(false);
  });

  it('question 6 lists the four documents as checkboxes, in the fixed order, and the confirmed ones are summarised', async () => {
    const harness = await openNew();
    await confirmValidity(harness, '2027-01-01');
    await choose(harness, 'No');
    await choose(harness, 'A ore');
    await choose(harness, 'No');
    await answerRate(harness);
    await answerNoMinimum(harness);
    await answerNoVehicleRates(harness);

    const boxes = harness.element.querySelectorAll<HTMLInputElement>(
      '.pt-question[aria-current="step"] input[type="checkbox"]',
    );
    expect(boxes.length).toBe(4);
    expect(harness.element.querySelectorAll('input[type="checkbox"]').length).toBe(4);
    expect(
      harness.element.querySelector('.pt-question[aria-current="step"] fieldset legend'),
    ).not.toBeNull();
    await click(harness, boxes[3]);
    await click(harness, boxes[0]);
    await click(harness, buttonIn(harness.element, 'Conferma selezione'));

    expect(text(questions(harness).at(-1)!.querySelector('.pt-question__answer'))).toBe(
      'DDT, riepilogo di fine giornata',
    );
  });

  it('the questions use pt-question and pt-choice, the active one marked aria-current="step" and an answered one pt-question--answered with a numbered badge', async () => {
    const harness = await openNew();
    await confirmValidity(harness, '2027-01-01');

    const [first, second] = questions(harness);
    expect(first.classList.contains('pt-question--answered')).toBe(true);
    expect(first.querySelector('.pt-question__number')?.textContent).toBe('1');
    expect(first.querySelector('.pt-question__answer app-icon')).not.toBeNull();
    expect(second.getAttribute('aria-current')).toBe('step');
    expect(second.querySelector('.pt-question__number')?.textContent).toBe('2');
    const choices = second.querySelectorAll('.pt-choice');
    expect(choices.length).toBe(2);
    expect(text(choices[1].querySelector('.pt-choice__hint'))).toBe('Tariffe per luogo');
    expect(choices[0].querySelector('input')?.getAttribute('type')).toBe('radio');
    expect(text(second.querySelector('fieldset > legend'))).toBe(
      'La fatturazione prevede luoghi obbligatori?',
    );
  });

  it('"Modifica" on question 1 resets the dates to the confirmed ones', async () => {
    const harness = await openExisting();
    await click(harness, buttonIn(questions(harness)[0], 'Modifica'));
    const from = harness.element.querySelector<HTMLInputElement>('#contract-from')!;
    from.value = '2026-06-01';
    from.dispatchEvent(new Event('input'));
    await settle(harness.fixture);

    await click(harness, buttonIn(questions(harness)[1], 'Modifica'));
    await click(harness, buttonIn(questions(harness)[0], 'Modifica'));

    expect(harness.element.querySelector<HTMLInputElement>('#contract-from')!.value).toBe(
      '2026-04-01',
    );
    expect(harness.element.querySelector<HTMLInputElement>('#contract-to')!.value).toBe(
      '2027-03-31',
    );
  });

  it('"Modifica" on question 6 resets unconfirmed ticks to the confirmed set', async () => {
    const harness = await openExisting();
    await click(harness, buttonIn(questions(harness)[7], 'Modifica'));
    const boxes = () =>
      Array.from(harness.element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).map(
        (b) => b.checked,
      );
    expect(boxes()).toEqual([true, false, false, true]);
    await click(harness, harness.element.querySelectorAll('input[type="checkbox"]')[1]);
    expect(boxes()).toEqual([true, true, false, true]);

    await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
    await click(harness, buttonIn(questions(harness)[7], 'Modifica'));

    expect(boxes()).toEqual([true, false, false, true]);
  });

  it('picking an answer does not close another question that is being reopened', async () => {
    const harness = await openExisting();
    await click(harness, buttonIn(questions(harness)[7], 'Modifica'));

    const page = harness.page() as unknown as {
      radioQuestions: { choices: unknown[] }[];
      pick: (question: unknown, choice: unknown) => void;
    };
    const mode = page.radioQuestions[2];
    page.pick(mode, mode.choices[3]);
    await settle(harness.fixture);

    expect(questions(harness)[6].getAttribute('aria-current')).toBe('step');
  });

  it('only one question is the current step: the reopened one, even while another is unanswered', async () => {
    const harness = await openNew();
    await confirmValidity(harness, '2027-01-01');
    await choose(harness, 'Sì');
    expect(questions(harness).map((q) => q.getAttribute('aria-current'))).toEqual([
      null,
      null,
      'step',
    ]);

    await click(harness, buttonIn(questions(harness)[0], 'Modifica'));

    expect(questions(harness).map((q) => q.getAttribute('aria-current'))).toEqual([
      'step',
      null,
      null,
    ]);
    expect(questions(harness)[2].querySelectorAll('.pt-choice').length).toBe(3);

    await confirmValidity(harness, '2027-01-02');
    expect(questions(harness).map((q) => q.getAttribute('aria-current'))).toEqual([
      null,
      null,
      'step',
    ]);
  });

  it('the answers of an existing contract are taken once: a reload of the contract does not wipe the changes', async () => {
    const harness = await openExisting();
    await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
    await choose(harness, 'A km');

    TestBed.inject(CustomersFacade).reloadContract();
    await settle(harness.fixture);
    http.expectOne(CONTRACT_URL).flush({ ...existing, version: 4, pricingMode: 'ByWeight' });
    await settle(harness.fixture);

    expect(text(questions(harness)[3].querySelector('.pt-question__answer'))).toBe(
      'Pagamento a km',
    );
  });

  it('a contract that does not exist shows the not-found state and no questions', async () => {
    const harness = await render('/customers/c1/contracts/k1');
    http.expectOne(CUSTOMER_URL).flush(customer);
    http.expectOne(CONTRACTS_URL).flush([]);
    http.expectOne(CONTRACT_URL).flush(null, { status: 404, statusText: 'Not Found' });
    await settle(harness.fixture);

    expect(text(harness.element.querySelector('.pt-empty .pt-title'))).toBe(
      'Contratto non trovato',
    );
    expect(questions(harness).length).toBe(0);
  });

  it('while the contract loads a loading indicator is shown, and a failed read offers "Riprova"', async () => {
    const harness = await render('/customers/c1/contracts/k1');
    http.expectOne(CUSTOMER_URL).flush(customer);
    http.expectOne(CONTRACTS_URL).flush([]);
    await settle(harness.fixture);

    expect(questions(harness).length).toBe(0);

    http.expectOne(CONTRACT_URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle(harness.fixture);
    const retry = buttonIn(harness.element.querySelector('main')!, 'Riprova')!;
    await click(harness, retry);
    http.expectOne(CONTRACT_URL).flush(existing);
    await settle(harness.fixture);
    expect(questions(harness).length).toBe(8);
  });

  const contractsWithOpen: Contract[] = [{ ...existing, validTo: null }];

  const notice = (harness: Harness) => text(harness.element.querySelector('main > app-notice'));

  const lastPost = () =>
    http.expectOne((request) => request.url === CONTRACTS_URL && request.method === 'POST');

  it('a new contract starting after the open contract warns under question 1 that it will be closed the day before, with no dialog', async () => {
    const harness = await render('/customers/c1/contracts/new');
    http.expectOne(CUSTOMER_URL).flush(customer);
    http.expectOne(CONTRACTS_URL).flush(contractsWithOpen);
    await settle(harness.fixture);

    expect(harness.element.querySelector('.pt-notice--warn')).toBeNull();

    await confirmValidity(harness, '2027-01-01');

    expect(text(questions(harness)[0].querySelector('.pt-notice--warn'))).toBe(
      'Il contratto dal 01/04/2026, senza scadenza, sarà chiuso al 31/12/2026.',
    );
    expect(harness.element.querySelector('[role="dialog"], dialog')).toBeNull();
  });

  it('no warning when the open contract does not start before "Dal"', async () => {
    const harness = await render('/customers/c1/contracts/new');
    http.expectOne(CUSTOMER_URL).flush(customer);
    http.expectOne(CONTRACTS_URL).flush(contractsWithOpen);
    await settle(harness.fixture);

    await confirmValidity(harness, '2026-04-01');

    expect(harness.element.querySelector('.pt-notice--warn')).toBeNull();
  });

  it('saving a new contract posts the answers, shows the toast and returns to the customer page', async () => {
    const harness = await openNew();
    await answerAll(harness);

    await click(harness, saveButtons(harness)[0]);

    const post = lastPost();
    expect(post.request.body).toEqual({
      validFrom: '2027-01-01',
      validTo: null,
      billingLevel: 'FlatRate',
      pricingMode: 'ByHour',
      requiredDocuments: [],
      nightSurcharge: false,
      dayPrice: 30,
      nightPrice: null,
      nightCallFee: null,
      minimumRule: 'None',
      minimumAmount: null,
      minimumThreshold: null,
      minimumOveragePrice: null,
      vehicleRates: [],
      locationRates: [],
    });
    expect(saveButtons(harness).map((b) => [b.disabled, b.textContent?.trim()])).toEqual([]);
    expect(
      Array.from(harness.element.querySelectorAll<HTMLButtonElement>('button'))
        .filter((b) => b.textContent?.trim() === 'Salvataggio in corso…')
        .map((b) => b.disabled),
    ).toEqual([true, true]);
    post.flush({ ...existing, id: 'k2' }, { status: 201, statusText: 'Created' });
    await settle(harness.fixture);
    http.match((request) => request.method === 'GET').forEach((r) => r.flush([]));

    expect(TestBed.inject(Router).url).toBe('/customers/c1');
    expect(TestBed.inject(Toast).current()).toBe('Contratto salvato');
  });

  it('saving an existing contract puts the confirmed answers, the location rates among them, with the version read', async () => {
    const harness = await openExisting();
    await addWasteForm(harness);

    await saveInPlace(harness, 1);

    const put = http.expectOne((request) => request.method === 'PUT');
    expect(put.request.url).toBe(CONTRACT_URL);
    expect(put.request.body).toEqual({
      validFrom: '2026-04-01',
      validTo: '2027-03-31',
      billingLevel: 'PerPickupLocation',
      pricingMode: 'ByHour',
      requiredDocuments: ['DeliveryNote', 'WasteForm', 'DailySummary'],
      nightSurcharge: true,
      dayPrice: null,
      nightPrice: null,
      nightCallFee: null,
      minimumRule: null,
      minimumAmount: null,
      minimumThreshold: null,
      minimumOveragePrice: null,
      vehicleRates: [],
      locationRates: [
        {
          pickupLocationId: 'l1',
          deliveryLocationId: null,
          dayPrice: 30,
          nightPrice: 42,
          nightCallFee: 35,
          minimumRule: 'None',
          minimumAmount: null,
          minimumThreshold: null,
          minimumOveragePrice: null,
        },
      ],
      version: 3,
    });
    put.flush(null, { status: 204, statusText: 'No Content' });
    await settle(harness.fixture);
    http.match((request) => request.method === 'GET').forEach((r) => r.flush([]));
    expect(TestBed.inject(Router).url).toBe('/customers/c1');
  });

  it('"Salva contratto" stays disabled while a question is reopened, and while the contract reloads', async () => {
    const harness = await openExisting();
    await click(harness, buttonIn(questions(harness)[0], 'Modifica'));
    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true, true]);

    await click(harness, buttonIn(questions(harness)[0], 'Conferma'));
    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([false, false]);

    TestBed.inject(CustomersFacade).reloadContract();
    await settle(harness.fixture);
    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true, true]);
    http.expectOne(CONTRACT_URL).flush(existing);
  });

  it('a domain error shows the backend message at the top and keeps every answer', async () => {
    const harness = await openNew();
    await answerAll(harness);
    await click(harness, saveButtons(harness)[0]);

    lastPost().flush(
      {
        errorCode: 'Registry.Contract.Overlap',
        detail: 'La validità si sovrappone al contratto dal 01/01/2027, senza scadenza.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await settle(harness.fixture);
    http.match((request) => request.method === 'GET').forEach((r) => r.flush([]));
    await settle(harness.fixture);

    expect(notice(harness)).toContain(
      'La validità si sovrappone al contratto dal 01/01/2027, senza scadenza.',
    );
    expect(buttonIn(harness.element.querySelector('app-notice')!, 'Ricarica')).toBeUndefined();
    expect(questions(harness).map((q) => text(q.querySelector('.pt-question__answer')))).toEqual([
      'dal 01/01/2027, senza scadenza',
      'Nessun luogo obbligatorio',
      'Pagamento a ore',
      'Nessuna maggiorazione notturna',
      '30,00 €/h',
      'Nessun minimo',
      'Stessa tariffa per tutti i mezzi',
      'Nessuno',
    ]);
    expect(TestBed.inject(Router).url).toBe('/customers/c1/contracts/new');
    expect(TestBed.inject(Toast).current()).toBeNull();
  });

  it('a 400 on "Al" shows the backend message under "Al" and reopens question 1, with no notice at the top', async () => {
    const harness = await openNew();
    await answerAll(harness);
    await click(harness, saveButtons(harness)[0]);

    lastPost().flush(
      { errors: { ValidTo: ['La data di fine precede la data di inizio.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(harness.fixture);

    expect(harness.element.querySelector('main > app-notice')).toBeNull();
    expect(text(harness.element.querySelector('#contract-to-error'))).toBe(
      'La data di fine precede la data di inizio.',
    );
    expect(harness.element.querySelector('#contract-from-error')).toBeNull();
    expect(questions(harness)[0].getAttribute('aria-current')).toBe('step');
  });

  it('a 400 on any other field shows the generic notice at the top', async () => {
    const harness = await openNew();
    await answerAll(harness);
    await click(harness, saveButtons(harness)[0]);

    lastPost().flush(
      { errors: { PricingMode: ['Obbligatorio.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(harness.fixture);

    expect(notice(harness)).not.toBe('');
    expect(notice(harness)).not.toContain('Obbligatorio.');
  });

  it('a 400 with no field named shows the generic notice at the top', async () => {
    const harness = await openNew();
    await answerAll(harness);
    await click(harness, saveButtons(harness)[0]);

    lastPost().flush({ errors: {} }, { status: 400, statusText: 'Bad Request' });
    await settle(harness.fixture);

    expect(notice(harness)).toBe('Si è verificato un errore. Riprova tra poco.');
  });

  it('a new contract whose list of contracts failed to load offers "Riprova" instead of the questions, and warns about the open contract after the retry', async () => {
    const harness = await render('/customers/c1/contracts/new');
    http.expectOne(CUSTOMER_URL).flush(customer);
    http.expectOne(CONTRACTS_URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle(harness.fixture);

    const retry = buttonIn(harness.element.querySelector('main')!, 'Riprova')!;
    expect(retry).toBeDefined();
    expect(questions(harness).length).toBe(0);

    await click(harness, retry);
    http.expectOne(CUSTOMER_URL).flush(customer);
    http.expectOne(CONTRACTS_URL).flush(contractsWithOpen);
    await settle(harness.fixture);

    await confirmValidity(harness, '2027-01-01');
    expect(harness.element.querySelector('.pt-notice--warn')).not.toBeNull();
  });

  it('a stale version shows the backend message with "Ricarica", which reads the contract again and discards the changes', async () => {
    const harness = await openExisting();
    await addWasteForm(harness);
    await saveInPlace(harness);

    http
      .expectOne((request) => request.method === 'PUT')
      .flush(
        {
          errorCode: 'Registry.Contract.ConcurrentUpdate',
          detail: 'Il contratto è stato modificato da un altro utente nel frattempo.',
        },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(harness.fixture);
    http.expectOne((request) => request.url === CONTRACTS_URL).flush([]);
    http
      .expectOne(CONTRACT_URL)
      .flush({ ...existing, version: 4, requiredDocuments: ['DeliveryNote'] });
    await settle(harness.fixture);

    expect(notice(harness)).toContain('Il contratto è stato modificato da un altro utente');
    expect(text(questions(harness)[7].querySelector('.pt-question__answer'))).toBe(
      'DDT, formulario rifiuti, riepilogo di fine giornata',
    );

    await click(harness, buttonIn(harness.element.querySelector('app-notice')!, 'Ricarica'));
    http
      .expectOne(CONTRACT_URL)
      .flush({ ...existing, version: 5, requiredDocuments: ['DeliveryNote'] });
    await settle(harness.fixture);

    expect(harness.element.querySelector('main > app-notice')).toBeNull();
    expect(text(questions(harness)[7].querySelector('.pt-question__answer'))).toBe('DDT');
    expect(questions(harness).every((q) => q.classList.contains('pt-question--answered'))).toBe(
      true,
    );

    await click(harness, saveButtons(harness)[0]);
    const put = http.expectOne((request) => request.method === 'PUT');
    expect((put.request.body as { version: number }).version).toBe(5);
    put.flush(null, { status: 204, statusText: 'No Content' });
    await settle(harness.fixture);
    http.match(() => true);
  });

  it('after a stale 409 the refetched version cannot be sent: Salva stays disabled until "Ricarica"', async () => {
    const harness = await openExisting();
    await addWasteForm(harness);
    await saveInPlace(harness, 0);
    http
      .expectOne((request) => request.method === 'PUT')
      .flush(
        { errorCode: 'Registry.Contract.ConcurrentUpdate', detail: 'Modificato da altri.' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(harness.fixture);
    http.expectOne((request) => request.url === CONTRACTS_URL).flush([]);
    http
      .expectOne(CONTRACT_URL)
      .flush({ ...existing, version: 4, requiredDocuments: ['DeliveryNote'] });
    await settle(harness.fixture);

    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true, true]);
    await click(harness, saveButtons(harness)[0]);
    http.expectNone((request) => request.method === 'PUT');

    await click(harness, buttonIn(harness.element.querySelector('app-notice')!, 'Ricarica'));
    http
      .expectOne(CONTRACT_URL)
      .flush({ ...existing, version: 4, requiredDocuments: ['DeliveryNote'] });
    await settle(harness.fixture);

    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([false, false]);
  });

  it('a save sends the version the answers were seeded from, not one read since', async () => {
    const harness = await openExisting();
    TestBed.inject(CustomersFacade).reloadContract();
    await settle(harness.fixture);
    http.expectOne(CONTRACT_URL).flush({ ...existing, version: 7 });
    await settle(harness.fixture);

    await click(harness, saveButtons(harness)[0]);

    const put = http.expectOne((request) => request.method === 'PUT');
    expect((put.request.body as { version: number }).version).toBe(3);
  });

  it('confirming question 1 again clears the backend message under "Al"', async () => {
    const harness = await openNew();
    await answerAll(harness);
    await click(harness, saveButtons(harness)[0]);
    lastPost().flush(
      { errors: { ValidTo: ['La data di fine precede la data di inizio.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(harness.fixture);
    expect(harness.element.querySelector('#contract-to-error')).not.toBeNull();

    await click(harness, buttonIn(questions(harness)[0], 'Conferma'));

    expect(harness.element.querySelector('#contract-to-error')).toBeNull();
  });

  it('a 400 naming "Al" and another field shows the generic notice at the top', async () => {
    const harness = await openNew();
    await answerAll(harness);
    await click(harness, saveButtons(harness)[0]);

    lastPost().flush(
      { errors: { ValidTo: ['Fine non valida.'], PricingMode: ['Obbligatorio.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(harness.fixture);

    expect(notice(harness)).not.toBe('');
    expect(harness.element.querySelector('main > app-notice')).not.toBeNull();
  });

  it('while a save runs "Modifica" is disabled and "Annulla" is not a link', async () => {
    const harness = await openNew();
    await answerAll(harness);
    await click(harness, saveButtons(harness)[0]);

    const modify = Array.from(harness.element.querySelectorAll('.pt-question button')).filter(
      (b) => b.textContent?.trim() === 'Modifica',
    ) as HTMLButtonElement[];
    expect(modify.length).toBe(8);
    expect(modify.every((b) => b.disabled)).toBe(true);
    const cancel = Array.from(harness.element.querySelectorAll('.pt-topbar__actions > *')).find(
      (e) => e.textContent?.trim() === 'Annulla',
    );
    expect(cancel?.tagName).toBe('BUTTON');
    expect((cancel as HTMLButtonElement).disabled).toBe(true);

    lastPost().flush({ ...existing, id: 'k2' }, { status: 201, statusText: 'Created' });
    await settle(harness.fixture);
    http.match((request) => request.method === 'GET').forEach((r) => r.flush([]));
  });

  const annulla = (harness: Harness) =>
    harness.element.querySelector<HTMLElement>('.pt-topbar__actions a')!;

  const leaveDialog = (harness: Harness) =>
    harness.element.querySelector<HTMLDialogElement>('dialog');

  const url = () => TestBed.inject(Router).url;

  it('with no answer on a new contract "Annulla" returns to the customer page at once', async () => {
    const harness = await openNew();

    await click(harness, annulla(harness));

    expect(leaveDialog(harness)).toBeNull();
    expect(url()).toBe('/customers/c1');
  });

  it('with an answer "Annulla" asks "Uscire senza salvare?", with "Resta sulla pagina" focused, and "Resta sulla pagina" keeps the page and the answers', async () => {
    const harness = await openNew();
    document.body.appendChild(harness.element);
    await confirmValidity(harness, '2027-01-01');

    await click(harness, annulla(harness));

    const dialog = leaveDialog(harness)!;
    expect(text(dialog.querySelector('.pt-title'))).toBe('Uscire senza salvare?');
    expect(text(dialog.querySelector('p:not(.pt-title)'))).toBe(
      'Le modifiche a questo contratto andranno perse.',
    );
    const buttons = Array.from(dialog.querySelectorAll('.pt-dialog__actions button'));
    expect(buttons.map((b) => text(b))).toEqual(['Resta sulla pagina', 'Esci senza salvare']);
    expect(document.activeElement).toBe(buttons[0]);

    await click(harness, buttons[0]);

    expect(leaveDialog(harness)).toBeNull();
    expect(url()).toBe('/customers/c1/contracts/new');
    expect(text(questions(harness)[0].querySelector('.pt-question__answer'))).toBe(
      'dal 01/01/2027, senza scadenza',
    );
    harness.element.remove();
  });

  it('Escape does the same as "Resta sulla pagina"', async () => {
    const harness = await openNew();
    await confirmValidity(harness, '2027-01-01');
    await click(harness, annulla(harness));

    leaveDialog(harness)!.dispatchEvent(new Event('cancel', { cancelable: true }));
    await settle(harness.fixture);

    expect(leaveDialog(harness)).toBeNull();
    expect(url()).toBe('/customers/c1/contracts/new');
  });

  it('"Esci senza salvare" leaves for the customer page', async () => {
    const harness = await openNew();
    await confirmValidity(harness, '2027-01-01');
    await click(harness, annulla(harness));

    await click(harness, buttonIn(leaveDialog(harness)!, 'Esci senza salvare'));

    expect(url()).toBe('/customers/c1');
  });

  it('the breadcrumb and the browser navigation ask as well', async () => {
    const harness = await openNew();
    await confirmValidity(harness, '2027-01-01');

    await click(harness, harness.element.querySelector('.pt-breadcrumb a[href="/customers/c1"]'));
    expect(leaveDialog(harness)).not.toBeNull();
    await click(harness, buttonIn(leaveDialog(harness)!, 'Resta sulla pagina'));

    void TestBed.inject(Router).navigateByUrl('/customers/c1');
    await settle(harness.fixture);
    expect(leaveDialog(harness)).not.toBeNull();
    expect(url()).toBe('/customers/c1/contracts/new');
  });

  it('on an existing contract no change opens no dialog', async () => {
    const harness = await openExisting();

    await click(harness, annulla(harness));

    expect(leaveDialog(harness)).toBeNull();
    expect(url()).toBe('/customers/c1');
  });

  it('setting an answer back to its loaded value removes the change', async () => {
    const harness = await openExisting();
    await addWasteForm(harness);
    await click(harness, buttonIn(questions(harness)[7], 'Modifica'));
    await click(harness, harness.element.querySelectorAll('input[type="checkbox"]')[2]);
    await click(harness, buttonIn(questions(harness)[7], 'Conferma selezione'));

    await click(harness, annulla(harness));

    expect(leaveDialog(harness)).toBeNull();
    expect(url()).toBe('/customers/c1');
  });

  it('on an existing contract an answer different from the loaded one is a change', async () => {
    const harness = await openExisting();
    await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
    await choose(harness, 'A km');

    await click(harness, annulla(harness));

    expect(leaveDialog(harness)).not.toBeNull();
    expect(url()).toBe('/customers/c1/contracts/k1');
  });

  it('the browser asks before a reload or close only with unsaved changes', async () => {
    const harness = await openNew();
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(unload()).toBe(false);

    await confirmValidity(harness, '2027-01-01');

    expect(unload()).toBe(true);
  });

  it('after a successful save the navigation to the customer page is not asked about, and "Salva contratto" stays disabled until it happens', async () => {
    const harness = await openNew();
    await answerAll(harness);
    let release!: (allowed: boolean) => void;
    gate = new Promise<boolean>((resolve) => (release = resolve));

    await click(harness, saveButtons(harness)[0]);
    lastPost().flush({ ...existing, id: 'k2' }, { status: 201, statusText: 'Created' });
    await settle(harness.fixture);

    expect(url()).toBe('/customers/c1/contracts/new');
    expect(leaveDialog(harness)).toBeNull();
    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true, true]);

    release(true);
    await settle(harness.fixture);
    http.match((request) => request.method === 'GET').forEach((r) => r.flush([]));

    expect(url()).toBe('/customers/c1');
    expect(leaveDialog(harness)).toBeNull();
  });

  it('after "Ricarica" there is no unsaved change', async () => {
    const harness = await openExisting();
    await addWasteForm(harness);
    await saveInPlace(harness, 0);
    http
      .expectOne((request) => request.method === 'PUT')
      .flush(
        { errorCode: 'Registry.Contract.ConcurrentUpdate', detail: 'Modificato da altri.' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(harness.fixture);
    http.expectOne((request) => request.url === CONTRACTS_URL).flush([]);
    http
      .expectOne(CONTRACT_URL)
      .flush({ ...existing, version: 4, requiredDocuments: ['DeliveryNote'] });
    await settle(harness.fixture);

    await click(harness, buttonIn(harness.element.querySelector('app-notice')!, 'Ricarica'));
    http
      .expectOne(CONTRACT_URL)
      .flush({ ...existing, version: 5, requiredDocuments: ['DeliveryNote'] });
    await settle(harness.fixture);
    await click(harness, annulla(harness));

    expect(leaveDialog(harness)).toBeNull();
    expect(url()).toBe('/customers/c1');
  });

  describe('rate and minimum', () => {
    const flatExisting: Contract = {
      ...existing,
      locationRates: [],
      billingLevel: 'FlatRate',
      nightSurcharge: true,
      dayPrice: 30,
      nightPrice: 42,
      nightCallFee: 35,
      minimumRule: 'TieredOverage',
      minimumAmount: 50,
      minimumThreshold: 4,
      minimumOveragePrice: 12,
    };

    /** A new flat-rate contract answered up to the night surcharge: question 6 is the open one. */
    const openAtRate = async (night: 'No' | 'Sì', mode = 'A ore') => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'No');
      await choose(harness, mode);
      await choose(harness, night);
      return harness;
    };

    const fillRate = (
      harness: Harness,
      values: { day?: string; night?: string; callFee?: string },
    ) => {
      type(harness, 'rate-day', values.day ?? '30');
      if (values.night !== undefined) {
        type(harness, 'rate-night', values.night);
      }
      if (values.callFee !== undefined) {
        type(harness, 'rate-callFee', values.callFee);
      }
    };

    const fillMinimum = (harness: Harness, amount: string, threshold = '', overage = '') => {
      type(harness, 'minimum-amount', amount);
      if (threshold !== '') {
        type(harness, 'minimum-threshold', threshold);
        type(harness, 'minimum-overage', overage);
      }
    };

    const pills = (harness: Harness) =>
      questions(harness).map((q) => text(q.querySelector('.pt-question__answer')));

    /** Whether closing the page now would be asked about. */
    const unsaved = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    const errorOf = (harness: Harness, id: string) =>
      text(harness.element.querySelector(`#${id}-error`));

    const addons = (harness: Harness) =>
      Array.from(
        harness.element.querySelectorAll('.pt-question[aria-current="step"] .pt-input-group'),
      ).map((group) => text(group.querySelector('.pt-input-group__addon')));

    it('only the open question tells its keys, under its actions; a reopened one adds Esc', async () => {
      const harness = await openAtRate('No');
      const keysOf = () =>
        Array.from(harness.element.querySelectorAll('.pt-question .pt-keys'), (p) =>
          Array.from(p.children, (group) => text(group)).join(' · '),
        );

      expect(keysOf()).toEqual([]);
      await answerRate(harness);
      expect(keysOf()).toEqual(['↑ ↓ scegli · Tab vai ai campi, poi «Conferma»']);
      const open = () => harness.element.querySelector('.pt-question[aria-current="step"]')!;
      expect(
        open().querySelector('app-contract-keys')!.previousElementSibling?.textContent,
      ).toContain('Conferma');
      await answerNoMinimum(harness);
      expect(keysOf()).toEqual(['↑ ↓ scegli · Invio o Spazio conferma']);

      await click(harness, buttonIn(questions(harness)[2], 'Modifica'));
      const reopened = questions(harness)[2];
      expect(
        Array.from(reopened.querySelector('.pt-keys')!.children, (group) => text(group)),
      ).toEqual(['↑ ↓ scegli', 'Invio o Spazio conferma', 'Esc annulla la modifica']);
      expect(text(reopened.querySelector('app-contract-keys')!.previousElementSibling)).toBe(
        'Annulla modifica',
      );
    });

    it('Esc in a reopened question goes back to its answer and puts the focus on its "Modifica"', async () => {
      const harness = await openAtRate('No');
      await answerRate(harness);
      await answerNoMinimum(harness);
      const minimum = () =>
        questions(harness).find(
          (q) => text(q.querySelector('h3')) === 'Vuoi impostare un minimo fatturabile?',
        )!;
      await click(harness, buttonIn(minimum(), 'Modifica'));
      await choose(harness, 'Minimo fisso');

      minimum()
        .querySelector('input')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle(harness.fixture);

      const reopened = minimum();
      expect(reopened.classList.contains('pt-question--answered')).toBe(true);
      expect(text(reopened.querySelector('.pt-question__answer'))).toBe('Nessun minimo');
      expect(document.activeElement).toBe(buttonIn(reopened, 'Modifica'));
    });

    it('on "Modifica" the arrows move the focus to the "Modifica" of the question before or after', async () => {
      const harness = await openAtRate('No');
      await answerRate(harness);
      const modifies = () =>
        Array.from(harness.element.querySelectorAll<HTMLButtonElement>('button[data-modify]'));
      const press = async (key: string) => {
        (document.activeElement as HTMLElement).dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        );
        await settle(harness.fixture);
      };

      modifies()[1].focus();
      await press('ArrowDown');
      expect(document.activeElement).toBe(modifies()[2]);
      await press('ArrowUp');
      await press('ArrowUp');
      expect(document.activeElement).toBe(modifies()[0]);
      await press('ArrowUp');
      expect(document.activeElement).toBe(modifies()[0]);
    });

    it('the rate is question 6 and the minimum question 7 after the night surcharge, the vehicle rates are 8 and the documents move to 9', async () => {
      const harness = await openAtRate('No');
      await answerRate(harness);
      await answerNoMinimum(harness);
      await answerNoVehicleRates(harness);

      expect(titles(harness)).toEqual([
        'Da quando vale il contratto?',
        'La fatturazione prevede luoghi obbligatori?',
        'Modalità di pagamento',
        'Vuoi differenziare la tariffa diurna da quella notturna?',
        'Qual è la tariffa del cliente?',
        'Vuoi impostare un minimo fatturabile?',
        'Ci sono mezzi con una tariffa diversa?',
        'Quali documenti sono obbligatori?',
      ]);
      expect(questions(harness).map((q) => text(q.querySelector('.pt-question__number')))).toEqual([
        '1',
        '2',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
      ]);
    });

    it('answered rate and minimum read as worded on the page', async () => {
      const harness = await openAtRate('Sì');
      fillRate(harness, { day: '30', night: '42', callFee: '35' });
      await click(harness, buttonIn(harness.element, 'Conferma'));
      await choose(harness, 'Scaglione con eccesso');
      fillMinimum(harness, '50', '4', '12');
      await click(harness, buttonIn(harness.element, 'Conferma'));

      expect(pills(harness).slice(3, 6)).toEqual([
        'Maggiorazione notturna',
        '30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 €',
        'Scaglione: 50,00 € fino a 4 ore, poi 12,00 €/h',
      ]);
    });

    it('the rate hint speaks of the night call only with the night surcharge', async () => {
      const hint = (harness: Harness) =>
        text(harness.element.querySelector('.pt-question[aria-current="step"] .pt-muted'));

      expect(hint(await openAtRate('No'))).toBe(
        'Tariffa unica, valida per tutti i viaggi del contratto.',
      );
    });

    it('the rate hint with the night surcharge adds the night call', async () => {
      const harness = await openAtRate('Sì');

      expect(
        text(harness.element.querySelector('.pt-question[aria-current="step"] .pt-muted')),
      ).toBe(
        'Tariffa unica, valida per tutti i viaggi del contratto. La chiamata notturna si aggiunge a ogni viaggio che inizia di notte.',
      );
    });

    it('the night call fee says that 0 means no call fee, and keeps saying it under an error', async () => {
      const harness = await openAtRate('Sì');
      const callFee = harness.element.querySelector('#rate-callFee')!;

      expect(text(harness.element.querySelector('#rate-callFee-hint'))).toBe(
        'Metti 0 se al cliente non si addebita la chiamata.',
      );
      expect(callFee.getAttribute('aria-describedby')).toBe('rate-callFee-hint');
      expect(harness.element.querySelector('#rate-day-hint')).toBeNull();

      type(harness, 'rate-callFee', '-1');
      await click(harness, buttonIn(harness.element, 'Conferma'));

      expect(harness.element.querySelector('#rate-callFee-hint')).not.toBeNull();
      expect(errorOf(harness, 'rate-callFee')).toBe("L'importo non può essere negativo.");
      expect(callFee.getAttribute('aria-describedby')).toBe('rate-callFee-hint rate-callFee-error');
    });

    describe('"Annulla modifica"', () => {
      const modifyOf = (harness: Harness, index: number) =>
        buttonIn(questions(harness)[index], 'Modifica');

      it('closes a reopened rate on the answer it had, and the focus goes back to its "Modifica"', async () => {
        const harness = await openExisting(flatExisting);
        await click(harness, modifyOf(harness, 4));
        type(harness, 'rate-night', '45');
        type(harness, 'rate-callFee', '-1');
        await click(harness, buttonIn(harness.element, 'Conferma'));
        expect(errorOf(harness, 'rate-callFee')).toBe("L'importo non può essere negativo.");

        await click(harness, buttonIn(harness.element, 'Annulla modifica'));

        expect(pills(harness)[4]).toBe(
          '30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 €',
        );
        expect(harness.element.querySelector('[aria-current="step"]')).toBeNull();
        expect(document.activeElement).toBe(modifyOf(harness, 4));
        expect(unsaved()).toBe(false);

        await click(harness, modifyOf(harness, 4));
        expect(harness.element.querySelector<HTMLInputElement>('#rate-night')!.value).toBe('42');
        expect(harness.element.querySelector('#rate-callFee-error')).toBeNull();
      });

      it('closes a reopened choice question without changing it', async () => {
        const harness = await openExisting(flatExisting);
        await click(harness, modifyOf(harness, 2));

        await click(harness, buttonIn(harness.element, 'Annulla modifica'));

        expect(pills(harness)[2]).toBe('Pagamento a ore');
        expect(harness.element.querySelector('[aria-current="step"]')).toBeNull();
        expect(saveButtons(harness).every((b) => !b.disabled)).toBe(true);
      });

      it('puts back the validity, with its errors gone', async () => {
        const harness = await openExisting(flatExisting);
        await click(harness, modifyOf(harness, 0));
        type(harness, 'contract-to', '2026-01-01');
        await click(harness, buttonIn(harness.element, 'Conferma'));
        expect(harness.element.querySelector('#contract-to-error')).not.toBeNull();

        await click(harness, buttonIn(harness.element, 'Annulla modifica'));
        expect(pills(harness)[0]).toBe('dal 01/04/2026 al 31/03/2027');

        await click(harness, modifyOf(harness, 0));
        expect(harness.element.querySelector<HTMLInputElement>('#contract-to')!.value).toBe(
          '2027-03-31',
        );
        expect(harness.element.querySelector('#contract-to-error')).toBeNull();
      });

      it('puts back the minimum kind chosen with the arrows, and its fields', async () => {
        const harness = await openExisting(flatExisting);
        await click(harness, modifyOf(harness, 5));
        await choose(harness, 'Minimo fisso');
        expect(harness.element.querySelector('#minimum-threshold')).toBeNull();

        await click(harness, buttonIn(harness.element, 'Annulla modifica'));
        expect(pills(harness)[5]).toBe('Scaglione: 50,00 € fino a 4 ore, poi 12,00 €/h');

        await click(harness, modifyOf(harness, 5));
        expect(harness.element.querySelector<HTMLInputElement>('#minimum-threshold')!.value).toBe(
          '4',
        );
      });

      it('puts back the documents', async () => {
        const harness = await openExisting(flatExisting);
        await click(harness, modifyOf(harness, 7));
        await click(
          harness,
          harness.element.querySelector('.pt-question[aria-current="step"] input'),
        );

        await click(harness, buttonIn(harness.element, 'Annulla modifica'));
        expect(pills(harness)[7]).toBe('DDT, riepilogo di fine giornata');
      });

      it('on the rate leaves what is typed in an open minimum question alone', async () => {
        const harness = await openAtRate('No');
        await answerRate(harness, '30');
        await choose(harness, 'Minimo fisso');
        type(harness, 'minimum-amount', '25');
        await click(harness, modifyOf(harness, 4));
        type(harness, 'rate-day', '99');

        await click(harness, buttonIn(harness.element, 'Annulla modifica'));

        expect(pills(harness)[4]).toBe('30,00 €/h');
        expect(harness.element.querySelector<HTMLInputElement>('#minimum-amount')!.value).toBe(
          '25',
        );
      });

      it('is not offered on a question answered for the first time', async () => {
        const harness = await openAtRate('Sì');

        expect(buttonIn(harness.element, 'Annulla modifica')).toBeUndefined();
      });
    });

    it('a day price alone, and a fixed minimum, read as worded on the page; the comma is accepted', async () => {
      const harness = await openAtRate('No');
      await answerRate(harness, '30,5');
      await choose(harness, 'Minimo fisso');
      fillMinimum(harness, '30');
      await click(harness, buttonIn(harness.element, 'Conferma'));

      expect(pills(harness).slice(4, 6)).toEqual(['30,50 €/h', 'Minimo 30,00 €']);
    });

    it('under a tiered overage an example uses sample values until the three typed ones hold', async () => {
      const harness = await openAtRate('No');
      await answerRate(harness);
      await choose(harness, 'Scaglione con eccesso');
      const example = () =>
        text(harness.element.querySelector('.pt-question[aria-current="step"] .pt-field__hint'));
      expect(example()).toBe(
        'Esempio: fino a 4 ore si fatturano 50,00 €; ogni ora oltre 4 ore aggiunge 12,00 €. Un viaggio di 6 ore: 74,00 €.',
      );

      fillMinimum(harness, '30', '2', '');
      await settle(harness.fixture);
      expect(example()).toContain('fino a 4 ore si fatturano 50,00 €');

      fillMinimum(harness, '30', '2', '10');
      await settle(harness.fixture);
      expect(example()).toBe(
        'Esempio: fino a 2 ore si fatturano 30,00 €; ogni ora oltre 2 ore aggiunge 10,00 €. Un viaggio di 4 ore: 50,00 €.',
      );
    });

    it('under a fixed minimum an example tells it, with the typed amount once it holds; none under "Nessun minimo"', async () => {
      const harness = await openAtRate('No');
      await answerRate(harness);
      const example = () =>
        text(harness.element.querySelector('.pt-question[aria-current="step"] .pt-field__hint'));
      expect(example()).toBeUndefined();

      await choose(harness, 'Nessun minimo');
      expect(example()).toBeUndefined();

      await choose(harness, 'Minimo fisso');
      expect(example()).toContain('con un minimo di 50,00 €');

      fillMinimum(harness, '35');
      await settle(harness.fixture);
      expect(example()).toBe(
        'Esempio: con un minimo di 35,00 €, un viaggio che col calcolo ordinario vale meno di 35,00 € si fattura 35,00 €; se vale di più, si fattura il suo importo.',
      );
    });

    it('each field shows the unit of the pricing mode as an add-on', async () => {
      const cases: [string, string[], string[]][] = [
        ['A ore', ['€/h', '€/h', '€'], ['€', 'ore', '€/h']],
        ['A peso', ['€/ton', '€/ton', '€'], ['€', 'ton', '€/ton']],
        ['A km', ['€/km', '€/km', '€'], ['€', 'km', '€/km']],
      ];
      for (const [mode, rateUnits, minimumUnits] of cases) {
        TestBed.resetTestingModule();
        const harness = await openAtRate('Sì', mode);
        expect(addons(harness)).toEqual(rateUnits);
        fillRate(harness, { day: '30', night: '42', callFee: '35' });
        await click(harness, buttonIn(harness.element, 'Conferma'));
        await choose(harness, 'Scaglione con eccesso');
        expect(addons(harness)).toEqual(minimumUnits);
      }
    });

    it('a trip price is in euro, and the night call fee and M always are', async () => {
      const harness = await openAtRate('Sì', 'A viaggio');

      expect(addons(harness)).toEqual(['€', '€', '€']);
    });

    it('confirming shows the message under each field that does not hold, and keeps the question open', async () => {
      const harness = await openAtRate('Sì');
      type(harness, 'rate-day', '');
      type(harness, 'rate-night', '0');
      type(harness, 'rate-callFee', '-1');
      await click(harness, buttonIn(harness.element, 'Conferma'));

      expect(errorOf(harness, 'rate-day')).toBe('Inserisci il prezzo diurno.');
      expect(errorOf(harness, 'rate-night')).toBe('Inserisci un importo maggiore di zero.');
      expect(errorOf(harness, 'rate-callFee')).toBe("L'importo non può essere negativo.");
      expect(harness.element.querySelector('#rate-day')?.getAttribute('aria-invalid')).toBe('true');
      expect(harness.element.querySelector('#rate-day')?.getAttribute('aria-describedby')).toBe(
        'rate-day-error',
      );
      expect(questions(harness)[4].getAttribute('aria-current')).toBe('step');
      expect(pills(harness)[4]).toBeUndefined();
    });

    it('an empty night price and call fee, a third decimal and a non-number are refused; a call fee of 0 is accepted', async () => {
      const harness = await openAtRate('Sì');
      fillRate(harness, { day: '12,345', night: '', callFee: '' });
      await click(harness, buttonIn(harness.element, 'Conferma'));
      expect(errorOf(harness, 'rate-day')).toBe('Usa al massimo due decimali.');
      expect(errorOf(harness, 'rate-night')).toBe('Inserisci il prezzo notturno.');
      expect(errorOf(harness, 'rate-callFee')).toBe('Inserisci la chiamata notturna.');

      fillRate(harness, { day: 'abc', night: '42', callFee: '0' });
      await click(harness, buttonIn(harness.element, 'Conferma'));
      expect(errorOf(harness, 'rate-day')).toBe('Inserisci un importo valido.');
      expect(errorOf(harness, 'rate-night')).toBeUndefined();
      expect(errorOf(harness, 'rate-callFee')).toBeUndefined();

      fillRate(harness, { day: '30', night: '42', callFee: '0' });
      await click(harness, buttonIn(harness.element, 'Conferma'));
      expect(pills(harness)[4]).toBe('30,00 €/h di giorno · 42,00 €/h di notte · chiamata 0,00 €');
    });

    it('the minimum is confirmed only with the values its kind asks for, each with its message', async () => {
      const harness = await openAtRate('No');
      await answerRate(harness);
      const confirm = () => click(harness, buttonIn(harness.element, 'Conferma'));

      expect(buttonIn(harness.element, 'Conferma')!.disabled).toBe(true);

      await choose(harness, 'Minimo fisso');
      expect(addons(harness)).toEqual(['€']);
      await confirm();
      expect(errorOf(harness, 'minimum-amount')).toBe("Inserisci l'importo minimo.");

      await choose(harness, 'Scaglione con eccesso');
      type(harness, 'minimum-amount', '50');
      type(harness, 'minimum-threshold', '0');
      type(harness, 'minimum-overage', '');
      await confirm();
      expect(errorOf(harness, 'minimum-amount')).toBeUndefined();
      expect(errorOf(harness, 'minimum-threshold')).toBe('Inserisci un valore maggiore di zero.');
      expect(errorOf(harness, 'minimum-overage')).toBe("Inserisci il costo dell'eccedenza.");

      type(harness, 'minimum-threshold', '4,567');
      await confirm();
      expect(errorOf(harness, 'minimum-threshold')).toBe('Usa al massimo due decimali.');
    });

    it('an amount or threshold over 9999999999.99 is refused with "Importo troppo alto."; the bound itself is accepted', async () => {
      const harness = await openAtRate('Sì');
      fillRate(harness, { day: '10000000000', night: '9999999999,99', callFee: '10000000000,00' });
      await click(harness, buttonIn(harness.element, 'Conferma'));
      expect(errorOf(harness, 'rate-day')).toBe('Importo troppo alto.');
      expect(errorOf(harness, 'rate-night')).toBeUndefined();
      expect(errorOf(harness, 'rate-callFee')).toBe('Importo troppo alto.');
    });

    it('a threshold over 9999999999.99 is refused with "Importo troppo alto."; the bound itself is accepted for the overage', async () => {
      const minimum = await openAtRate('No');
      await answerRate(minimum);
      await choose(minimum, 'Scaglione con eccesso');
      type(minimum, 'minimum-amount', '50');
      type(minimum, 'minimum-threshold', '10000000000');
      type(minimum, 'minimum-overage', '9999999999,99');
      await click(minimum, buttonIn(minimum.element, 'Conferma'));
      expect(errorOf(minimum, 'minimum-threshold')).toBe('Importo troppo alto.');
      expect(errorOf(minimum, 'minimum-overage')).toBeUndefined();
    });

    it('the minimum is none, fixed or tiered; "Nessun minimo" asks no value', async () => {
      const harness = await openAtRate('No');
      await answerRate(harness);

      const choices = () =>
        Array.from(
          harness.element.querySelectorAll('.pt-question[aria-current="step"] .pt-choice strong'),
        ).map((s) => s.textContent);
      expect(choices()).toEqual(['Nessun minimo', 'Minimo fisso', 'Scaglione con eccesso']);
      expect(addons(harness)).toEqual([]);
      await choose(harness, 'Nessun minimo');
      expect(addons(harness)).toEqual([]);
      await click(harness, buttonIn(harness.element, 'Conferma'));
      expect(pills(harness)[5]).toBe('Nessun minimo');
    });

    it('a contract priced by trip is not asked the minimum', async () => {
      const harness = await openAtRate('No', 'A viaggio');
      await answerRate(harness);

      expect(titles(harness)).not.toContain('Vuoi impostare un minimo fatturabile?');
      expect(questions(harness).at(-1)!.getAttribute('aria-current')).toBe('step');
      await answerNoVehicleRates(harness);
      await click(harness, buttonIn(harness.element, 'Conferma selezione'));
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([false, false]);
    });

    it('the rate and the minimum are saved with the one "Salva contratto"', async () => {
      const harness = await openAtRate('Sì');
      fillRate(harness, { day: '30', night: '42,5', callFee: '35' });
      await click(harness, buttonIn(harness.element, 'Conferma'));
      await choose(harness, 'Scaglione con eccesso');
      fillMinimum(harness, '50', '4', '12');
      await click(harness, buttonIn(harness.element, 'Conferma'));
      await answerNoVehicleRates(harness);
      await click(harness, buttonIn(harness.element, 'Conferma selezione'));

      await click(harness, saveButtons(harness)[0]);

      expect(lastPost().request.body).toEqual({
        validFrom: '2027-01-01',
        validTo: null,
        billingLevel: 'FlatRate',
        pricingMode: 'ByHour',
        requiredDocuments: [],
        nightSurcharge: true,
        dayPrice: 30,
        nightPrice: 42.5,
        nightCallFee: 35,
        minimumRule: 'TieredOverage',
        minimumAmount: 50,
        minimumThreshold: 4,
        minimumOveragePrice: 12,
        vehicleRates: [],
        locationRates: [],
      });
    });

    it('a fixed minimum sends its amount only', async () => {
      const fixed = await openAtRate('No');
      await answerRate(fixed);
      await choose(fixed, 'Minimo fisso');
      fillMinimum(fixed, '30');
      await click(fixed, buttonIn(fixed.element, 'Conferma'));
      await answerNoVehicleRates(fixed);
      await click(fixed, buttonIn(fixed.element, 'Conferma selezione'));
      await click(fixed, saveButtons(fixed)[0]);
      expect(lastPost().request.body).toMatchObject({
        dayPrice: 30,
        minimumRule: 'FixedMinimum',
        minimumAmount: 30,
        minimumThreshold: null,
        minimumOveragePrice: null,
      });
    });

    it('a contract priced by trip saves with no minimum rule', async () => {
      const harness = await openAtRate('No', 'A viaggio');
      await answerRate(harness);
      await answerNoVehicleRates(harness);
      await click(harness, buttonIn(harness.element, 'Conferma selezione'));
      await click(harness, saveButtons(harness)[0]);

      expect(lastPost().request.body).toMatchObject({
        pricingMode: 'ByTrip',
        dayPrice: 30,
        minimumRule: null,
        minimumAmount: null,
      });
    });

    it('a stored flat rate opens answered and a save puts it back with the version read', async () => {
      const harness = await openExisting(flatExisting);

      expect(pills(harness)).toEqual([
        'dal 01/04/2026 al 31/03/2027',
        'Nessun luogo obbligatorio',
        'Pagamento a ore',
        'Maggiorazione notturna',
        '30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 €',
        'Scaglione: 50,00 € fino a 4 ore, poi 12,00 €/h',
        'Stessa tariffa per tutti i mezzi',
        'DDT, riepilogo di fine giornata',
      ]);
      expect(unsaved()).toBe(false);

      await click(harness, saveButtons(harness)[1]);
      const put = http.expectOne((request) => request.method === 'PUT');
      expect(put.request.body).toMatchObject({
        billingLevel: 'FlatRate',
        dayPrice: 30,
        nightPrice: 42,
        nightCallFee: 35,
        minimumRule: 'TieredOverage',
        minimumAmount: 50,
        minimumThreshold: 4,
        minimumOveragePrice: 12,
        version: 3,
      });
      put.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('a rate or a minimum changed after the load is an unsaved change, and putting it back is not', async () => {
      const harness = await openExisting(flatExisting);

      await click(harness, buttonIn(questions(harness)[4], 'Modifica'));
      type(harness, 'rate-day', '31');
      await click(harness, buttonIn(harness.element, 'Conferma'));
      expect(unsaved()).toBe(true);

      await click(harness, buttonIn(questions(harness)[4], 'Modifica'));
      type(harness, 'rate-day', '30,00');
      await click(harness, buttonIn(harness.element, 'Conferma'));
      expect(unsaved()).toBe(false);
    });

    it('a new pricing mode clears the rate and the minimum and asks them again', async () => {
      const harness = await openExisting(flatExisting);

      await click(harness, buttonIn(questions(harness)[2], 'Modifica'));
      await choose(harness, 'A peso');

      expect(pills(harness).slice(2, 6)).toEqual([
        'Pagamento a peso',
        'Maggiorazione notturna',
        undefined,
        'DDT, riepilogo di fine giornata',
      ]);
      expect(titles(harness)).not.toContain('Vuoi impostare un minimo fatturabile?');
      expect(questions(harness)[4].getAttribute('aria-current')).toBe('step');
      expect(harness.element.querySelector<HTMLInputElement>('#rate-day')!.value).toBe('');
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);

      fillRate(harness, { day: '25', night: '31', callFee: '10' });
      await click(harness, buttonIn(harness.element, 'Conferma'));
      expect(questions(harness)[5].getAttribute('aria-current')).toBe('step');
      expect(
        harness.element.querySelector('.pt-question[aria-current="step"] .pt-choice input:checked'),
      ).toBeNull();
      expect(pills(harness)[4]).toBe(
        '25,00 €/ton di giorno · 31,00 €/ton di notte · chiamata 10,00 €',
      );
    });

    it('choosing the same pricing mode again clears nothing', async () => {
      const harness = await openExisting(flatExisting);

      await click(harness, buttonIn(questions(harness)[2], 'Modifica'));
      await choose(harness, 'A ore');

      expect(pills(harness)[4]).toBe('30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 €');
      expect(pills(harness)[5]).toBe('Scaglione: 50,00 € fino a 4 ore, poi 12,00 €/h');
    });

    it('a new pricing mode of "A viaggio" removes the minimum question', async () => {
      const harness = await openExisting(flatExisting);

      await click(harness, buttonIn(questions(harness)[2], 'Modifica'));
      await choose(harness, 'A viaggio');
      fillRate(harness, { day: '25', night: '31', callFee: '10' });
      await click(harness, buttonIn(harness.element, 'Conferma'));
      await answerNoVehicleRates(harness);

      expect(titles(harness)).not.toContain('Vuoi impostare un minimo fatturabile?');
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([false, false]);
      await saveInPlace(harness, 1);
      const put = http.expectOne((request) => request.method === 'PUT');
      expect(put.request.body).toMatchObject({
        pricingMode: 'ByTrip',
        dayPrice: 25,
        minimumRule: null,
        minimumAmount: null,
        minimumThreshold: null,
        minimumOveragePrice: null,
      });
      put.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('removing the night surcharge clears the night price and the night call fee only', async () => {
      const harness = await openExisting(flatExisting);

      await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
      await choose(harness, 'No');

      expect(pills(harness).slice(3, 6)).toEqual([
        'Nessuna maggiorazione notturna',
        '30,00 €/h',
        'Scaglione: 50,00 € fino a 4 ore, poi 12,00 €/h',
      ]);
      await saveInPlace(harness, 1);
      const put = http.expectOne((request) => request.method === 'PUT');
      expect(put.request.body).toMatchObject({
        nightSurcharge: false,
        dayPrice: 30,
        nightPrice: null,
        nightCallFee: null,
        minimumRule: 'TieredOverage',
      });
      put.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('adding the night surcharge asks the rate again, with the day price still typed', async () => {
      const harness = await openExisting({
        ...flatExisting,
        nightSurcharge: false,
        nightPrice: null,
        nightCallFee: null,
      });

      await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
      await choose(harness, 'Sì');

      expect(questions(harness)[4].getAttribute('aria-current')).toBe('step');
      expect(harness.element.querySelector<HTMLInputElement>('#rate-day')!.value).toBe('30');
      expect(harness.element.querySelector('#rate-night')).not.toBeNull();
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
    });

    it('going back to the flat rate asks the rate and the minimum again', async () => {
      const harness = await openExisting(flatExisting);
      await click(harness, buttonIn(questions(harness)[1], 'Modifica'));
      await choose(harness, 'Sì');
      await choose(harness, 'Solo partenza');

      await click(harness, buttonIn(questions(harness)[1], 'Modifica'));
      await choose(harness, 'No');

      expect(titles(harness)).not.toContain('Vuoi impostare un minimo fatturabile?');
      expect(questions(harness)[4].getAttribute('aria-current')).toBe('step');
      expect(harness.element.querySelector<HTMLInputElement>('#rate-day')!.value).toBe('');
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
    });

    it('"Salva contratto" stays disabled for a flat contract without rate or minimum', async () => {
      const harness = await openAtRate('No');
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);

      await answerRate(harness);
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
      await answerNoMinimum(harness);
      await answerNoVehicleRates(harness);
      await click(harness, buttonIn(harness.element, 'Conferma selezione'));
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([false, false]);
    });

    it('a flat contract stored without a rate opens with question 6 as the current one', async () => {
      const harness = await openExisting({
        ...flatExisting,
        dayPrice: null,
        nightPrice: null,
        nightCallFee: null,
        minimumRule: null,
        minimumAmount: null,
        minimumThreshold: null,
        minimumOveragePrice: null,
      });

      expect(questions(harness)[4].getAttribute('aria-current')).toBe('step');
      expect(text(questions(harness)[4].querySelector('h3'))).toBe(
        'Qual è la tariffa del cliente?',
      );
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
    });
  });

  describe('keyboard choices', () => {
    const key = (input: Element, type: string, key: string) => {
      const event = new KeyboardEvent(type, { key, bubbles: true, cancelable: true });
      input.dispatchEvent(event);
      return event;
    };

    /** What Chrome does on an arrow key: keydown and blur on the current radio, then focus, click without a pointer, change and keyup on the next. */
    const arrowTo = async (harness: Harness, input: HTMLInputElement, release = true) => {
      const radios = Array.from(
        harness.element.querySelectorAll<HTMLInputElement>(
          '.pt-question[aria-current="step"] input[type="radio"]',
        ),
      );
      const from = radios.find((r) => r.checked && r !== input) ?? radios.find((r) => r !== input)!;
      key(from, 'keydown', 'ArrowDown');
      from.dispatchEvent(new FocusEvent('blur'));
      input.dispatchEvent(new FocusEvent('focus'));
      input.checked = true;
      input.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (release) {
        key(input, 'keyup', 'ArrowDown');
      }
      await settle(harness.fixture);
    };

    const choiceInput = (harness: Harness, title: string) =>
      Array.from(harness.element.querySelectorAll('.pt-question[aria-current="step"] .pt-choice'))
        .find((l) => text(l.querySelector('strong')) === title)!
        .querySelector('input')!;

    const currentTitle = (harness: Harness) =>
      text(harness.element.querySelector('.pt-question[aria-current="step"] h3'));

    const state = (harness: Harness) =>
      harness.page() as unknown as {
        radio: () => { locations: string | null };
        minimumKindDraft: () => string | null;
      };

    it.each(['Enter', ' '])(
      'an arrow key moves the selection and the question stays open; %j confirms it',
      async (confirmKey) => {
        const harness = await openNew();
        await confirmValidity(harness, '2027-01-01');
        const before = currentTitle(harness);

        await arrowTo(harness, choiceInput(harness, 'No'));

        expect(state(harness).radio().locations).toBeNull();
        expect(currentTitle(harness)).toBe(before);

        key(choiceInput(harness, 'No'), 'keydown', confirmKey);
        await settle(harness.fixture);

        expect(state(harness).radio().locations).toBe('no');
        expect(currentTitle(harness)).not.toBe(before);
      },
    );

    it('a pointer click confirms the choice and closes the question', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      const before = currentTitle(harness);

      await click(harness, choiceInput(harness, 'No'));

      expect(state(harness).radio().locations).toBe('no');
      expect(currentTitle(harness)).not.toBe(before);
    });

    it('on the minimum question an arrow key selects the kind and shows its fields, without confirming', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'No');
      await choose(harness, 'A ore');
      await choose(harness, 'No');
      await answerRate(harness);
      const before = currentTitle(harness);

      await arrowTo(harness, choiceInput(harness, 'Minimo fisso'));
      expect(state(harness).minimumKindDraft()).toBe('FixedMinimum');
      expect(harness.element.querySelector('#minimum-amount')).not.toBeNull();
      expect(currentTitle(harness)).toBe(before);

      key(choiceInput(harness, 'Nessun minimo'), 'keydown', ' ');
      await settle(harness.fixture);
      expect(state(harness).minimumKindDraft()).toBe('None');
      expect(currentTitle(harness)).toBe(before);
    });

    it('the sign-out asks through the page while it is open and no longer once it is gone', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');

      const answer = TestBed.inject(LeaveConfirmation).confirm();
      await settle(harness.fixture);
      expect(text(leaveDialog(harness)!.querySelector('.pt-title'))).toBe('Uscire senza salvare?');
      await click(harness, buttonIn(leaveDialog(harness)!, 'Resta sulla pagina'));
      expect(await answer).toBe(false);

      harness.fixture.destroy();
      expect(await TestBed.inject(LeaveConfirmation).confirm()).toBe(true);
    });

    it('an arrow move whose keyup never arrives does not swallow the next pointer click', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      const before = currentTitle(harness);

      await arrowTo(harness, choiceInput(harness, 'No'), false);
      expect(currentTitle(harness)).toBe(before);

      await click(harness, choiceInput(harness, 'No'));

      expect(state(harness).radio().locations).toBe('no');
    });

    it('a document ticked but not confirmed is not an unsaved change', async () => {
      const harness = await openExisting();
      await click(harness, buttonIn(questions(harness).at(-1)!, 'Modifica'));
      await click(
        harness,
        harness.element.querySelector('.pt-question[aria-current="step"] input[type="checkbox"]'),
      );

      await click(harness, annulla(harness));

      expect(leaveDialog(harness)).toBeNull();
      expect(url()).toBe('/customers/c1');
    });

    it('a date typed but not confirmed is not an unsaved change', async () => {
      const harness = await openNew();
      type(harness, 'contract-from', '2027-01-01');
      await settle(harness.fixture);

      await click(harness, annulla(harness));

      expect(leaveDialog(harness)).toBeNull();
      expect(url()).toBe('/customers/c1');
    });
  });

  describe('guided save', () => {
    const CHANGE_URL = `${CONTRACT_URL}/change-from-date`;

    const dialog = (harness: Harness) => harness.element.querySelector<HTMLDialogElement>('dialog');

    const scopes = (harness: Harness) =>
      Array.from(dialog(harness)!.querySelectorAll<HTMLInputElement>('input[name="change-scope"]'));

    const dialogSave = (harness: Harness) => buttonIn(dialog(harness)!, 'Salva')!;

    const dateError = (harness: Harness) =>
      text(dialog(harness)!.querySelector('#change-from-error'));

    const dateNotice = (harness: Harness) => text(dialog(harness)!.querySelector('.pt-notice'));

    /** Changes the documents of the open contract and presses "Salva contratto": the dialog opens. */
    const openDialog = async (contract: Contract = existing) => {
      const harness = await openExisting(contract);
      await addWasteForm(harness);
      await click(harness, saveButtons(harness)[0]);
      return harness;
    };

    const typeDate = (harness: Harness, value: string) => {
      const input = dialog(harness)!.querySelector<HTMLInputElement>('#change-from')!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };

    const chooseFromDate = async (harness: Harness, date: string) => {
      await click(harness, scopes(harness)[0]);
      typeDate(harness, date);
      await settle(harness.fixture);
    };

    const writes = () => http.match((request) => request.method !== 'GET');

    it('saving a contract in force with changed terms asks from when, with the two options', async () => {
      const harness = await openDialog();

      expect(text(dialog(harness)!.querySelector('.pt-title'))).toBe(
        'Da quando valgono le modifiche?',
      );
      expect(text(dialog(harness)!.querySelector('.pt-muted'))).toBe(
        'Il contratto è in vigore dal 01/04/2026 al 31/03/2027 e ne hai cambiato le condizioni.',
      );
      expect(
        scopes(harness).map((input) => text(input.closest('label')?.querySelector('strong'))),
      ).toEqual(['Da una data', 'Da sempre: correggo un dato sbagliato']);
      expect(text(scopes(harness)[1].closest('label')?.querySelector('.pt-choice__hint'))).toBe(
        'Le modifiche valgono per tutta la validità, anche per i giorni già passati.',
      );
      expect(writes()).toHaveLength(0);
    });

    it('"Annulla" closes the dialog and leaves the page as it was, unsaved', async () => {
      const harness = await openDialog();

      await click(harness, buttonIn(dialog(harness)!, 'Annulla'));

      expect(dialog(harness)).toBeNull();
      expect(writes()).toHaveLength(0);
      expect(url()).toBe('/customers/c1/contracts/k1');
      expect(text(questions(harness)[7].querySelector('.pt-question__answer'))).toBe(
        'DDT, formulario rifiuti, riepilogo di fine giornata',
      );
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([false, false]);
    });

    it('it opens with no option chosen and "Salva" disabled; "Da una data" shows the empty date and moves the focus to it', async () => {
      const harness = await openDialog();

      expect(scopes(harness).map((input) => input.checked)).toEqual([false, false]);
      expect(dialogSave(harness).disabled).toBe(true);
      expect(dialog(harness)!.querySelector('#change-from')).toBeNull();

      await click(harness, scopes(harness)[0]);

      const date = dialog(harness)!.querySelector<HTMLInputElement>('#change-from')!;
      expect(date.value).toBe('');
      expect(document.activeElement).toBe(date);
      expect(dateNotice(harness)).toBeUndefined();
      expect(dialogSave(harness).disabled).toBe(false);
    });

    it('a valid date shows what will happen, for a contract with an end', async () => {
      const harness = await openDialog();

      await chooseFromDate(harness, '2026-12-01');

      expect(dateNotice(harness)).toBe(
        'Il contratto dal 01/04/2026 sarà chiuso al 30/11/2026; il nuovo vale dal 01/12/2026 al 31/03/2027.',
      );
    });

    it('for a contract without an end the notice says the new one has no expiry', async () => {
      const harness = await openDialog({ ...existing, validTo: null });
      expect(text(dialog(harness)!.querySelector('.pt-muted'))).toBe(
        'Il contratto è in vigore dal 01/04/2026 e ne hai cambiato le condizioni.',
      );

      await chooseFromDate(harness, '2026-12-01');

      expect(dateNotice(harness)).toBe(
        'Il contratto dal 01/04/2026 sarà chiuso al 30/11/2026; il nuovo vale dal 01/12/2026, senza scadenza.',
      );
    });

    it('"Da una data" sends the written validity, the terms with the location rates, the date and the version read', async () => {
      const harness = await openDialog();
      await chooseFromDate(harness, '2026-12-01');

      await click(harness, dialogSave(harness));

      const post = http.expectOne((request) => request.method === 'POST');
      expect(post.request.url).toBe(CHANGE_URL);
      expect(post.request.body).toEqual({
        validFrom: '2026-04-01',
        validTo: '2027-03-31',
        billingLevel: 'PerPickupLocation',
        pricingMode: 'ByHour',
        requiredDocuments: ['DeliveryNote', 'WasteForm', 'DailySummary'],
        nightSurcharge: true,
        dayPrice: null,
        nightPrice: null,
        nightCallFee: null,
        minimumRule: null,
        minimumAmount: null,
        minimumThreshold: null,
        minimumOveragePrice: null,
        vehicleRates: [],
        locationRates: [
          {
            pickupLocationId: 'l1',
            deliveryLocationId: null,
            dayPrice: 30,
            nightPrice: 42,
            nightCallFee: 35,
            minimumRule: 'None',
            minimumAmount: null,
            minimumThreshold: null,
            minimumOveragePrice: null,
          },
        ],
        changeFrom: '2026-12-01',
        version: 3,
      });
      http.expectNone((request) => request.method === 'PUT');
    });

    it('a change from a date posts the new contract and returns to the customer page without asking to leave', async () => {
      const harness = await openDialog();
      const page = harness.page() as unknown as { changeDialog: () => boolean };
      await chooseFromDate(harness, '2026-12-01');
      await click(harness, dialogSave(harness));

      http
        .expectOne((request) => request.method === 'POST')
        .flush(
          { ...existing, id: 'k2', validFrom: '2026-12-01' },
          { status: 201, statusText: 'Created' },
        );
      await settle(harness.fixture);
      http.match((request) => request.method === 'GET').forEach((r) => r.flush([]));
      await settle(harness.fixture);

      expect(url()).toBe('/customers/c1');
      expect(leaveDialog(harness)).toBeNull();
      expect(page.changeDialog()).toBe(false);
    });

    it('an empty date, one not after the start and one after the end are refused under the date; a past one is accepted', async () => {
      const harness = await openDialog();
      await click(harness, scopes(harness)[0]);

      await click(harness, dialogSave(harness));
      expect(dateError(harness)).toBe('Inserisci la data da cui valgono le modifiche.');

      for (const date of ['2026-04-01', '2026-03-01', '2027-04-01']) {
        typeDate(harness, date);
        await click(harness, dialogSave(harness));
        expect(dateError(harness)).toBe(
          "La data deve essere successiva all'inizio e dentro la validità del contratto.",
        );
      }
      expect(writes()).toHaveLength(0);

      typeDate(harness, '2026-04-02');
      await click(harness, dialogSave(harness));
      expect(dateError(harness)).toBeUndefined();
      expect(http.expectOne((request) => request.method === 'POST').request.body).toMatchObject({
        changeFrom: '2026-04-02',
      });
    });

    it('a 400 of the backend under ChangeFrom shows under the date and keeps the dialog open', async () => {
      const harness = await openDialog();
      await chooseFromDate(harness, '2026-12-01');
      await click(harness, dialogSave(harness));

      http
        .expectOne((request) => request.method === 'POST')
        .flush(
          { errors: { ChangeFrom: ['Data non valida dal server.'] } },
          { status: 400, statusText: 'Bad Request' },
        );
      await settle(harness.fixture);

      expect(dialog(harness)).not.toBeNull();
      expect(dateError(harness)).toBe('Data non valida dal server.');
      expect(notice(harness)).toBeUndefined();
    });

    it('a stale version after "Da una data" closes the dialog and shows the notice with "Ricarica"', async () => {
      const harness = await openDialog();
      await chooseFromDate(harness, '2026-12-01');
      await click(harness, dialogSave(harness));

      http
        .expectOne((request) => request.method === 'POST')
        .flush(
          { errorCode: 'Registry.Contract.ConcurrentUpdate', detail: 'Modificato da altri.' },
          { status: 409, statusText: 'Conflict' },
        );
      await settle(harness.fixture);
      http.expectOne((request) => request.url === CONTRACTS_URL).flush([]);
      http.expectOne(CONTRACT_URL).flush({ ...existing, version: 4 });
      await settle(harness.fixture);

      expect(dialog(harness)).toBeNull();
      expect(notice(harness)).toContain('Modificato da altri.');
      expect(buttonIn(harness.element.querySelector('app-notice')!, 'Ricarica')).toBeDefined();
    });

    it('"Da sempre" updates the contract in place', async () => {
      const harness = await openDialog();

      await click(harness, scopes(harness)[1]);
      expect(dialog(harness)!.querySelector('#change-from')).toBeNull();
      await click(harness, dialogSave(harness));

      const put = http.expectOne((request) => request.method === 'PUT');
      expect(put.request.url).toBe(CONTRACT_URL);
      expect(put.request.body).toMatchObject({
        requiredDocuments: ['DeliveryNote', 'WasteForm', 'DailySummary'],
        version: 3,
      });
      http.expectNone((request) => request.method === 'POST');
    });

    it.each(['Upcoming', 'Expired'] as const)(
      'a %s contract with changed terms saves in place with no dialog',
      async (status) => {
        const harness = await openExisting({ ...existing, status });
        await addWasteForm(harness);

        await click(harness, saveButtons(harness)[0]);

        expect(dialog(harness)).toBeNull();
        http.expectOne((request) => request.method === 'PUT');
      },
    );

    it('a save that changes only the validity opens no dialog', async () => {
      const harness = await openExisting();
      await click(harness, buttonIn(questions(harness)[0], 'Modifica'));
      await confirmValidity(harness, '2026-04-01', '2027-06-30');

      await click(harness, saveButtons(harness)[0]);

      expect(dialog(harness)).toBeNull();
      expect(http.expectOne((request) => request.method === 'PUT').request.body).toMatchObject({
        validTo: '2027-06-30',
      });
    });

    it('a save with no change opens no dialog', async () => {
      const harness = await openExisting();

      await click(harness, saveButtons(harness)[0]);

      expect(dialog(harness)).toBeNull();
      http.expectOne((request) => request.method === 'PUT');
    });
  });

  describe('location rates', () => {
    const RATEABLE_URL = '/api/registry/locations/rateable';
    const CHANGE_URL = `${CONTRACT_URL}/change-from-date`;

    const rateable = [
      { id: 'l1', name: 'Cantiere A14', municipality: 'Chieti Scalo' },
      { id: 'l2', name: 'Discarica Cerratina', municipality: 'Lanciano' },
      { id: 'l3', name: 'Magazzino centrale', municipality: 'Pescara' },
    ];

    const location = (index: number, status: 'Active' | 'Deactivated' = 'Active') => ({
      ...rateable[index],
      status,
    });

    const stored = (over: Partial<ContractLocationRate> = {}): ContractLocationRate => ({
      pickup: location(0),
      delivery: null,
      dayPrice: 30,
      nightPrice: 42,
      nightCallFee: 35,
      minimumRule: 'None',
      minimumAmount: null,
      minimumThreshold: null,
      minimumOveragePrice: null,
      ...over,
    });

    const pairs: Contract = {
      ...existing,
      billingLevel: 'PerLocationPair',
      locationRates: [
        stored({ pickup: location(2), delivery: location(0) }),
        stored({ pickup: location(0), delivery: location(1), dayPrice: 38 }),
      ],
    };

    const questionSix = (harness: Harness) =>
      questions(harness).find((q) => text(q.querySelector('.pt-question__number')) === '6')!;

    /** The lines of the closed answer of question 6: the count, then one per rate. */
    const answerLines = (harness: Harness) =>
      Array.from(questionSix(harness).querySelectorAll('.pt-question__answer > span')).map((l) =>
        text(l),
      );

    const current = (harness: Harness) =>
      harness.element.querySelector('.pt-question[aria-current="step"]')!;

    const flushRateable = async (harness: Harness) => {
      http.match(RATEABLE_URL).forEach((request) => request.flush(rateable));
      await settle(harness.fixture);
    };

    /** Question 8 follows question 6: its vehicles are read, and the answer is "No". */
    const answerNoVehicleRatesOfLocations = async (harness: Harness) => {
      http.match('/api/registry/vehicles/rateable').forEach((request) => request.flush([]));
      await answerNoVehicleRates(harness);
    };

    /** A new location contract by the hour answered up to the night surcharge: question 6 is the open one. */
    const openAtRates = async (level: string, night: 'No' | 'Sì' = 'No') => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'Sì');
      await choose(harness, level);
      await choose(harness, 'A ore');
      await choose(harness, night);
      await flushRateable(harness);
      return harness;
    };

    const dialogField = (harness: Harness, name: string) =>
      harness.element.querySelector<HTMLInputElement>(
        `form[id^="rate-dialog-"] input[id$="-${name}"]`,
      )!;

    const typeInDialog = (harness: Harness, name: string, value: string) => {
      const input = dialogField(harness, name);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };

    const submitDialog = async (harness: Harness) => {
      harness.element
        .querySelector('form[id^="rate-dialog-"]')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(harness.fixture);
    };

    /** Adds a rate for the location `id` through "Aggiungi tariffa"; the night prices only on a contract with the surcharge. */
    const addRate = async (harness: Harness, id: string, day: string, night?: [string, string]) => {
      await click(harness, buttonIn(questionSix(harness), 'Aggiungi tariffa'));
      const select = harness.element.querySelector<HTMLSelectElement>(
        'form[id^="rate-dialog-"] select',
      )!;
      select.value = id;
      select.dispatchEvent(new Event('change'));
      typeInDialog(harness, 'day', day);
      if (night !== undefined) {
        typeInDialog(harness, 'night', night[0]);
        typeInDialog(harness, 'callFee', night[1]);
      }
      await submitDialog(harness);
    };

    const rowTerms = (harness: Harness) =>
      Array.from(questionSix(harness).querySelectorAll('app-contract-rate-rows li .pt-muted')).map(
        (row) => text(row),
      );

    const put = () => http.expectOne((request) => request.method === 'PUT');

    it.each([
      [
        'Solo partenza',
        'Quali sono le tariffe per luogo di partenza?',
        'Un viaggio usa la tariffa del suo luogo di partenza. Il cliente può partire solo dai luoghi con una tariffa.',
      ],
      [
        'Solo consegna',
        'Quali sono le tariffe per luogo di consegna?',
        'Un viaggio usa la tariffa del suo luogo di consegna. Il cliente può consegnare solo nei luoghi con una tariffa.',
      ],
      [
        'Entrambi',
        'Quali sono le tariffe per coppia di luoghi?',
        'Un viaggio usa la tariffa della sua partenza e della sua consegna, in quel verso.',
      ],
    ])(
      'for "%s" question 6 reads its title and hint, asks no flat rate, no minimum and no vehicle rates',
      async (level, title, hint) => {
        const harness = await openAtRates(level);

        expect(text(current(harness).querySelector('h3'))).toBe(title);
        expect(text(current(harness).querySelector('.pt-muted'))).toBe(hint);
        expect(buttonIn(current(harness), 'Aggiungi tariffa')).toBeDefined();
        expect(buttonIn(current(harness), 'Conferma')).toBeDefined();
        expect(harness.element.querySelector('#rate-day')).toBeNull();
        expect(titles(harness)).not.toContain('Vuoi impostare un minimo fatturabile?');
        expect(titles(harness)).not.toContain('Ci sono mezzi con una tariffa diversa?');
        expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
      },
    );

    it('the rateable locations are read once when question 6 of a location contract opens', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'Sì');
      await choose(harness, 'Solo consegna');
      await choose(harness, 'A ore');
      expect(http.match(RATEABLE_URL)).toHaveLength(0);

      await choose(harness, 'No');

      expect(http.match(RATEABLE_URL)).toHaveLength(1);
    });

    it('on a new contract the dialog reads the locations again after a failed read', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'Sì');
      await choose(harness, 'Solo consegna');
      await choose(harness, 'A ore');
      await choose(harness, 'No');
      http.expectOne(RATEABLE_URL).flush(null, { status: 500, statusText: 'Server Error' });
      await settle(harness.fixture);

      await click(harness, buttonIn(questionSix(harness), 'Aggiungi tariffa'));
      await flushRateable(harness);

      expect(questionSix(harness).querySelectorAll('form select option').length).toBe(
        rateable.length + 1,
      );
      expect(questionSix(harness).querySelector('form .pt-field__error')).toBeNull();
    });

    it('a flat rate contract does not read the rateable locations', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'No');
      await choose(harness, 'A ore');
      await choose(harness, 'No');

      expect(http.match(RATEABLE_URL)).toHaveLength(0);
      expect(harness.element.querySelector('app-contract-location-rates')).toBeNull();
    });

    it('answering the night surcharge moves the focus to the first button of question 6, which has no input', async () => {
      const harness = await openAtRates('Solo consegna');

      expect(document.activeElement).toBe(buttonIn(questionSix(harness), 'Aggiungi tariffa'));
    });

    it('"Conferma" without a rate shows "Aggiungi almeno una tariffa." and the contract cannot be saved', async () => {
      const harness = await openAtRates('Solo consegna');

      await click(harness, buttonIn(questionSix(harness), 'Conferma'));

      expect(text(questionSix(harness).querySelector('[role="alert"]'))).toBe(
        'Aggiungi almeno una tariffa.',
      );
      expect(current(harness)).toBe(questionSix(harness));
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
    });

    it('a rate added and confirmed answers question 6, completes the contract and is saved with its ids and no flat rate', async () => {
      const harness = await openAtRates('Solo consegna');
      await addRate(harness, 'l2', '38,5');
      expect(rowTerms(harness)).toEqual(['38,50 €/h · nessun minimo']);

      await click(harness, buttonIn(questionSix(harness), 'Conferma'));

      expect(answerLines(harness)).toEqual([
        '1 luogo con tariffa',
        'Discarica Cerratina, Lanciano · 38,50 €/h · nessun minimo',
      ]);
      await answerNoVehicleRatesOfLocations(harness);
      await click(harness, buttonIn(harness.element, 'Conferma selezione'));
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([false, false]);
      await click(harness, saveButtons(harness)[0]);
      expect(lastPost().request.body).toMatchObject({
        billingLevel: 'PerDeliveryLocation',
        dayPrice: null,
        nightPrice: null,
        minimumRule: null,
        vehicleRates: [],
        locationRates: [
          {
            pickupLocationId: null,
            deliveryLocationId: 'l2',
            dayPrice: 38.5,
            nightPrice: null,
            nightCallFee: null,
            minimumRule: 'None',
          },
        ],
      });
    });

    it.each([
      [existing, '1 luogo con tariffa'],
      [
        { ...existing, locationRates: [stored(), stored({ pickup: location(1) })] },
        '2 luoghi con tariffa',
      ],
      [{ ...pairs, locationRates: [pairs.locationRates[0]] }, '1 coppia con tariffa'],
      [pairs, '2 coppie con tariffa'],
    ])('the closed answer counts the rates ("%#")', async (contract, count) => {
      const harness = await openExisting(contract);

      expect(answerLines(harness)[0]).toBe(count);
      expect(answerLines(harness)).toHaveLength(1 + contract.locationRates.length);
    });

    it('the closed answer lists the pairs by pickup, then delivery, with their terms', async () => {
      const harness = await openExisting(pairs);

      expect(answerLines(harness)).toEqual([
        '2 coppie con tariffa',
        'Cantiere A14, Chieti Scalo → Discarica Cerratina, Lanciano · 38,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 € · nessun minimo',
        'Magazzino centrale, Pescara → Cantiere A14, Chieti Scalo · 30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 € · nessun minimo',
      ]);
    });

    it('a rate of a deactivated location keeps its row with the pill "Disattivato" and saves unchanged', async () => {
      const harness = await openExisting({
        ...existing,
        locationRates: [stored({ pickup: location(0, 'Deactivated') })],
      });

      expect(answerLines(harness)[1]).toBe(
        'Cantiere A14, Chieti Scalo Disattivato · 30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 € · nessun minimo',
      );
      expect(questionSix(harness).querySelectorAll('.pt-pill--danger')).toHaveLength(1);

      await click(harness, saveButtons(harness)[0]);

      expect(put().request.body).toMatchObject({
        locationRates: [{ pickupLocationId: 'l1', dayPrice: 30, nightPrice: 42, nightCallFee: 35 }],
      });
    });

    it('a location contract stored without rates opens with question 6 as the current one and cannot be saved', async () => {
      const harness = await openExisting({ ...existing, locationRates: [] });
      await flushRateable(harness);

      expect(current(harness)).toBe(questionSix(harness));
      expect(buttonIn(current(harness), 'Aggiungi tariffa')).toBeDefined();
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);

      await addRate(harness, 'l1', '30', ['40', '35']);
      await click(harness, buttonIn(questionSix(harness), 'Conferma'));

      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([false, false]);
    });

    it('changing a rate of a contract in force asks from when and "Da una data" sends the rates as written on the page', async () => {
      const harness = await openExisting();
      await click(harness, buttonIn(questionSix(harness), 'Modifica'));
      await flushRateable(harness);
      await click(harness, buttonIn(questionSix(harness), 'Modifica'));
      typeInDialog(harness, 'day', '31');
      await submitDialog(harness);
      await click(harness, buttonIn(questionSix(harness), 'Conferma'));

      await click(harness, saveButtons(harness)[0]);

      const dialog = harness.element.querySelector('dialog')!;
      expect(text(dialog.querySelector('.pt-title'))).toBe('Da quando valgono le modifiche?');
      await click(harness, dialog.querySelectorAll('input[name="change-scope"]')[0]);
      const date = dialog.querySelector<HTMLInputElement>('#change-from')!;
      date.value = '2026-12-01';
      date.dispatchEvent(new Event('input'));
      await click(harness, buttonIn(dialog, 'Salva'));
      const post = http.expectOne((request) => request.method === 'POST');
      expect(post.request.url).toBe(CHANGE_URL);
      expect(post.request.body).toMatchObject({
        changeFrom: '2026-12-01',
        locationRates: [{ pickupLocationId: 'l1', dayPrice: 31, nightPrice: 42, nightCallFee: 35 }],
      });
    });

    it('reopening and confirming question 6 without a change is no change of the terms', async () => {
      const harness = await openExisting();
      await click(harness, buttonIn(questionSix(harness), 'Modifica'));
      await flushRateable(harness);

      await click(harness, buttonIn(questionSix(harness), 'Conferma'));
      await click(harness, saveButtons(harness)[0]);

      expect(harness.element.querySelector('dialog')).toBeNull();
      put();
    });

    it('on a deactivated customer the rates are shown without "Modifica"', async () => {
      const harness = await render('/customers/c1/contracts/k1');
      http.expectOne(CUSTOMER_URL).flush({ ...customer, status: 'Deactivated' });
      http.expectOne(CONTRACTS_URL).flush([]);
      http.expectOne(CONTRACT_URL).flush(existing);
      await settle(harness.fixture);

      expect(answerLines(harness)[0]).toBe('1 luogo con tariffa');
      expect(buttonIn(questionSix(harness), 'Modifica')).toBeUndefined();
      expect(http.match(RATEABLE_URL)).toHaveLength(0);
    });

    const openDeactivated = async (contract: Contract) => {
      const harness = await render('/customers/c1/contracts/k1');
      http.expectOne(CUSTOMER_URL).flush({ ...customer, status: 'Deactivated' });
      http.expectOne(CONTRACTS_URL).flush([]);
      http.expectOne(CONTRACT_URL).flush(contract);
      await settle(harness.fixture);
      return harness;
    };

    it('on a deactivated customer a location contract stored without rates shows question 6 with no answer and no controls', async () => {
      const harness = await openDeactivated({ ...existing, locationRates: [] });

      expect(text(questionSix(harness).querySelector('h3'))).toBe(
        'Quali sono le tariffe per luogo di partenza?',
      );
      expect(questionSix(harness).querySelector('button')).toBeNull();
      expect(questionSix(harness).querySelector('.pt-question__answer')).toBeNull();
      expect(harness.element.querySelector('app-contract-location-rates')).toBeNull();
      expect(http.match(RATEABLE_URL)).toHaveLength(0);
    });

    it('on a deactivated customer a flat contract stored without a rate shows question 6 with no fields', async () => {
      const harness = await openDeactivated({
        ...existing,
        billingLevel: 'FlatRate',
        locationRates: [],
        nightSurcharge: false,
      });

      expect(text(questionSix(harness).querySelector('h3'))).toBe('Qual è la tariffa del cliente?');
      expect(questionSix(harness).querySelector('input, button')).toBeNull();
    });

    it('a new contract with locations does not show question 6 before the mode and the night are answered', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'Sì');
      await choose(harness, 'Solo consegna');
      expect(titles(harness)).not.toContain('Quali sono le tariffe per luogo di consegna?');

      await choose(harness, 'A ore');
      expect(titles(harness)).not.toContain('Quali sono le tariffe per luogo di consegna?');

      await choose(harness, 'No');
      expect(titles(harness)).toContain('Quali sono le tariffe per luogo di consegna?');
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
    });

    it('a pair of a location with itself shows once on its line', async () => {
      const harness = await openExisting({
        ...existing,
        billingLevel: 'PerLocationPair',
        locationRates: [stored({ pickup: location(0), delivery: location(0) })],
      });

      expect(answerLines(harness)[1]).toBe(
        'Cantiere A14, Chieti Scalo → Cantiere A14, Chieti Scalo · 30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 € · nessun minimo',
      );
    });

    it('the refusal of the backend for a location is shown at the top of the page', async () => {
      const harness = await openAtRates('Solo consegna');
      await addRate(harness, 'l2', '30');
      await click(harness, buttonIn(questionSix(harness), 'Conferma'));
      await answerNoVehicleRatesOfLocations(harness);
      await click(harness, buttonIn(harness.element, 'Conferma selezione'));
      await click(harness, saveButtons(harness)[0]);

      lastPost().flush(
        {
          errorCode: 'Registry.Contract.LocationRateDeactivatedLocation',
          detail:
            'Il luogo Discarica Cerratina, Lanciano è disattivato: non si può aggiungere una sua tariffa.',
        },
        { status: 400, statusText: 'Bad Request' },
      );
      const scrolled: Element[] = [];
      stubScrollIntoView((element) => scrolled.push(element));
      await settle(harness.fixture);

      expect(notice(harness)).toContain(
        'Il luogo Discarica Cerratina, Lanciano è disattivato: non si può aggiungere una sua tariffa.',
      );
      expect(scrolled).toEqual([harness.element.querySelector('app-notice')]);
    });

    it.each([
      ['the billing level between pickup and delivery', 2, 'Solo consegna'],
      ['the pricing mode', 3, 'A km'],
    ])('changing %s clears the rates and asks question 6 again', async (_what, index, picked) => {
      const harness = await openExisting();

      await click(harness, buttonIn(questions(harness)[index], 'Modifica'));
      await choose(harness, picked);

      expect(current(harness)).toBe(questionSix(harness));
      expect(questionSix(harness).querySelector('app-contract-rate-rows')).toBeNull();
      expect(text(questionSix(harness).querySelector('.pt-empty .pt-title'))).toBe(
        'Nessuna tariffa',
      );
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
    });

    it('moving the billing level away from the flat rate clears the rate and the minimum and asks the rates of the locations', async () => {
      const harness = await openExisting({
        ...existing,
        billingLevel: 'FlatRate',
        locationRates: [],
        dayPrice: 30,
        nightPrice: 42,
        nightCallFee: 35,
        minimumRule: 'TieredOverage',
        minimumAmount: 50,
        minimumThreshold: 4,
        minimumOveragePrice: 12,
      });
      const state = harness.page() as unknown as {
        rate: () => unknown;
        minimum: () => unknown;
      };

      await click(harness, buttonIn(questions(harness)[1], 'Modifica'));
      await choose(harness, 'Sì');
      await choose(harness, 'Solo partenza');

      expect([state.rate(), state.minimum()]).toEqual([null, null]);
      expect(text(current(harness).querySelector('h3'))).toBe(
        'Quali sono le tariffe per luogo di partenza?',
      );
      expect(titles(harness)).not.toContain('Vuoi impostare un minimo fatturabile?');
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
    });

    it('going back to the flat rate drops the location rates from the save', async () => {
      const harness = await openExisting();
      await click(harness, buttonIn(questions(harness)[1], 'Modifica'));
      await choose(harness, 'No');

      expect(text(current(harness).querySelector('h3'))).toBe('Qual è la tariffa del cliente?');
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
      expect(
        (harness.page() as unknown as { locationRates: () => unknown[] }).locationRates(),
      ).toEqual([]);
    });

    it('removing the night surcharge clears the night values of the rates only', async () => {
      const harness = await openExisting();

      await click(harness, buttonIn(questions(harness)[4], 'Modifica'));
      await choose(harness, 'No');

      expect(answerLines(harness)).toEqual([
        '1 luogo con tariffa',
        'Cantiere A14, Chieti Scalo · 30,00 €/h · nessun minimo',
      ]);
      await saveInPlace(harness, 1);
      expect(put().request.body).toMatchObject({
        nightSurcharge: false,
        locationRates: [
          { pickupLocationId: 'l1', dayPrice: 30, nightPrice: null, nightCallFee: null },
        ],
      });
    });

    it('adding the night surcharge keeps the rates and asks question 6 again, naming the first row without night prices', async () => {
      const harness = await openExisting({
        ...existing,
        nightSurcharge: false,
        locationRates: [stored({ nightPrice: null, nightCallFee: null })],
      });

      await click(harness, buttonIn(questions(harness)[4], 'Modifica'));
      await choose(harness, 'Sì');

      expect(current(harness)).toBe(questionSix(harness));
      expect(rowTerms(harness)).toEqual(['30,00 €/h · nessun minimo']);
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);

      await click(harness, buttonIn(questionSix(harness), 'Conferma'));
      expect(text(questionSix(harness).querySelector('[role="alert"]'))).toBe(
        'Completa i prezzi notturni: Cantiere A14, Chieti Scalo.',
      );

      await flushRateable(harness);
      await click(harness, buttonIn(questionSix(harness), 'Modifica'));
      expect(dialogField(harness, 'day').value).toBe('30');
    });

    it('rows left as they are by "Conferma" do not give the question a new answer', async () => {
      const harness = await openExisting();
      await click(harness, buttonIn(questionSix(harness), 'Modifica'));
      await flushRateable(harness);
      const state = harness.page() as unknown as { locationRates: () => unknown };
      const before = state.locationRates();

      await click(harness, buttonIn(questionSix(harness), 'Conferma'));

      expect(state.locationRates()).toBe(before);
    });
  });

  describe('vehicle rates', () => {
    const RATEABLE_URL = '/api/registry/vehicles/rateable';

    const rateable = [
      { id: 'v1', licensePlate: 'AB123CD', description: 'Autospurgo Scania P410' },
      { id: 'v2', licensePlate: 'GH456JK', description: 'Gru mobile 15t' },
    ];

    const storedRate = (over: Partial<ContractVehicleRate> = {}): ContractVehicleRate => ({
      vehicleId: 'v1',
      licensePlate: 'AB123CD',
      description: 'Autospurgo Scania P410',
      vehicleStatus: 'Active',
      pickup: null,
      delivery: null,
      dayPrice: 55,
      nightPrice: 70,
      nightCallFee: 40,
      minimumRule: 'FixedMinimum',
      minimumAmount: 120,
      minimumThreshold: null,
      minimumOveragePrice: null,
      ...over,
    });

    const decommissioned = storedRate({
      vehicleId: 'v2',
      licensePlate: 'GH456JK',
      description: 'Gru mobile 15t',
      vehicleStatus: 'Decommissioned',
      dayPrice: 48,
      nightPrice: 60,
      nightCallFee: 40,
      minimumRule: 'None',
      minimumAmount: null,
    });

    const withRates: Contract = {
      ...existing,
      locationRates: [],
      billingLevel: 'FlatRate',
      nightSurcharge: true,
      dayPrice: 30,
      nightPrice: 42,
      nightCallFee: 35,
      minimumRule: 'None',
      vehicleRates: [storedRate(), decommissioned],
    };

    const flushRateable = async (harness: Harness) => {
      http.match(RATEABLE_URL).forEach((request) => request.flush(rateable));
      await settle(harness.fixture);
    };

    const state = (harness: Harness) =>
      harness.page() as unknown as {
        vehicleRates: () => { rate: unknown; vehicleId: string }[] | null;
      };

    const questionEight = (harness: Harness) =>
      questions(harness).find((q) => text(q.querySelector('.pt-question__number')) === '8')!;

    /** The lines under the answer of question 8: the count, then one per vehicle. */
    const answerLines = (harness: Harness) =>
      Array.from(questionEight(harness).querySelectorAll('.pt-question__answer > span')).map((l) =>
        text(l),
      );

    const unsaved = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    /** A new flat-rate contract by the hour, no night surcharge, answered up to question 8. */
    const openAtVehicleRates = async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'No');
      await choose(harness, 'A ore');
      await choose(harness, 'No');
      await answerRate(harness);
      await answerNoMinimum(harness);
      await flushRateable(harness);
      return harness;
    };

    const current = (harness: Harness) =>
      harness.element.querySelector('.pt-question[aria-current="step"]')!;

    const modifyOf = (harness: Harness, index: number) =>
      buttonIn(questions(harness)[index], 'Modifica');

    it('question 8 follows the minimum and the documents are 9; a contract priced by trip has it after the rate', async () => {
      const harness = await openAtVehicleRates();

      expect(text(current(harness).querySelector('h3'))).toBe(
        'Ci sono mezzi con una tariffa diversa?',
      );
      expect(titles(harness).slice(-2)).toEqual([
        'Vuoi impostare un minimo fatturabile?',
        'Ci sono mezzi con una tariffa diversa?',
      ]);
    });

    it('a contract priced by trip has question 8 right after the rate', async () => {
      const byTrip = await openNew();
      await confirmValidity(byTrip, '2027-01-01');
      await choose(byTrip, 'No');
      await choose(byTrip, 'A viaggio');
      await choose(byTrip, 'No');
      await answerRate(byTrip);
      expect(text(current(byTrip).querySelector('h3'))).toBe(
        'Ci sono mezzi con una tariffa diversa?',
      );
      expect(text(current(byTrip).querySelector('.pt-question__number'))).toBe('8');
    });

    it('the texts of question 8, open and closed, speak of "tariffa propria" and never of the internal term', async () => {
      const open = await openAtVehicleRates();
      await choose(open, 'Sì');
      const openText = text(questionEight(open))!;

      expect(openText).toContain('tariffa propria');
      expect(openText.toLowerCase()).not.toContain('override');
    });

    it('the closed answers of question 8 never use the internal term', async () => {
      const closed = await openExisting(withRates);
      const closedText = text(questionEight(closed))!;

      expect(closedText).toContain('2 mezzi con tariffa propria');
      expect(closedText.toLowerCase()).not.toContain('override');
    });

    it('answered "No" the question 8 text never uses the internal term', async () => {
      const none = await openExisting({ ...withRates, vehicleRates: [] });

      expect(text(questionEight(none))!.toLowerCase()).not.toContain('override');
    });

    it('a flat-rate contract keeps question 8 before the documents, with its own hint', async () => {
      const harness = await openExisting(withRates);

      expect(titles(harness).slice(-2)).toEqual([
        'Ci sono mezzi con una tariffa diversa?',
        'Quali documenti sono obbligatori?',
      ]);
      expect(text(questionEight(harness).querySelector('.pt-muted'))).toBe(
        'Per esempio autospurghi, gru o walking floor. Un viaggio fatto con uno di questi mezzi usa la sua tariffa al posto di quella del cliente.',
      );
    });

    it('the closed answer counts the vehicles and tells one line each, with the mark of a decommissioned one', async () => {
      const harness = await openExisting(withRates);

      expect(answerLines(harness)).toEqual([
        '2 mezzi con tariffa propria',
        'AB123CD Autospurgo Scania P410 · 55,00 €/h di giorno · 70,00 €/h di notte · chiamata 40,00 € · minimo 120,00 €',
        'GH456JK Gru mobile 15t Dismesso · 48,00 €/h di giorno · 60,00 €/h di notte · chiamata 40,00 € · nessun minimo',
      ]);
      expect(questionEight(harness).querySelectorAll('.pt-pill--warn').length).toBe(1);
      expect(questionEight(harness).querySelector('.pt-mono')?.textContent).toBe('AB123CD');
    });

    it('the closed answer lists the vehicles by plate, whatever the order of the stored contract', async () => {
      const harness = await openExisting({
        ...withRates,
        vehicleRates: [decommissioned, storedRate()],
      });

      expect(
        answerLines(harness)
          .slice(1)
          .map((line) => line!.split(' ')[0]),
      ).toEqual(['AB123CD', 'GH456JK']);
    });

    it('one vehicle reads "1 mezzo con tariffa propria"', async () => {
      const harness = await openExisting({ ...withRates, vehicleRates: [storedRate()] });

      expect(answerLines(harness)[0]).toBe('1 mezzo con tariffa propria');
    });

    it('answered "No" the question reads "Stessa tariffa per tutti i mezzi"', async () => {
      const harness = await openExisting({ ...withRates, vehicleRates: [] });

      expect(text(questionEight(harness).querySelector('.pt-question__answer'))).toBe(
        'Stessa tariffa per tutti i mezzi',
      );
    });

    it('a contract with a decommissioned vehicle saves with its vehicle rates unchanged', async () => {
      const harness = await openExisting(withRates);

      await click(harness, saveButtons(harness)[1]);

      expect(harness.element.querySelector('dialog')).toBeNull();
      expect(http.expectOne((request) => request.method === 'PUT').request.body).toMatchObject({
        vehicleRates: [
          {
            vehicleId: 'v1',
            dayPrice: 55,
            nightPrice: 70,
            nightCallFee: 40,
            minimumRule: 'FixedMinimum',
            minimumAmount: 120,
            minimumThreshold: null,
            minimumOveragePrice: null,
          },
          {
            vehicleId: 'v2',
            dayPrice: 48,
            nightPrice: 60,
            nightCallFee: 40,
            minimumRule: 'None',
            minimumAmount: null,
            minimumThreshold: null,
            minimumOveragePrice: null,
          },
        ],
      });
    });

    it('a vehicle rate confirmed on the page is saved with the contract by "Salva contratto"', async () => {
      const harness = await openAtVehicleRates();
      await choose(harness, 'Sì');
      await click(harness, buttonIn(current(harness), 'Aggiungi un mezzo'));
      const select = harness.element.querySelector<HTMLSelectElement>(
        'form[id^="rate-dialog-"] select',
      )!;
      select.value = 'v1';
      select.dispatchEvent(new Event('change'));
      type(
        harness,
        harness.element.querySelector('form[id^="rate-dialog-"] input[id$="-day"]')!.id,
        '55',
      );
      harness.element
        .querySelector('form[id^="rate-dialog-"]')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(harness.fixture);
      await click(harness, buttonIn(current(harness), 'Conferma'));

      expect(answerLines(harness)).toEqual([
        '1 mezzo con tariffa propria',
        'AB123CD Autospurgo Scania P410 · 55,00 €/h · nessun minimo',
      ]);
      await click(harness, buttonIn(harness.element, 'Conferma selezione'));
      await click(harness, saveButtons(harness)[0]);

      expect(lastPost().request.body).toMatchObject({
        billingLevel: 'FlatRate',
        vehicleRates: [
          {
            vehicleId: 'v1',
            dayPrice: 55,
            nightPrice: null,
            nightCallFee: null,
            minimumRule: 'None',
            minimumAmount: null,
            minimumThreshold: null,
            minimumOveragePrice: null,
          },
        ],
      });
    });

    it('answering "No" saves an empty list of vehicle rates', async () => {
      const harness = await openAtVehicleRates();
      await answerNoVehicleRates(harness);
      await click(harness, buttonIn(harness.element, 'Conferma selezione'));
      await click(harness, saveButtons(harness)[0]);

      expect(lastPost().request.body).toMatchObject({ vehicleRates: [] });
    });

    it('changing the vehicle rates of a contract in force asks from when the change holds', async () => {
      const harness = await openExisting(withRates);
      await click(harness, modifyOf(harness, 6));
      await flushRateable(harness);
      await choose(harness, 'No');

      expect(state(harness).vehicleRates()).toEqual([]);
      await click(harness, saveButtons(harness)[1]);

      expect(harness.element.querySelector('dialog input[name="change-scope"]')).not.toBeNull();
    });

    it('re-confirming question 8 unchanged after a vehicle description changed elsewhere opens no change dialog and leaves no unsaved changes', async () => {
      const harness = await openExisting(withRates);
      await click(harness, modifyOf(harness, 6));
      http.match(RATEABLE_URL).forEach((request) =>
        request.flush([
          { ...rateable[0], description: 'Autospurgo Scania P450' },
          { ...rateable[1], description: 'Gru mobile 20t' },
        ]),
      );
      await settle(harness.fixture);
      await click(harness, buttonIn(current(harness), 'Conferma'));

      expect(answerLines(harness)[1]).toContain('Autospurgo Scania P450');
      expect(unsaved()).toBe(false);
      await click(harness, saveButtons(harness)[1]);
      expect(harness.element.querySelector('dialog input[name="change-scope"]')).toBeNull();
    });

    it('reopening question 8 never shows the previous vehicles while the new read is pending, then shows the new ones', async () => {
      const harness = await openExisting(withRates);
      await click(harness, modifyOf(harness, 6));
      http
        .match(RATEABLE_URL)
        .forEach((request) =>
          request.flush([{ id: 'v3', licensePlate: 'XY111ZZ', description: 'Betoniera vecchia' }]),
        );
      await settle(harness.fixture);
      await click(harness, buttonIn(harness.element, 'Annulla modifica'));

      await click(harness, modifyOf(harness, 6));
      await click(harness, buttonIn(current(harness), 'Aggiungi un mezzo'));
      const options = () =>
        Array.from(
          harness.element.querySelector<HTMLSelectElement>('form[id^="rate-dialog-"] select')!
            .options,
        )
          .map((o) => o.textContent!)
          .join('|');
      expect(options()).not.toContain('Betoniera vecchia');

      http
        .match(RATEABLE_URL)
        .forEach((request) =>
          request.flush([{ id: 'v4', licensePlate: 'QQ222WW', description: 'Betoniera nuova' }]),
        );
      await settle(harness.fixture);
      expect(options()).toContain('Betoniera nuova');
      expect(options()).not.toContain('Betoniera vecchia');
    });

    it('the vehicle rates of a deactivated customer are shown without "Modifica"', async () => {
      const harness = await render('/customers/c1/contracts/k1');
      http.expectOne(CUSTOMER_URL).flush({ ...customer, status: 'Deactivated' });
      http.expectOne(CONTRACTS_URL).flush([]);
      http.expectOne(CONTRACT_URL).flush(withRates);
      await settle(harness.fixture);

      expect(answerLines(harness)[0]).toBe('2 mezzi con tariffa propria');
      expect(buttonIn(questionEight(harness), 'Modifica')).toBeUndefined();
      http.expectNone(RATEABLE_URL);
    });

    it('a new pricing mode clears the vehicle rates and asks them again', async () => {
      const harness = await openExisting(withRates);
      await click(harness, modifyOf(harness, 2));
      await choose(harness, 'A km');

      expect(state(harness).vehicleRates()).toBeNull();
      expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true]);
    });

    it('moving the billing level away from the flat rate clears the vehicle rates, and going back asks them again', async () => {
      const harness = await openExisting(withRates);
      await click(harness, modifyOf(harness, 1));
      await choose(harness, 'Sì');
      expect(state(harness).vehicleRates()).toBeNull();

      await choose(harness, 'Solo partenza');
      await click(harness, modifyOf(harness, 1));
      await choose(harness, 'No');
      expect(state(harness).vehicleRates()).toBeNull();
    });

    it('removing the night surcharge clears the night price and the night call fee of every vehicle rate only', async () => {
      const harness = await openExisting(withRates);
      await click(harness, modifyOf(harness, 3));
      await choose(harness, 'No');

      expect(
        state(harness)
          .vehicleRates()
          ?.map((entry) => [entry.vehicleId, entry.rate]),
      ).toEqual([
        ['v1', { day: 55, night: null, callFee: null }],
        ['v2', { day: 48, night: null, callFee: null }],
      ]);
      expect(answerLines(harness)[1]).toBe(
        'AB123CD Autospurgo Scania P410 · 55,00 €/h · minimo 120,00 €',
      );
    });

    it('adding the night surcharge keeps the vehicle rates of a flat-rate contract and asks question 8 again after the rate', async () => {
      const harness = await openExisting({
        ...withRates,
        nightSurcharge: false,
        nightPrice: null,
        nightCallFee: null,
        vehicleRates: [storedRate({ nightPrice: null, nightCallFee: null })],
      });
      await click(harness, modifyOf(harness, 3));
      await choose(harness, 'Sì');

      expect(state(harness).vehicleRates()).toHaveLength(1);
      type(harness, 'rate-day', '30');
      type(harness, 'rate-night', '42');
      type(harness, 'rate-callFee', '35');
      await click(harness, buttonIn(harness.element, 'Conferma'));

      expect(text(current(harness).querySelector('h3'))).toBe(
        'Ci sono mezzi con una tariffa diversa?',
      );
      expect(answerLines(harness)).toEqual([]);
    });

    it('after the night surcharge is added the card waits for question 8 to be confirmed with the night values of the vehicle rates, on a flat-rate contract', async () => {
      const harness = await openExisting({
        ...withRates,
        nightSurcharge: false,
        nightPrice: null,
        nightCallFee: null,
        vehicleRates: [storedRate({ nightPrice: null, nightCallFee: null })],
      });
      const card = () => harness.element.querySelector('app-contract-simulation');
      const page = harness.page() as unknown as {
        confirmVehicleRates: (rates: unknown[]) => void;
        vehicleRates: () => { rate: object }[] | null;
      };
      expect(card()).not.toBeNull();
      await click(harness, modifyOf(harness, 3));
      await choose(harness, 'Sì');
      type(harness, 'rate-day', '30');
      type(harness, 'rate-night', '42');
      type(harness, 'rate-callFee', '35');

      await click(harness, buttonIn(harness.element, 'Conferma'));

      expect(card()).toBeNull();
      page.confirmVehicleRates(
        page
          .vehicleRates()!
          .map((entry) => ({ ...entry, rate: { day: 55, night: 70, callFee: 40 } })),
      );
      await settle(harness.fixture);
      expect(card()).not.toBeNull();
    });

    it('a vehicle rate with night prices, written in question 8 still open, is confirmed without them once the night surcharge is removed', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'No');
      await choose(harness, 'A ore');
      await choose(harness, 'Sì');
      type(harness, 'rate-day', '30');
      type(harness, 'rate-night', '42');
      type(harness, 'rate-callFee', '35');
      await click(harness, buttonIn(harness.element, 'Conferma'));
      await answerNoMinimum(harness);
      await flushRateable(harness);
      await choose(harness, 'Sì');
      await click(harness, buttonIn(current(harness), 'Aggiungi un mezzo'));
      const select = harness.element.querySelector<HTMLSelectElement>(
        'form[id^="rate-dialog-"] select',
      )!;
      select.value = 'v1';
      select.dispatchEvent(new Event('change'));
      for (const [field, value] of [
        ['day', '55'],
        ['night', '70'],
        ['callFee', '40'],
      ]) {
        type(
          harness,
          harness.element.querySelector(`form[id^="rate-dialog-"] input[id$="-${field}"]`)!.id,
          value,
        );
      }
      harness.element
        .querySelector('form[id^="rate-dialog-"]')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(harness.fixture);

      await click(harness, modifyOf(harness, 3));
      await choose(harness, 'No');
      expect(text(current(harness).querySelector('h3'))).toBe(
        'Ci sono mezzi con una tariffa diversa?',
      );
      await click(harness, buttonIn(current(harness), 'Conferma'));

      expect(
        state(harness)
          .vehicleRates()
          ?.map((entry) => entry.rate),
      ).toEqual([{ day: 55, night: null, callFee: null }]);
    });

    it('"Annulla modifica" on question 8 brings the vehicle blocks back to the confirmed answer', async () => {
      const harness = await openExisting(withRates);
      await click(harness, modifyOf(harness, 6));
      await flushRateable(harness);
      await click(harness, current(harness).querySelector('button[data-remove]'));
      expect(current(harness).querySelectorAll('app-contract-rate-rows li').length).toBe(1);

      await click(harness, buttonIn(harness.element, 'Annulla modifica'));
      expect(answerLines(harness)[1]).toContain('55,00 €/h di giorno');
      expect(unsaved()).toBe(false);

      await click(harness, modifyOf(harness, 6));
      await flushRateable(harness);
      expect(current(harness).querySelectorAll('app-contract-rate-rows li').length).toBe(2);
    });

    it('removing every block without "Conferma" keeps the confirmed answer, and leaving the question restores the blocks', async () => {
      const harness = await openExisting(withRates);
      await click(harness, modifyOf(harness, 6));
      await flushRateable(harness);
      for (let count = 0; count < 2; count++) {
        await click(harness, current(harness).querySelector('button[data-remove]'));
      }

      expect(current(harness).querySelectorAll('app-contract-rate-rows li').length).toBe(0);
      expect(state(harness).vehicleRates()?.length).toBe(2);
      expect(unsaved()).toBe(false);

      await click(harness, buttonIn(harness.element, 'Annulla modifica'));
      expect(answerLines(harness)[0]).toBe('2 mezzi con tariffa propria');
      await click(harness, modifyOf(harness, 6));
      await flushRateable(harness);
      expect(current(harness).querySelectorAll('app-contract-rate-rows li').length).toBe(2);
    });
  });

  describe('vehicle rates of a location contract', () => {
    const LOCATIONS_URL = '/api/registry/locations/rateable';

    const places = [
      { id: 'l1', name: 'Cantiere A14', municipality: 'Chieti Scalo' },
      { id: 'l2', name: 'Discarica Cerratina', municipality: 'Lanciano' },
      { id: 'l3', name: 'Magazzino centrale', municipality: 'Pescara' },
    ];
    const location = (index: number) => ({ ...places[index], status: 'Active' as const });

    const locationRate = (index: number): ContractLocationRate => ({
      pickup: location(index),
      delivery: null,
      dayPrice: 30,
      nightPrice: 42,
      nightCallFee: 35,
      minimumRule: 'None',
      minimumAmount: null,
      minimumThreshold: null,
      minimumOveragePrice: null,
    });

    const vehicleRate = (
      index: number,
      over: Partial<ContractVehicleRate> = {},
    ): ContractVehicleRate => ({
      vehicleId: 'v1',
      licensePlate: 'AB123CD',
      description: 'Autospurgo Scania P410',
      vehicleStatus: 'Active',
      pickup: location(index),
      delivery: null,
      dayPrice: 55,
      nightPrice: 70,
      nightCallFee: 40,
      minimumRule: 'FixedMinimum',
      minimumAmount: 120,
      minimumThreshold: null,
      minimumOveragePrice: null,
      ...over,
    });

    const crane = (index: number) =>
      vehicleRate(index, {
        vehicleId: 'v2',
        licensePlate: 'GH456JK',
        description: 'Gru mobile 15t',
        vehicleStatus: 'Decommissioned',
        dayPrice: 48,
        nightPrice: 60,
        nightCallFee: 40,
        minimumRule: 'None',
        minimumAmount: null,
      });

    /** Three locations; the truck has one rate on two of them and another on the third; the crane has one on all. */
    const rated: Contract = {
      ...existing,
      locationRates: [locationRate(0), locationRate(1), locationRate(2)],
      vehicleRates: [
        vehicleRate(0),
        vehicleRate(1),
        vehicleRate(2, { dayPrice: 60, nightPrice: 78 }),
        crane(0),
        crane(1),
        crane(2),
      ],
    };

    const state = (harness: Harness) =>
      harness.page() as unknown as {
        vehicleRates: () => { vehicleId: string; places: unknown[]; rate: unknown }[] | null;
        confirmLocationRates: (confirmed: unknown) => void;
        locationRates: () => unknown[];
      };

    const numbered = (harness: Harness, number: string) =>
      questions(harness).find((q) => text(q.querySelector('.pt-question__number')) === number)!;

    const current = (harness: Harness) =>
      harness.element.querySelector('.pt-question[aria-current="step"]')!;

    const modifyOf = (harness: Harness, index: number) =>
      buttonIn(questions(harness)[index], 'Modifica');

    const answerLines = (harness: Harness) =>
      Array.from(numbered(harness, '8').querySelectorAll('.pt-question__answer > span')).map((l) =>
        text(l),
      );

    const unsaved = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    /** Reopens question 6 and answers the read of its locations. */
    const reopenLocations = async (harness: Harness) => {
      await click(harness, modifyOf(harness, 5));
      http.match(LOCATIONS_URL).forEach((request) => request.flush(places));
      await settle(harness.fixture);
    };

    it.each([
      [
        'a pickup location',
        existing,
        'Per esempio autospurghi, gru o walking floor. Nei luoghi che scegli, un viaggio fatto con uno di questi mezzi usa la sua tariffa al posto di quella del luogo.',
      ],
      [
        'a pair',
        {
          ...existing,
          billingLevel: 'PerLocationPair' as const,
          locationRates: [{ ...locationRate(0), delivery: location(1) }],
        },
        'Per esempio autospurghi, gru o walking floor. Nelle coppie che scegli, un viaggio fatto con uno di questi mezzi usa la sua tariffa al posto di quella della coppia.',
      ],
    ])(
      'for %s question 8 follows question 6, question 7 is not asked, and the hint names the places',
      async (_, contract, hint) => {
        const harness = await openExisting(contract);

        const order = titles(harness);
        expect(order.indexOf('Ci sono mezzi con una tariffa diversa?')).toBe(
          order.findIndex((title) => title?.startsWith('Quali sono le tariffe')) + 1,
        );
        expect(order.some((title) => title?.includes('minimo'))).toBe(false);
        expect(text(numbered(harness, '8').querySelector('.pt-muted'))).toBe(hint);
      },
    );

    it('the closed answer counts the vehicles once, and one row shows the places of equal rates', async () => {
      const harness = await openExisting(rated);

      expect(answerLines(harness)).toEqual([
        '2 mezzi con tariffa propria',
        'AB123CD Autospurgo Scania P410 · 55,00 €/h di giorno · 70,00 €/h di notte · chiamata 40,00 € · minimo 120,00 € · vale in 2 luoghi su 3: Cantiere A14, Chieti Scalo · Discarica Cerratina, Lanciano',
        'AB123CD Autospurgo Scania P410 · 60,00 €/h di giorno · 78,00 €/h di notte · chiamata 40,00 € · minimo 120,00 € · vale in 1 luogo su 3: Magazzino centrale, Pescara',
        'GH456JK Gru mobile 15t Dismesso · 48,00 €/h di giorno · 60,00 €/h di notte · chiamata 40,00 € · nessun minimo · vale in tutti i 3 luoghi',
      ]);
      expect(state(harness).vehicleRates()).toHaveLength(3);
    });

    it('a contract in force saves one item per place, after asking from when', async () => {
      const harness = await openExisting(rated);
      await click(harness, buttonIn(questions(harness).at(-1)!, 'Modifica'));
      await click(harness, harness.element.querySelectorAll('input[type="checkbox"]')[2]);
      await click(harness, buttonIn(questions(harness).at(-1)!, 'Conferma selezione'));
      await saveInPlace(harness, 1);

      const body = http.expectOne((request) => request.method === 'PUT').request.body;
      expect(
        body.vehicleRates.map((item: Record<string, unknown>) => [
          item['vehicleId'],
          item['pickupLocationId'],
          item['deliveryLocationId'],
          item['dayPrice'],
        ]),
      ).toEqual([
        ['v1', 'l1', null, 55],
        ['v1', 'l2', null, 55],
        ['v1', 'l3', null, 60],
        ['v2', 'l1', null, 48],
        ['v2', 'l2', null, 48],
        ['v2', 'l3', null, 48],
      ]);
    });

    it('a change of where a rate applies alone is an unsaved change of the terms, and a deactivated customer sees the question locked', async () => {
      const harness = await openExisting(rated);
      expect(unsaved()).toBe(false);
      const rates = state(harness).vehicleRates()!;

      state(harness).confirmLocationRates({
        locationRates: state(harness).locationRates(),
        vehicleRates: rates.map((entry, at) =>
          at === 0 ? { ...entry, places: entry.places.slice(0, 1) } : entry,
        ),
      });
      await settle(harness.fixture);

      expect(unsaved()).toBe(true);
      await click(harness, saveButtons(harness)[1]);
      expect(harness.element.querySelector('dialog input[name="change-scope"]')).not.toBeNull();
    });

    it('the contract of a deactivated customer shows question 8 answered and locked', async () => {
      const harness = await render('/customers/c1/contracts/k1');
      http.expectOne(CUSTOMER_URL).flush({ ...customer, status: 'Deactivated' });
      http.expectOne(CONTRACTS_URL).flush([]);
      http.expectOne(CONTRACT_URL).flush(rated);
      await settle(harness.fixture);

      expect(answerLines(harness)[0]).toBe('2 mezzi con tariffa propria');
      expect(buttonIn(numbered(harness, '8'), 'Modifica')).toBeUndefined();
    });

    it('"Duplica" then "Conferma" on question 6 gives the new place to the vehicle rates that applied on the copied one', async () => {
      const harness = await openExisting({
        ...rated,
        locationRates: [locationRate(0), locationRate(1)],
        vehicleRates: [vehicleRate(0), crane(1)],
      });
      await reopenLocations(harness);
      await click(harness, buttonIn(numbered(harness, '6'), 'Duplica'));
      const select = harness.element.querySelector<HTMLSelectElement>(
        'form[id^="rate-dialog-"] select',
      )!;
      select.value = 'l3';
      select.dispatchEvent(new Event('change'));
      harness.element
        .querySelector('form[id^="rate-dialog-"]')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(harness.fixture);
      await click(harness, buttonIn(numbered(harness, '6'), 'Conferma'));

      expect(
        state(harness)
          .vehicleRates()!
          .map((entry) => [entry.vehicleId, entry.places.length]),
      ).toEqual([
        ['v1', 2],
        ['v2', 1],
      ]);
      expect(answerLines(harness)[1]).toContain(
        'vale in 2 luoghi su 3: Cantiere A14, Chieti Scalo · Magazzino centrale, Pescara',
      );
    });

    it('"Togli" of the only place of a vehicle rate removes it, and question 8 is asked again when none is left', async () => {
      const harness = await openExisting({
        ...rated,
        locationRates: [locationRate(0), locationRate(1)],
        vehicleRates: [vehicleRate(0)],
      });
      await reopenLocations(harness);
      await click(harness, buttonIn(numbered(harness, '6'), 'Togli'));
      await click(harness, buttonIn(numbered(harness, '6'), 'Conferma'));

      expect(state(harness).vehicleRates()).toBeNull();
      expect(text(current(harness).querySelector('.pt-question__number'))).toBe('8');
    });

    it('a page without vehicle rates keeps its answer to question 8 when question 6 changes', async () => {
      const harness = await openExisting({ ...existing, vehicleRates: [] });
      const before = state(harness).vehicleRates();
      await reopenLocations(harness);
      await click(harness, buttonIn(numbered(harness, '6'), 'Conferma'));

      expect(state(harness).vehicleRates()).toBe(before);
      expect(before).toEqual([]);
    });

    it('a new billing level clears the vehicle rates with the location rates', async () => {
      const harness = await openExisting(rated);
      await click(harness, modifyOf(harness, 2));
      await choose(harness, 'Solo consegna');

      expect(state(harness).vehicleRates()).toBeNull();
      expect(state(harness).locationRates()).toEqual([]);
    });

    it('a new pricing mode clears the vehicle rates with the location rates', async () => {
      const harness = await openExisting(rated);
      await click(harness, modifyOf(harness, 3));
      await choose(harness, 'A km');

      expect(state(harness).vehicleRates()).toBeNull();
      expect(state(harness).locationRates()).toEqual([]);
    });

    it('removing the night surcharge clears the night values of every vehicle rate and keeps the places, merging the rates that become equal', async () => {
      const harness = await openExisting(rated);
      await click(harness, modifyOf(harness, 4));
      await choose(harness, 'No');

      expect(
        state(harness)
          .vehicleRates()!
          .map((entry) => [entry.vehicleId, entry.places.length, entry.rate]),
      ).toEqual([
        ['v1', 2, { day: 55, night: null, callFee: null }],
        ['v1', 1, { day: 60, night: null, callFee: null }],
        ['v2', 3, { day: 48, night: null, callFee: null }],
      ]);
    });

    it('adding the night surcharge keeps the vehicle rates of a location contract', async () => {
      const harness = await openExisting({
        ...rated,
        nightSurcharge: false,
        locationRates: rated.locationRates.map((item) => ({
          ...item,
          nightPrice: null,
          nightCallFee: null,
        })),
        vehicleRates: rated.vehicleRates.map((item) => ({
          ...item,
          nightPrice: null,
          nightCallFee: null,
        })),
      });
      await click(harness, modifyOf(harness, 4));
      await choose(harness, 'Sì');

      expect(state(harness).vehicleRates()).toHaveLength(3);
      expect(state(harness).locationRates()).toHaveLength(3);
    });

    it('after the night surcharge is added the card waits for question 8 to be confirmed with the night values of the vehicle rates, on a location contract', async () => {
      const harness = await openExisting({
        ...rated,
        nightSurcharge: false,
        locationRates: rated.locationRates.map((item) => ({
          ...item,
          nightPrice: null,
          nightCallFee: null,
        })),
        vehicleRates: rated.vehicleRates.map((item) => ({
          ...item,
          nightPrice: null,
          nightCallFee: null,
        })),
      });
      const card = () => harness.element.querySelector('app-contract-simulation');
      const page = harness.page() as unknown as {
        confirmLocationRates: (confirmed: unknown) => void;
        confirmVehicleRates: (rates: unknown[]) => void;
        vehicleRates: () => { rate: object }[];
        locationRates: () => { rate: object }[];
      };
      expect(card()).not.toBeNull();
      await click(harness, modifyOf(harness, 4));
      await choose(harness, 'Sì');
      expect(card()).toBeNull();

      page.confirmLocationRates({
        locationRates: page
          .locationRates()
          .map((entry) => ({ ...entry, rate: { day: 30, night: 42, callFee: 35 } })),
        vehicleRates: page.vehicleRates(),
      });
      await settle(harness.fixture);

      expect(card()).toBeNull();
      page.confirmVehicleRates(
        page
          .vehicleRates()
          .map((entry) => ({ ...entry, rate: { ...entry.rate, night: 70, callFee: 40 } })),
      );
      await settle(harness.fixture);
      expect(card()).not.toBeNull();
    });

    const placeIds = (
      rows: { places: { pickup: { id: string } | null; delivery: { id: string } | null }[] }[],
    ) => rows.flatMap((row) => row.places.map((place) => place.pickup?.id ?? place.delivery?.id));

    const rowOf = (harness: Harness, index: number) =>
      numbered(harness, '6').querySelectorAll('app-contract-rate-rows li')[index];

    it('after "Togli" every place of the vehicle rates is a place of the location rates', async () => {
      const harness = await openExisting(rated);
      await reopenLocations(harness);

      await click(harness, buttonIn(rowOf(harness, 0), 'Togli'));
      await click(harness, buttonIn(numbered(harness, '6'), 'Conferma'));

      const locations = (state(harness).locationRates() as { pickup: { id: string } }[]).map(
        (entry) => entry.pickup.id,
      );
      expect(locations).toEqual(['l2', 'l3']);
      const used = placeIds(state(harness).vehicleRates() as never);
      expect(used.length).toBe(4);
      expect(used.every((id) => locations.includes(id as string))).toBe(true);
    });

    it('after a location of question 6 is moved the vehicle rates that applied on it apply on the new one', async () => {
      const harness = await openExisting({
        ...rated,
        locationRates: [locationRate(0), locationRate(1)],
        vehicleRates: [vehicleRate(0), crane(1)],
      });
      await reopenLocations(harness);

      await click(harness, buttonIn(rowOf(harness, 0), 'Modifica'));
      const select = harness.element.querySelector<HTMLSelectElement>(
        'form[id^="rate-dialog-"] select',
      )!;
      select.value = 'l3';
      select.dispatchEvent(new Event('change'));
      harness.element
        .querySelector('form[id^="rate-dialog-"]')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(harness.fixture);
      await click(harness, buttonIn(numbered(harness, '6'), 'Conferma'));

      const locations = (state(harness).locationRates() as { pickup: { id: string } }[]).map(
        (entry) => entry.pickup.id,
      );
      expect(locations.sort()).toEqual(['l2', 'l3']);
      expect(placeIds(state(harness).vehicleRates() as never).sort()).toEqual(['l2', 'l3']);
    });

    it('a flat-rate contract that goes to a location level and back to the flat rate holds only the vehicle rates written after, with no place', async () => {
      const harness = await openExisting({
        ...existing,
        billingLevel: 'FlatRate',
        locationRates: [],
        nightSurcharge: true,
        dayPrice: 30,
        nightPrice: 42,
        nightCallFee: 35,
        minimumRule: 'None',
        vehicleRates: [vehicleRate(0, { pickup: null })],
      });
      expect(state(harness).vehicleRates()).toHaveLength(1);

      await click(harness, modifyOf(harness, 1));
      await choose(harness, 'Sì');
      expect(state(harness).vehicleRates()).toBeNull();
      await choose(harness, 'Solo consegna');
      expect(state(harness).vehicleRates()).toBeNull();

      await click(harness, modifyOf(harness, 1));
      await choose(harness, 'No');
      expect(state(harness).vehicleRates()).toBeNull();
      type(harness, 'rate-day', '30');
      type(harness, 'rate-night', '42');
      type(harness, 'rate-callFee', '35');
      await click(harness, buttonIn(harness.element, 'Conferma'));
      await choose(harness, 'Nessun minimo');
      await click(harness, buttonIn(harness.element, 'Conferma'));
      http.match('/api/registry/vehicles/rateable').forEach((request) => request.flush([]));
      await settle(harness.fixture);
      (
        harness.page() as unknown as { confirmVehicleRates: (rates: unknown[]) => void }
      ).confirmVehicleRates([
        {
          vehicleId: 'v1',
          licensePlate: 'AB123CD',
          description: 'Autospurgo Scania P410',
          decommissioned: false,
          rate: { day: 55, night: 70, callFee: 40 },
          minimum: null,
          places: [],
        },
      ]);
      await settle(harness.fixture);

      expect(state(harness).vehicleRates()).toHaveLength(1);
      expect(placeIds(state(harness).vehicleRates() as never)).toEqual([]);
      await saveInPlace(harness, 1);
      const body = http.expectOne((request) => request.method === 'PUT').request.body;
      expect(body.billingLevel).toBe('FlatRate');
      expect(body.locationRates).toEqual([]);
      expect(body.vehicleRates).toEqual([
        expect.objectContaining({
          vehicleId: 'v1',
          pickupLocationId: null,
          deliveryLocationId: null,
          dayPrice: 55,
        }),
      ]);
    });

    it('a contract saved on create carries one vehicle rate item per place', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'Sì');
      await choose(harness, 'Solo consegna');
      await choose(harness, 'A ore');
      await choose(harness, 'No');
      http.match(LOCATIONS_URL).forEach((request) => request.flush(places));
      await settle(harness.fixture);
      const delivery = (index: number) => ({ ...places[index], deactivated: false });
      const page = harness.page() as unknown as {
        confirmLocationRates: (confirmed: unknown) => void;
        confirmVehicleRates: (rates: unknown[]) => void;
      };
      page.confirmLocationRates({
        locationRates: [0, 1].map((index) => ({
          pickup: null,
          delivery: delivery(index),
          rate: { day: 30, night: null, callFee: null },
          minimum: null,
        })),
        vehicleRates: [],
      });
      await settle(harness.fixture);
      page.confirmVehicleRates([
        {
          vehicleId: 'v1',
          licensePlate: 'AB123CD',
          description: 'Autospurgo Scania P410',
          decommissioned: false,
          rate: { day: 55, night: null, callFee: null },
          minimum: null,
          places: [
            { pickup: null, delivery: delivery(0) },
            { pickup: null, delivery: delivery(1) },
          ],
        },
      ]);
      await settle(harness.fixture);
      await click(harness, buttonIn(harness.element, 'Conferma selezione'));

      await click(harness, saveButtons(harness)[0]);

      const post = http.expectOne(
        (request) => request.url === CONTRACTS_URL && request.method === 'POST',
      );
      expect(
        post.request.body.vehicleRates.map((item: Record<string, unknown>) => [
          item['vehicleId'],
          item['pickupLocationId'],
          item['deliveryLocationId'],
          item['dayPrice'],
        ]),
      ).toEqual([
        ['v1', null, 'l1', 55],
        ['v1', null, 'l2', 55],
      ]);
    });

    it('a contract in force changed from a date carries one vehicle rate item per place', async () => {
      const harness = await openExisting(rated);
      await click(harness, buttonIn(questions(harness).at(-1)!, 'Modifica'));
      await click(harness, harness.element.querySelectorAll('input[type="checkbox"]')[2]);
      await click(harness, buttonIn(questions(harness).at(-1)!, 'Conferma selezione'));
      await click(harness, saveButtons(harness)[1]);
      const dialog = harness.element.querySelector('dialog')!;
      await click(harness, dialog.querySelectorAll('input[name="change-scope"]')[0]);
      const date = dialog.querySelector<HTMLInputElement>('#change-from')!;
      date.value = '2026-12-01';
      date.dispatchEvent(new Event('input'));
      await click(harness, buttonIn(dialog, 'Salva'));

      const post = http.expectOne((request) => request.method === 'POST');
      expect(post.request.url).toBe(`${CONTRACT_URL}/change-from-date`);
      expect(
        post.request.body.vehicleRates.map((item: Record<string, unknown>) => [
          item['vehicleId'],
          item['pickupLocationId'],
          item['dayPrice'],
        ]),
      ).toEqual([
        ['v1', 'l1', 55],
        ['v1', 'l2', 55],
        ['v1', 'l3', 60],
        ['v2', 'l1', 48],
        ['v2', 'l2', 48],
        ['v2', 'l3', 48],
      ]);
    });

    it('a 400 of the backend on a vehicle rate shows the notice at the top of the page', async () => {
      const harness = await openExisting({ ...rated, status: 'Upcoming' });
      await click(harness, buttonIn(questions(harness).at(-1)!, 'Modifica'));
      await click(harness, harness.element.querySelectorAll('input[type="checkbox"]')[2]);
      await click(harness, buttonIn(questions(harness).at(-1)!, 'Conferma selezione'));
      await click(harness, saveButtons(harness)[0]);

      http
        .expectOne((request) => request.method === 'PUT')
        .flush(
          {
            errors: {
              'VehicleRates[0].PickupLocationId': [
                'Il mezzo ha già una tariffa propria per questo luogo o questa coppia.',
              ],
            },
          },
          { status: 400, statusText: 'Bad Request' },
        );
      await settle(harness.fixture);

      expect(text(harness.element.querySelector('main > app-notice'))).toBe(
        'Si è verificato un errore. Riprova tra poco.',
      );
      expect(unsaved()).toBe(true);
    });
  });

  describe('simulation card', () => {
    const SIMULATION_URL = '/api/registry/contracts/simulation';

    const flat: Contract = {
      ...existing,
      locationRates: [],
      billingLevel: 'FlatRate',
      nightSurcharge: false,
      dayPrice: 30,
      minimumRule: 'FixedMinimum',
      minimumAmount: 30,
    };

    const flatNight: Contract = {
      ...flat,
      nightSurcharge: true,
      nightPrice: 42,
      nightCallFee: 35,
    };

    const card = (harness: Harness) => harness.element.querySelector('app-contract-simulation');

    const calculate = (harness: Harness) =>
      buttonIn(card(harness) as Element, 'Calcola') as HTMLButtonElement | undefined;

    const outcome = {
      amountAfterMinimum: 30,
      band: 'Day',
      baseAmount: 30,
      minimumAmount: 30,
      minimumApplied: false,
      minimumOveragePrice: null,
      minimumRule: 'FixedMinimum',
      minimumThreshold: null,
      nightBand: { start: '22:00', end: '06:00' },
      nightCallFee: null,
      nightSurcharge: false,
      quantity: 60,
      rateSource: 'Contract',
      total: 30,
      unitPrice: 30,
      vehicleId: null,
    };

    /** Types the sample trip (by the hour) and presses "Calcola". */
    const run = async (harness: Harness) => {
      type(harness, 'sim-start', '09:00');
      type(harness, 'sim-end', '10:00');
      await click(harness, calculate(harness));
    };

    it('the card is absent until the rate and the minimum are answered, then follows the last question without a number', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'No');
      await choose(harness, 'A ore');
      await choose(harness, 'No');
      expect(card(harness)).toBeNull();

      await answerRate(harness);
      expect(card(harness)).toBeNull();

      await answerNoMinimum(harness);

      expect(card(harness)).not.toBeNull();
      expect(text(card(harness)!.querySelector('h3'))).toBe('Prova la configurazione');
      expect(card(harness)!.querySelector('.pt-question__number')).toBeNull();
      expect(card(harness)!.previousElementSibling).toBe(questions(harness).at(-1)!.parentElement);
    });

    it('a contract priced by trip shows the card once the rate is answered, with no minimum', async () => {
      const harness = await openNew();
      await confirmValidity(harness, '2027-01-01');
      await choose(harness, 'No');
      await choose(harness, 'A viaggio');
      await choose(harness, 'No');
      expect(card(harness)).toBeNull();

      await answerRate(harness);

      expect(card(harness)).not.toBeNull();
    });

    it('a read-only flat-rate contract shows the card', async () => {
      const harness = await render('/customers/c1/contracts/k1');
      http.expectOne(CUSTOMER_URL).flush({ ...customer, status: 'Deactivated' });
      http.expectOne(CONTRACTS_URL).flush([]);
      http.expectOne(CONTRACT_URL).flush(flat);
      await settle(harness.fixture);

      expect(card(harness)).not.toBeNull();
      expect(calculate(harness)).toBeDefined();
    });

    it('a location contract shows the card with the location select over its rates and a vehicle select offering only "Un mezzo senza tariffa propria", and the request carries the level, the rates and the trip location', async () => {
      const harness = await openExisting(existing);

      expect(card(harness)).not.toBeNull();
      expect(
        Array.from(card(harness)!.querySelector<HTMLSelectElement>('#sim-vehicle')!.options).map(
          (option) => text(option),
        ),
      ).toEqual(['Un mezzo senza tariffa propria']);
      const select = card(harness)!.querySelector<HTMLSelectElement>('#sim-location')!;
      expect(text(card(harness)!.querySelector('label[for="sim-location"]'))).toBe(
        'Luogo di partenza',
      );
      expect(Array.from(select.options).map((option) => text(option))).toEqual([
        'Cantiere A14, Chieti Scalo',
      ]);

      await run(harness);

      const request = http.expectOne(SIMULATION_URL);
      expect(request.request.body).toMatchObject({
        billingLevel: 'PerPickupLocation',
        dayPrice: null,
        vehicleRates: [],
        locationRates: [
          {
            pickupLocationId: 'l1',
            deliveryLocationId: null,
            dayPrice: 30,
            nightPrice: 42,
            nightCallFee: 35,
          },
        ],
        pickupLocationId: 'l1',
        deliveryLocationId: null,
      });
      request.flush({ ...outcome, rateSource: 'Location' });
      await settle(harness.fixture);
      expect(text(card(harness)!.querySelector('.pt-calc__row:nth-child(2)'))).toBe(
        'Tariffa Del luogo Cantiere A14, Chieti Scalo',
      );
    });

    it('a location contract with a question reopened offers no "Calcola"', async () => {
      const harness = await openExisting(existing);

      await click(harness, buttonIn(questions(harness)[4], 'Modifica'));

      expect(calculate(harness)).toBeUndefined();
    });

    it('while a question is reopened the card offers no "Calcola" and says to confirm it; it comes back with "Annulla modifica" and with "Conferma"', async () => {
      const harness = await openExisting(flat);
      expect(calculate(harness)).toBeDefined();

      await click(harness, buttonIn(questions(harness)[4], 'Modifica'));

      expect(calculate(harness)).toBeUndefined();
      expect(text(card(harness))).toContain('Conferma la domanda aperta per provare il contratto.');

      await click(harness, buttonIn(harness.element, 'Annulla modifica'));
      expect(calculate(harness)).toBeDefined();

      await click(harness, buttonIn(questions(harness)[4], 'Modifica'));
      await click(harness, buttonIn(harness.element, 'Conferma'));
      expect(calculate(harness)).toBeDefined();
      expect(text(card(harness))).not.toContain('Conferma la domanda aperta');
    });

    it('the card computes the contract as written on the page, saved or not', async () => {
      const harness = await openExisting(flat);
      await click(harness, buttonIn(questions(harness)[4], 'Modifica'));
      type(harness, 'rate-day', '45');
      await click(harness, buttonIn(harness.element, 'Conferma'));

      await run(harness);

      const request = http.expectOne(SIMULATION_URL);
      expect(request.request.body).toMatchObject({
        pricingMode: 'ByHour',
        nightSurcharge: false,
        dayPrice: 45,
        startTime: '09:00',
        endTime: '10:00',
      });
      request.flush({ ...outcome, unitPrice: 45, total: 45, baseAmount: 45 });
      await settle(harness.fixture);
      expect(text(card(harness))).toContain('45,00');
    });

    it('changing an answer clears the result and asks to calculate again', async () => {
      const harness = await openExisting(flat);
      await run(harness);
      http.expectOne(SIMULATION_URL).flush(outcome);
      await settle(harness.fixture);
      expect(card(harness)!.querySelector('.pt-calc')).not.toBeNull();

      await click(harness, buttonIn(questions(harness)[4], 'Modifica'));
      type(harness, 'rate-day', '45');
      await click(harness, buttonIn(harness.element, 'Conferma'));

      expect(card(harness)!.querySelector('.pt-calc')).toBeNull();
      expect(text(card(harness))).toContain('Qualcosa è cambiato');
    });

    it('with the night surcharge off the request carries no night price and no night call fee', async () => {
      const harness = await openExisting(flatNight);
      await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
      await choose(harness, 'No');
      await run(harness);

      const request = http.expectOne(SIMULATION_URL);
      expect(request.request.body).toMatchObject({
        nightSurcharge: false,
        dayPrice: 30,
        nightPrice: null,
        nightCallFee: null,
      });
      request.flush(outcome);
    });

    it('question 6 refuses a night price below the day price under the night price and accepts an equal one', async () => {
      const harness = await openExisting(flatNight);
      await click(harness, buttonIn(questions(harness)[4], 'Modifica'));
      type(harness, 'rate-night', '29,99');
      await click(harness, buttonIn(harness.element, 'Conferma'));

      expect(text(harness.element.querySelector('#rate-night-error'))).toBe(
        'Il prezzo notturno non può essere più basso del prezzo diurno.',
      );
      expect(harness.element.querySelector('[aria-current="step"]')).not.toBeNull();

      type(harness, 'rate-night', '30');
      await click(harness, buttonIn(harness.element, 'Conferma'));

      expect(harness.element.querySelector('#rate-night-error')).toBeNull();
      expect(harness.element.querySelector('[aria-current="step"]')).toBeNull();
    });
  });
});
