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
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { unsavedChangesGuard } from '../../../shared/guards/unsaved-changes-guard';
import { ContractPage } from './contract-page';
import type { Contract } from './contracts-api';
import type { CustomerListItem } from './customers-api';
import { CustomersFacade } from './customers-facade';

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
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        CustomersFacade,
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

  /** Answers every question of a new contract the shortest way. */
  const answerAll = async (harness: Harness) => {
    await confirmValidity(harness, '2027-01-01');
    await choose(harness, 'No');
    await choose(harness, 'A ore');
    await choose(harness, 'No');
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

  it('an existing contract of a deactivated customer can still be edited', async () => {
    const harness = await render('/customers/c1/contracts/k1');
    http.expectOne(CUSTOMER_URL).flush({ ...customer, status: 'Deactivated' });
    http.expectOne(CONTRACTS_URL).flush([]);
    http.expectOne(CONTRACT_URL).flush(existing);
    await settle(harness.fixture);

    expect(questions(harness).length).toBeGreaterThan(0);
    expect(harness.element.querySelector('main .pt-notice--info')).toBeNull();
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
    expect(text(second.querySelector('.pt-pill'))).toBe('Nessun luogo obbligatorio');
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

    expect(questions(harness).length).toBe(6);
    expect(questions(harness).every((q) => q.classList.contains('pt-question--answered'))).toBe(
      true,
    );
    expect(harness.element.querySelector('[aria-current="step"]')).toBeNull();
    expect(questions(harness).map((q) => text(q.querySelector('.pt-pill')))).toEqual([
      'dal 01/04/2026 al 31/03/2027',
      'Luoghi obbligatori',
      'Solo il luogo di partenza',
      'Pagamento a ore',
      'Maggiorazione notturna',
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
    await choose(harness, 'Sì');
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
    expect(questions(harness).map((q) => text(q.querySelector('.pt-pill')))).toEqual([
      'dal 01/04/2026 al 31/03/2027',
      'Nessun luogo obbligatorio',
      'Pagamento a ore',
      'Maggiorazione notturna',
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

    expect(questions(harness).map((q) => text(q.querySelector('.pt-pill')))).toEqual([
      'dal 01/04/2026 al 31/03/2027',
      'Luoghi obbligatori',
      'Solo il luogo di partenza',
      'Pagamento a viaggio',
      'Maggiorazione notturna',
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

    await click(harness, buttonIn(harness.element, 'Conferma selezione'));

    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([false, false]);
    expect(text(harness.element.querySelector('main section.pt-card .pt-title'))).toBe(
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
    expect(text(last.querySelector('.pt-pill'))).toBe('Nessuno');
    expect(saveButtons(harness)[0].disabled).toBe(false);
  });

  it('question 6 lists the four documents as checkboxes, in the fixed order, and the confirmed ones are summarised', async () => {
    const harness = await openNew();
    await confirmValidity(harness, '2027-01-01');
    await choose(harness, 'No');
    await choose(harness, 'A ore');
    await choose(harness, 'No');

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

    expect(text(questions(harness).at(-1)!.querySelector('.pt-pill'))).toBe(
      'DDT, riepilogo di fine giornata',
    );
  });

  it('the questions use pt-question and pt-choice, the active one marked aria-current="step" and an answered one pt-question--answered with a numbered badge', async () => {
    const harness = await openNew();
    await confirmValidity(harness, '2027-01-01');

    const [first, second] = questions(harness);
    expect(first.classList.contains('pt-question--answered')).toBe(true);
    expect(first.querySelector('.pt-question__number')?.textContent).toBe('1');
    expect(first.querySelector('.pt-pill app-icon')).not.toBeNull();
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
    await click(harness, buttonIn(questions(harness)[5], 'Modifica'));
    const boxes = () =>
      Array.from(harness.element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).map(
        (b) => b.checked,
      );
    expect(boxes()).toEqual([true, false, false, true]);
    await click(harness, harness.element.querySelectorAll('input[type="checkbox"]')[1]);
    expect(boxes()).toEqual([true, true, false, true]);

    await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
    await click(harness, buttonIn(questions(harness)[5], 'Modifica'));

    expect(boxes()).toEqual([true, false, false, true]);
  });

  it('picking an answer does not close another question that is being reopened', async () => {
    const harness = await openExisting();
    await click(harness, buttonIn(questions(harness)[5], 'Modifica'));

    const page = harness.page() as unknown as {
      radioQuestions: { choices: unknown[] }[];
      pick: (question: unknown, choice: unknown) => void;
    };
    const mode = page.radioQuestions[2];
    page.pick(mode, mode.choices[3]);
    await settle(harness.fixture);

    expect(questions(harness)[5].getAttribute('aria-current')).toBe('step');
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

    expect(text(questions(harness)[3].querySelector('.pt-pill'))).toBe('Pagamento a km');
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
    expect(questions(harness).length).toBe(6);
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

  it('saving an existing contract puts the confirmed answers with the version read', async () => {
    const harness = await openExisting();
    await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
    await choose(harness, 'A km');

    await click(harness, saveButtons(harness)[1]);

    const put = http.expectOne((request) => request.method === 'PUT');
    expect(put.request.url).toBe(CONTRACT_URL);
    expect(put.request.body).toEqual({
      validFrom: '2026-04-01',
      validTo: '2027-03-31',
      billingLevel: 'PerPickupLocation',
      pricingMode: 'ByDistance',
      requiredDocuments: ['DeliveryNote', 'DailySummary'],
      nightSurcharge: true,
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
    expect(questions(harness).map((q) => text(q.querySelector('.pt-pill')))).toEqual([
      'dal 01/01/2027, senza scadenza',
      'Nessun luogo obbligatorio',
      'Pagamento a ore',
      'Nessuna maggiorazione notturna',
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
    await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
    await choose(harness, 'A km');
    await click(harness, saveButtons(harness)[0]);

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
    http.expectOne(CONTRACT_URL).flush({ ...existing, version: 4, pricingMode: 'ByWeight' });
    await settle(harness.fixture);

    expect(notice(harness)).toContain('Il contratto è stato modificato da un altro utente');
    expect(text(questions(harness)[3].querySelector('.pt-pill'))).toBe('Pagamento a km');

    await click(harness, buttonIn(harness.element.querySelector('app-notice')!, 'Ricarica'));
    http.expectOne(CONTRACT_URL).flush({ ...existing, version: 5, pricingMode: 'ByWeight' });
    await settle(harness.fixture);

    expect(harness.element.querySelector('main > app-notice')).toBeNull();
    expect(text(questions(harness)[3].querySelector('.pt-pill'))).toBe('Pagamento a peso');
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
    await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
    await choose(harness, 'A km');
    await click(harness, saveButtons(harness)[0]);
    http
      .expectOne((request) => request.method === 'PUT')
      .flush(
        { errorCode: 'Registry.Contract.ConcurrentUpdate', detail: 'Modificato da altri.' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(harness.fixture);
    http.expectOne((request) => request.url === CONTRACTS_URL).flush([]);
    http.expectOne(CONTRACT_URL).flush({ ...existing, version: 4, pricingMode: 'ByWeight' });
    await settle(harness.fixture);

    expect(saveButtons(harness).map((b) => b.disabled)).toEqual([true, true]);
    await click(harness, saveButtons(harness)[0]);
    http.expectNone((request) => request.method === 'PUT');

    await click(harness, buttonIn(harness.element.querySelector('app-notice')!, 'Ricarica'));
    http.expectOne(CONTRACT_URL).flush({ ...existing, version: 4, pricingMode: 'ByWeight' });
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
    expect(modify.length).toBe(5);
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
    expect(text(questions(harness)[0].querySelector('.pt-pill'))).toBe(
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
    await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
    await choose(harness, 'A km');
    await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
    await choose(harness, 'A ore');

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
    await click(harness, buttonIn(questions(harness)[3], 'Modifica'));
    await choose(harness, 'A km');
    await click(harness, saveButtons(harness)[0]);
    http
      .expectOne((request) => request.method === 'PUT')
      .flush(
        { errorCode: 'Registry.Contract.ConcurrentUpdate', detail: 'Modificato da altri.' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(harness.fixture);
    http.expectOne((request) => request.url === CONTRACTS_URL).flush([]);
    http.expectOne(CONTRACT_URL).flush({ ...existing, version: 4, pricingMode: 'ByWeight' });
    await settle(harness.fixture);

    await click(harness, buttonIn(harness.element.querySelector('app-notice')!, 'Ricarica'));
    http.expectOne(CONTRACT_URL).flush({ ...existing, version: 5, pricingMode: 'ByWeight' });
    await settle(harness.fixture);
    await click(harness, annulla(harness));

    expect(leaveDialog(harness)).toBeNull();
    expect(url()).toBe('/customers/c1');
  });
});
