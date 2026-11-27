import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { CustomerQuestion } from './customer-question';
import { TripCustomer } from './new-trip-answers';
import { TripCustomers } from './trips-api';
import { TripsFacade } from './trips-facade';

const URL = '/api/operations/driver/customers';

const customer = (id: string, companyName: string, vatNumber: string | null): TripCustomer => ({
  id,
  companyName,
  vatNumber,
});
const VESTINA = customer('c1', 'Calcestruzzi Vestina S.p.A.', '01234567897');
const PENNE = customer('c2', 'Comune di Penne', '00123450685');
const ADRIATICA = customer('c3', 'Ecoservizi Adriatica S.r.l.', null);

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();

@Component({
  imports: [CustomerQuestion],
  providers: [TripsFacade],
  template: `
    <app-customer-question
      [customer]="customer()"
      [failed]="failed()"
      (answered)="answers.push($event)"
    />
  `,
})
class Host {
  readonly customer = signal<TripCustomer | null>(null);
  readonly failed = signal(false);
  readonly answers: TripCustomer[] = [];
}

describe('CustomerQuestion', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Session, useValue: { signOut: () => Promise.resolve() } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const element = () => fixture.nativeElement as HTMLElement;

  const flush = async (query: string, customers: TripCustomers) => {
    http
      .expectOne((r: HttpRequest<unknown>) => r.url === URL && r.params.toString() === query)
      .flush(customers);
    await settle(fixture);
  };

  const cards = () => Array.from(element().querySelectorAll<HTMLLabelElement>('.pt-choice'));

  const tap = async (card: HTMLLabelElement | undefined) => {
    card!.querySelector('input')!.click();
    await settle(fixture);
  };

  it('asks the customers with a contract in force today, with the search field and the line under the list', async () => {
    await flush('', { recent: [], others: [PENNE] });

    const search = element().querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(search.placeholder).toBe('Cerca cliente…');
    expect(element().querySelector('.pt-search--lg')).not.toBeNull();
    expect(text(Array.from(element().querySelectorAll('p')).at(-1))).toBe(
      'Non trovi il cliente? Chiama la segreteria.',
    );
  });

  it('lists "Usati di recente" first, then the others, each with company name and "P.IVA <number>" when it has one', async () => {
    await flush('', { recent: [VESTINA], others: [PENNE, ADRIATICA] });

    const label = element().querySelector('.pt-label');
    expect(text(label)).toBe('Usati di recente');
    expect(label!.nextElementSibling).toBe(cards()[0]);
    expect(cards().map((card) => text(card))).toEqual([
      'Calcestruzzi Vestina S.p.A. P.IVA 01234567897',
      'Comune di Penne P.IVA 00123450685',
      'Ecoservizi Adriatica S.r.l.',
    ]);
    expect(cards()[0].querySelector('.pt-choice__hint')?.textContent).toBe('P.IVA 01234567897');
    expect(cards()[2].querySelector('.pt-choice__hint')).toBeNull();
  });

  it('without recent customers there is no "Usati di recente" label', async () => {
    await flush('', { recent: [], others: [PENNE] });

    expect(text(element())).not.toContain('Usati di recente');
    expect(element().querySelector('.pt-label')).toBeNull();
  });

  it('the search reaches the server after the debounce', async () => {
    await flush('', { recent: [VESTINA], others: [PENNE] });
    vi.useFakeTimers();
    const field = element().querySelector<HTMLInputElement>('input[type="search"]')!;

    field.value = 'penne';
    field.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(299);
    http.expectNone((r) => r.params.get('search') === 'penne');
    vi.advanceTimersByTime(1);
    vi.useRealTimers();
    await settle(fixture);

    await flush('search=penne', { recent: [], others: [PENNE] });
    expect(cards().map((card) => text(card))).toEqual(['Comune di Penne P.IVA 00123450685']);
    expect(text(element())).not.toContain('Usati di recente');
  });

  it('a search without results shows "Nessun risultato."', async () => {
    await flush('', { recent: [], others: [] });

    expect(text(element())).toContain('Nessun risultato.');
  });

  it('no "Nessun risultato." while customers are listed', async () => {
    await flush('', { recent: [], others: [PENNE] });

    expect(text(element())).not.toContain('Nessun risultato.');
  });

  it('a tap on a card answers with that customer, no "Avanti" asked', async () => {
    await flush('', { recent: [VESTINA], others: [PENNE] });

    await tap(cards()[1]);

    expect(host.answers).toEqual([PENNE]);
    expect(text(element())).not.toContain('Avanti');
  });

  it('shows the answered customer selected', async () => {
    host.customer.set(PENNE);
    await settle(fixture);
    await flush('', { recent: [VESTINA], others: [PENNE] });

    expect(cards().map((card) => card.querySelector('input')!.checked)).toEqual([false, true]);
  });

  it('shows the generic error when the contract of the customer could not be read, and when the list fails', async () => {
    host.failed.set(true);
    await settle(fixture);
    http.expectOne((r) => r.url === URL).flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);

    expect(element().querySelectorAll('.pt-field__error').length).toBe(2);
    expect(text(element().querySelector('.pt-field__error'))).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
    expect(text(element())).not.toContain('Nessun risultato.');
  });
});
