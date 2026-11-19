import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CurrentUser } from '../../../core/auth/auth-api';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog, userWithRole } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { Toast } from '../../../core/toast/toast';
import { DriverFormDialog } from './driver-form-dialog';
import type { DriverAccount, DriverListItem } from './drivers-api';
import { DriversFacade } from './drivers-facade';

const URL = '/api/registry/drivers';
const ACCOUNTS_URL = `${URL}/linkable-accounts`;

const ROW: DriverListItem = {
  id: '5',
  firstName: 'Andrea',
  lastName: 'Rossetti',
  phone: '328 556 0043',
  account: { userId: 'u5', username: 'a.rossetti', isDisabled: true },
  status: 'Deactivated',
  lastModifiedAt: '2026-11-03T12:00:00Z',
  version: 3,
};

const ACCOUNTS: DriverAccount[] = [
  { userId: 'u5', username: 'a.rossetti', isDisabled: true },
  { userId: 'u1', username: 'g.dibartolomeo', isDisabled: false },
  { userId: 'u2', username: 'l.difebo', isDisabled: false },
];

describe('DriverFormDialog', () => {
  let http: HttpTestingController;

  const render = (
    driver: DriverListItem | null = null,
    role: CurrentUser['role'] | null = null,
  ) => {
    stubModalDialog();
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        DriversFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(role === null
          ? []
          : [{ provide: Session, useValue: { user: signal(userWithRole(role)).asReadonly() } }]),
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DriverFormDialog);
    fixture.componentRef.setInput('driver', driver);
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    TestBed.tick();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, closedCount: () => closed };
  };

  const writes = () => http.match((r) => r.url.startsWith(URL) && r.method !== 'GET');

  const accountsRequests = () => http.match((r) => r.url === ACCOUNTS_URL);

  /** Answers the dialog's read of the linkable accounts. */
  const answerAccounts = async (
    fixture: ReturnType<typeof render>['fixture'],
    accounts: DriverAccount[] = ACCOUNTS,
  ) => {
    http.expectOne((r) => r.url === ACCOUNTS_URL).flush(accounts);
    await settle(fixture);
  };

  const type = (element: HTMLElement, selector: string, value: string) => {
    const field = element.querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const choose = (element: HTMLElement, value: string) => {
    const select = element.querySelector<HTMLSelectElement>('#driver-account')!;
    select.value = value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const fill = (
    element: HTMLElement,
    values: { first?: string; last?: string; phone?: string },
  ) => {
    type(element, '#driver-first', values.first ?? 'Luca');
    type(element, '#driver-last', values.last ?? 'Di Febo');
    type(element, '#driver-phone', values.phone ?? '');
  };

  const submit = async (fixture: ReturnType<typeof render>['fixture']) => {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(fixture);
  };

  const text = (element: HTMLElement, selector: string) =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  const optionTexts = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('#driver-account option')).map((o) =>
      o.textContent?.replace(/\s+/g, ' ').trim(),
    );

  it('a new driver shows the title, the line, Nome and Cognome side by side, Telefono, Account and Annulla / Crea autista', () => {
    const { element } = render();

    expect(text(element, '.pt-title')).toBe('Nuovo autista');
    expect(text(element, '.pt-dialog__head .pt-muted')).toBe('Nome e cognome sono obbligatori.');
    expect(Array.from(element.querySelectorAll('label')).map((l) => l.textContent?.trim())).toEqual(
      ['Nome', 'Cognome', 'Telefono', 'Account'],
    );
    const pair = element.querySelector('.grid')!;
    expect(Array.from(pair.querySelectorAll('input')).map((i) => i.id)).toEqual([
      'driver-first',
      'driver-last',
    ]);
    expect(
      Array.from(element.querySelectorAll('.pt-dialog__actions button')).map((b) =>
        b.textContent?.trim(),
      ),
    ).toEqual(['Annulla', 'Crea autista']);
    expect(element.querySelector('dialog')!.open).toBe(true);
    expect(element.querySelector('.pt-tile use')?.getAttribute('href')).toBe('icons.svg#user');
    http.match(() => true);
  });

  it('a muted line states the phone rule and, for the account, that the administrator creates the accounts in "Utenti"', () => {
    const { element } = render();

    expect(text(element, '#driver-phone-note')).toBe(
      'Facoltativo. Cifre e spazi, con "+" iniziale per i numeri esteri.',
    );
    expect(text(element, '#driver-account-note')).toBe(
      "L'utente con cui l'autista entra nell'app. Gli account li crea l'amministratore in \"Utenti\".",
    );
    expect(element.querySelectorAll('.pt-field__hint')).toHaveLength(2);
    http.match(() => true);
  });

  it('the select lists "Nessun accesso" first and preselected, then the accounts as the endpoint returns them', async () => {
    const { fixture, element } = render();
    await answerAccounts(fixture, [ACCOUNTS[1], ACCOUNTS[2]]);

    expect(optionTexts(element)).toEqual(['Nessun accesso', 'g.dibartolomeo', 'l.difebo']);
    expect(element.querySelector<HTMLSelectElement>('#driver-account')!.value).toBe('');
    http.match(() => true);
  });

  it('the linked account reads "<user name> (disabilitato)" when disabled and is the selected one', async () => {
    const { fixture, element } = render(ROW);
    await answerAccounts(fixture);

    expect(optionTexts(element)).toEqual([
      'Nessun accesso',
      'a.rossetti (disabilitato)',
      'g.dibartolomeo',
      'l.difebo',
    ]);
    expect(element.querySelector<HTMLSelectElement>('#driver-account')!.value).toBe('u5');
    http.match(() => true);
  });

  it('a new driver reads the linkable accounts without a driver id, an edit with the id of the driver', () => {
    const created = render();
    const [forNew] = accountsRequests();
    expect(forNew.request.params.has('driverId')).toBe(false);
    created.fixture.destroy();
    TestBed.resetTestingModule();

    render(ROW);
    const [forEdit] = accountsRequests();
    expect(forEdit.request.params.get('driverId')).toBe('5');
    http.match(() => true);
  });

  it('until the accounts are read the select already offers the account the driver holds', () => {
    const { fixture, element } = render(ROW);
    fixture.detectChanges();

    expect(optionTexts(element)).toEqual(['Nessun accesso', 'a.rossetti (disabilitato)']);
    expect(element.querySelector<HTMLSelectElement>('#driver-account')!.value).toBe('u5');
    http.match(() => true);
  });

  it.each([
    ['Disattivato', ROW, "Disattivato: non può lavorare nell'app autisti."],
    ['Attivo', { ...ROW, status: 'Active' as const }, "Attivo: può lavorare nell'app autisti."],
  ])(
    'Modifica on a driver %s opens the dialog with the status in the line, the fields prefilled and Salva modifiche',
    (_status, driver, line) => {
      const { element } = render(driver);

      expect(text(element, '.pt-title')).toBe('Modifica autista');
      expect(text(element, '.pt-dialog__head .pt-muted')).toBe(line);
      expect(element.querySelector<HTMLInputElement>('#driver-first')!.value).toBe('Andrea');
      expect(element.querySelector<HTMLInputElement>('#driver-last')!.value).toBe('Rossetti');
      expect(element.querySelector<HTMLInputElement>('#driver-phone')!.value).toBe('328 556 0043');
      expect(text(element, '.pt-btn--primary')).toBe('Salva modifiche');
      expect(element.querySelectorAll('select')).toHaveLength(1);
      expect(element.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
      http.match(() => true);
    },
  );

  it.each([
    ['an empty first name', { first: '' }, '#driver-first-note', 'Inserisci il nome.'],
    ['a blank first name', { first: '   ' }, '#driver-first-note', 'Inserisci il nome.'],
    [
      'a first name of 61 characters',
      { first: 'a'.repeat(61) },
      '#driver-first-note',
      'Il nome può avere al massimo 60 caratteri.',
    ],
    ['an empty last name', { last: '' }, '#driver-last-note', 'Inserisci il cognome.'],
    ['a blank last name', { last: '  ' }, '#driver-last-note', 'Inserisci il cognome.'],
    [
      'a last name of 61 characters',
      { last: 'a'.repeat(61) },
      '#driver-last-note',
      'Il cognome può avere al massimo 60 caratteri.',
    ],
    [
      'a phone with a dash',
      { phone: '333-418-2291' },
      '#driver-phone-note',
      'Usa solo cifre e spazi, con "+" iniziale per i numeri esteri.',
    ],
    [
      'a phone with a "+" inside',
      { phone: '333 +418' },
      '#driver-phone-note',
      'Usa solo cifre e spazi, con "+" iniziale per i numeri esteri.',
    ],
    [
      'a phone of 21 characters',
      { phone: '1'.repeat(21) },
      '#driver-phone-note',
      'Il telefono può avere al massimo 20 caratteri.',
    ],
  ])(
    '%s sends no request and shows the message under its field',
    async (_n, values, note, message) => {
      const { fixture, element } = render();
      fill(element, values);

      await submit(fixture);

      expect(writes()).toHaveLength(0);
      expect(text(element, note)).toBe(message);
      expect(element.querySelector(`#${note.slice(1, -5)}`)!.getAttribute('aria-invalid')).toBe(
        'true',
      );
      http.match(() => true);
    },
  );

  it('only the names are required; values at their limits are sent trimmed and an empty phone is sent as null', async () => {
    const { fixture, element } = render();
    fill(element, { first: `  ${'n'.repeat(60)}  `, last: ' c ', phone: '   ' });

    await submit(fixture);

    const [post] = writes();
    expect(post.request.method).toBe('POST');
    expect(post.request.url).toBe(URL);
    expect(post.request.body).toEqual({
      firstName: 'n'.repeat(60),
      lastName: 'c',
      phone: null,
      userId: null,
    });
    http.match(() => true);
  });

  it('a phone with a leading "+" and spaces, 20 characters long, is sent trimmed', async () => {
    const { fixture, element } = render();
    fill(element, { phone: ` +${'3'.repeat(9)} ${'4'.repeat(9)} ` });

    await submit(fixture);

    expect(writes()[0].request.body).toMatchObject({ phone: `+${'3'.repeat(9)} ${'4'.repeat(9)}` });
    http.match(() => true);
  });

  it('"Nessun accesso" saves a driver without an account', async () => {
    const { fixture, element } = render();
    await answerAccounts(fixture);
    fill(element, {});

    await submit(fixture);

    expect(writes()[0].request.body).toEqual({
      firstName: 'Luca',
      lastName: 'Di Febo',
      phone: null,
      userId: null,
    });
    http.match(() => true);
  });

  it('the dialog links an existing account chosen from the select, and offers no way to create one', async () => {
    const { fixture, element } = render();
    await answerAccounts(fixture);
    fill(element, {});
    choose(element, 'u2');
    expect(
      Array.from(element.querySelectorAll('button')).map((b) => b.textContent?.trim()),
    ).toEqual(['Annulla', 'Crea autista']);

    await submit(fixture);

    expect(writes()[0].request.body).toMatchObject({ userId: 'u2' });
    http.match(() => true);
  });

  it('the edit sends a PUT with the version the dialog was opened on', async () => {
    const { fixture } = render(ROW);
    await answerAccounts(fixture);

    await submit(fixture);

    const [put] = writes();
    expect(put.request.method).toBe('PUT');
    expect(put.request.url).toBe(`${URL}/5`);
    expect(put.request.body).toEqual({
      firstName: 'Andrea',
      lastName: 'Rossetti',
      phone: '328 556 0043',
      userId: 'u5',
      version: 3,
    });
    http.match(() => true);
  });

  it('every field and the account of a deactivated driver can be changed, and "Nessun accesso" sends userId null', async () => {
    const { fixture, element } = render(ROW);
    await answerAccounts(fixture);
    type(element, '#driver-first', 'Andrea Maria');
    type(element, '#driver-last', 'Rossetti Neri');
    type(element, '#driver-phone', '+39 328 556 0099');
    choose(element, '');

    await submit(fixture);

    expect(writes()[0].request.body).toEqual({
      firstName: 'Andrea Maria',
      lastName: 'Rossetti Neri',
      phone: '+39 328 556 0099',
      userId: null,
      version: 3,
    });
    http.match(() => true);
  });

  it('an account other than the current one can be chosen for an active driver', async () => {
    const { fixture, element } = render({ ...ROW, status: 'Active' });
    await answerAccounts(fixture);
    choose(element, 'u1');

    await submit(fixture);

    expect(writes()[0].request.body).toMatchObject({ userId: 'u1', version: 3 });
    http.match(() => true);
  });

  it('while saving, fields and buttons are disabled, the primary button shows progress and the dialog cannot be closed', async () => {
    const { fixture, element, closedCount } = render();
    fill(element, {});

    await submit(fixture);
    const dialog = element.querySelector('dialog')!;

    expect(writes()).toHaveLength(1);
    expect(
      Array.from(element.querySelectorAll('input, select')).every(
        (f) => (f as HTMLInputElement).disabled,
      ),
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

  it('an account taken by another driver shows the backend detail in a danger notice above the fields and keeps the values', async () => {
    const { fixture, element, closedCount } = render();
    await answerAccounts(fixture);
    fill(element, { first: 'Luca', last: 'Di Febo', phone: '333 418 2291' });
    choose(element, 'u2');
    await submit(fixture);
    const detail = "L'account l.difebo è già collegato all'autista Marco D'Angelo (disattivato).";

    http
      .match((r) => r.method === 'POST')[0]
      .flush(
        { errorCode: 'Registry.Driver.AccountTakenByDeactivated', detail },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(fixture);

    const notice = element.querySelector('.pt-notice--danger')!;
    expect(notice.textContent?.trim()).toBe(detail);
    expect(notice.compareDocumentPosition(element.querySelector('.pt-field')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(element.querySelector<HTMLInputElement>('#driver-first')!.value).toBe('Luca');
    expect(element.querySelector<HTMLInputElement>('#driver-phone')!.value).toBe('333 418 2291');
    expect(element.querySelector<HTMLSelectElement>('#driver-account')!.value).toBe('u2');
    expect(element.querySelector<HTMLInputElement>('#driver-first')!.disabled).toBe(false);
    expect(closedCount()).toBe(0);
    http.match(() => true);
  });

  it('after a refusal the accounts read again keep the refused account listed and selected', async () => {
    const { fixture, element } = render();
    await answerAccounts(fixture);
    fill(element, {});
    choose(element, 'u2');
    await submit(fixture);
    http
      .match((r) => r.method === 'POST')[0]
      .flush(
        { errorCode: 'Registry.Driver.AccountTaken', detail: 'taken' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(fixture);

    await answerAccounts(fixture, [
      { userId: 'u1', username: 'g.dibartolomeo', isDisabled: false },
      { userId: 'u3', username: 'm.rossi', isDisabled: false },
    ]);

    expect(optionTexts(element)).toEqual([
      'Nessun accesso',
      'g.dibartolomeo',
      'l.difebo',
      'm.rossi',
    ]);
    const select = element.querySelector<HTMLSelectElement>('#driver-account')!;
    expect(select.value).toBe('u2');
    expect(select.selectedOptions[0].textContent?.trim()).toBe('l.difebo');
    http.match(() => true);
  });

  it('a failed read of the accounts replaces the note under Account with a message, and a later read brings the note back', async () => {
    const { fixture, element } = render(ROW);
    http.expectOne((r) => r.url === ACCOUNTS_URL).flush(null, { status: 500, statusText: 'Error' });
    await settle(fixture);

    const note = () => element.querySelector('#driver-account-note')!;
    expect(note().classList).toContain('pt-field__error');
    expect(note().textContent?.trim()).toBe(
      'Non è stato possibile leggere gli account. Chiudi e riapri per riprovare.',
    );
    expect(optionTexts(element)).toEqual(['Nessun accesso', 'a.rossetti (disabilitato)']);

    TestBed.inject(DriversFacade).readAccounts('6');
    await settle(fixture);
    await answerAccounts(fixture);
    expect(note().classList).toContain('pt-field__hint');
    http.match(() => true);
  });

  it('a 409 on the edit shows its detail in the dialog, which stays open, and the list is read again', async () => {
    const { fixture, element, closedCount } = render(ROW);
    http.expectOne((r) => r.url === URL && r.method === 'GET').flush({ data: [], totalCount: 0 });
    await settle(fixture);
    await submit(fixture);
    const detail = "L'autista è stato modificato da un altro utente. Ricarica la lista e riprova.";

    http
      .match((r) => r.method === 'PUT')[0]
      .flush(
        { errorCode: 'Registry.Driver.ConcurrentUpdate', detail },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(fixture);

    expect(text(element, '.pt-notice--danger')).toBe(detail);
    expect(closedCount()).toBe(0);
    http.expectOne((r) => r.url === URL && r.method === 'GET');
    http.match(() => true);
  });

  it('a failure without a usable body shows the generic message above the fields and puts the focus on Nome', async () => {
    const { fixture, element } = render();
    document.body.appendChild(element);
    fill(element, {});
    await submit(fixture);

    http.match((r) => r.method === 'POST')[0].flush(null, { status: 500, statusText: 'Error' });
    await settle(fixture);

    expect(text(element, '.pt-notice--danger')).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
    expect(document.activeElement).toBe(element.querySelector('#driver-first'));
    element.remove();
    http.match(() => true);
  });

  it('a backend 400 shows under its field, ignoring case, with no notice above', async () => {
    const { fixture, element } = render();
    fill(element, { phone: '333 418 2291' });
    await submit(fixture);

    http
      .match((r) => r.method === 'POST')[0]
      .flush(
        {
          errors: {
            FirstName: ['Nome errato.'],
            LASTNAME: ['Cognome errato.', 'Troppo lungo.'],
            Phone: ['Telefono errato.'],
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle(fixture);

    expect(text(element, '#driver-first-note')).toBe('Nome errato.');
    expect(text(element, '#driver-last-note')).toBe('Cognome errato. Troppo lungo.');
    expect(text(element, '#driver-phone-note')).toBe('Telefono errato.');
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

    type(element, '#driver-first', '');
    await submit(fixture);

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(writes()).toHaveLength(0);
    http.match(() => true);
  });

  it('on success the dialog closes, the toast names the driver and the list is asked again', async () => {
    const { fixture, element, closedCount } = render();
    http.expectOne((r) => r.url === URL && r.method === 'GET').flush({ data: [], totalCount: 0 });
    await settle(fixture);
    fill(element, { first: 'Luca', last: 'Di Febo' });
    await submit(fixture);

    http
      .match((r) => r.method === 'POST')[0]
      .flush(
        {
          id: '9',
          firstName: 'Luca',
          lastName: 'Di Febo',
          phone: null,
          account: null,
          status: 'Active',
          lastModifiedAt: '2026-11-16T08:00:00Z',
          version: 1,
        },
        { status: 201, statusText: 'Created' },
      );
    await settle(fixture);

    expect(closedCount()).toBe(1);
    expect(TestBed.inject(Toast).current()).toBe('Autista Luca Di Febo creato');
    http.expectOne((r) => r.url === URL && r.method === 'GET');
    http.match(() => true);
  });

  it('a successful edit toasts "modificato" with the stored names', async () => {
    const { fixture, closedCount } = render(ROW);
    await submit(fixture);

    http.match((r) => r.method === 'PUT')[0].flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);

    expect(closedCount()).toBe(1);
    expect(TestBed.inject(Toast).current()).toBe('Autista Andrea Rossetti modificato');
    http.match(() => true);
  });

  describe('Admin account creation', () => {
    const NEW_ACCOUNT = { id: 'u9', role: 'Driver', status: 'Active' };
    const NEW_OPTION = { userId: 'u9', username: 'g.ciccone', isDisabled: false };

    const renderAdmin = (driver: DriverListItem | null = null) => {
      const rendered = render(driver, 'Admin');
      const open = async () => {
        rendered.element.querySelector<HTMLButtonElement>('button.shrink-0')!.click();
        await settle(rendered.fixture);
      };
      return { ...rendered, open };
    };

    const secondDialog = (root: HTMLElement) =>
      root.querySelector<HTMLElement>('app-driver-account-dialog');

    const accountPosts = () =>
      http.match((r) => r.url === '/api/identity/users' && r.method === 'POST');

    const submitAccount = async (rendered: ReturnType<typeof renderAdmin>) => {
      type(rendered.element, '#account-password', 'Password1!');
      rendered.element
        .querySelector<HTMLFormElement>('#driver-account-form')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await settle(rendered.fixture);
    };

    const buttonNamed = (root: Element, name: string) =>
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === name)!;

    it('an Admin sees "Nuovo account" in the row of the select and the hint that names it', async () => {
      const { fixture, element } = renderAdmin();
      await answerAccounts(fixture);

      const row = element.querySelector('#driver-account')!.parentElement!;
      expect(row.classList.contains('flex')).toBe(true);
      expect(row.querySelector('button')?.textContent?.trim()).toBe('Nuovo account');
      expect(text(element, '#driver-account-note')).toBe(
        "L'utente con cui l'autista entra nell'app. Se non è nell'elenco, crealo con \"Nuovo account\".",
      );
      http.match(() => true);
    });

    it('a BackOffice user gets no button and keeps the hint about "Utenti"', async () => {
      const { fixture, element } = render(null, 'BackOffice');
      await answerAccounts(fixture);

      expect(element.querySelector('button.shrink-0')).toBeNull();
      expect(buttonNamed(element, 'Nuovo account')).toBeUndefined();
      expect(text(element, '#driver-account-note')).toContain('in "Utenti"');
      http.match(() => true);
    });

    it('"Nuovo account" opens a second dialog with its title, the names, Nome utente, Password, Mostra, Annulla, Crea account and no role', async () => {
      const { fixture, element, open } = renderAdmin();
      await answerAccounts(fixture);
      fill(element, { first: 'Gianni', last: 'Ciccone' });
      await open();

      const second = secondDialog(element)!;
      expect(text(second, '.pt-title')).toBe('Nuovo account autista');
      expect(text(second, '.pt-dialog__head .pt-muted')).toBe(
        'Per Gianni Ciccone. Potrà accedere subito con queste credenziali.',
      );
      expect(
        Array.from(second.querySelectorAll('label')).map((l) => l.textContent?.trim()),
      ).toEqual(['Nome utente', 'Password']);
      expect(second.querySelector('select')).toBeNull();
      expect(text(second, '#account-username-note')).toContain('Da 3 a 64 caratteri');
      expect(text(second, '#account-password-note')).toContain('Da 8 a 128 caratteri');
      expect(
        Array.from(second.querySelectorAll('button')).map((b) => b.textContent?.trim()),
      ).toEqual(['Mostra', 'Annulla', 'Crea account']);
      http.match(() => true);
    });

    it('with both names empty the line has no "Per ...", with one name it names only that one', async () => {
      const empty = renderAdmin();
      await empty.open();
      expect(text(secondDialog(empty.element)!, '.pt-dialog__head .pt-muted')).toBe(
        'Potrà accedere subito con queste credenziali.',
      );
      empty.fixture.destroy();
      http.match(() => true);
      TestBed.resetTestingModule();

      const one = renderAdmin();
      fill(one.element, { first: 'Gianni', last: '' });
      await one.open();
      expect(text(secondDialog(one.element)!, '.pt-dialog__head .pt-muted')).toBe(
        'Per Gianni. Potrà accedere subito con queste credenziali.',
      );
      http.match(() => true);
    });

    it('the user name is proposed from the names typed and stays editable', async () => {
      const { fixture, element, open } = renderAdmin();
      fill(element, { first: 'Marco', last: "D'Angelo" });
      await open();

      const username = element.querySelector<HTMLInputElement>('#account-username')!;
      expect(username.value).toBe('m.dangelo');
      type(element, '#account-username', 'marco.d');
      await settle(fixture);
      expect(username.value).toBe('marco.d');
      http.match(() => true);
    });

    it('with a name missing the user name starts empty', async () => {
      const { element, open } = renderAdmin();
      fill(element, { first: 'Marco', last: '' });
      await open();

      expect(element.querySelector<HTMLInputElement>('#account-username')!.value).toBe('');
      http.match(() => true);
    });

    it('Crea account creates the user with the role Driver, closes the second dialog, selects the account keeping the other values, saves no driver and toasts nothing', async () => {
      const rendered = renderAdmin();
      const { fixture, element, closedCount, open } = rendered;
      await answerAccounts(fixture);
      fill(element, { first: 'Gianni', last: 'Ciccone', phone: '333 418 2291' });
      await open();
      await submitAccount(rendered);

      const [post] = accountPosts();
      expect(post.request.body).toEqual({
        username: 'g.ciccone',
        password: 'Password1!',
        role: 'Driver',
      });
      post.flush(NEW_ACCOUNT, { status: 201, statusText: 'Created' });
      await settle(fixture);
      await answerAccounts(fixture, [...ACCOUNTS, NEW_OPTION]);

      expect(secondDialog(element)).toBeNull();
      expect(closedCount()).toBe(0);
      expect(element.querySelector<HTMLSelectElement>('#driver-account')!.value).toBe('u9');
      expect(element.querySelector<HTMLInputElement>('#driver-first')!.value).toBe('Gianni');
      expect(element.querySelector<HTMLInputElement>('#driver-phone')!.value).toBe('333 418 2291');
      expect(writes()).toHaveLength(0);
      expect(TestBed.inject(Toast).current()).toBeNull();
      expect(document.activeElement).toBe(element.querySelector('#driver-account'));
      http.match(() => true);
    });

    it('a refusal shows inside the second dialog, which stays open', async () => {
      const rendered = renderAdmin();
      const { fixture, element, open } = rendered;
      fill(element, { first: 'Gianni', last: 'Ciccone' });
      await open();
      await submitAccount(rendered);

      accountPosts()[0].flush(
        { errorCode: 'Identity.User.UsernameAlreadyTaken', detail: 'Il nome utente è già in uso.' },
        { status: 409, statusText: 'Conflict' },
      );
      await settle(fixture);

      const second = secondDialog(element)!;
      expect(text(second, '.pt-notice--danger')).toBe('Il nome utente è già in uso.');
      expect(second.querySelector<HTMLInputElement>('#account-username')!.value).toBe('g.ciccone');
      expect(element.querySelector<HTMLSelectElement>('#driver-account')!.value).toBe('');
      http.match(() => true);
    });

    it('Annulla and Escape on the second dialog return to the driver dialog unchanged, the focus on "Nuovo account"', async () => {
      const { fixture, element, closedCount, open } = renderAdmin();
      await answerAccounts(fixture);
      fill(element, { first: 'Gianni', last: 'Ciccone' });
      const button = element.querySelector<HTMLButtonElement>('button.shrink-0')!;
      button.focus();
      await open();

      buttonNamed(secondDialog(element)!, 'Annulla').click();
      await settle(fixture);
      expect(secondDialog(element)).toBeNull();
      expect(document.activeElement).toBe(button);

      await open();
      secondDialog(element)!
        .querySelector('dialog')!
        .dispatchEvent(new Event('cancel', { cancelable: true }));
      await settle(fixture);

      expect(secondDialog(element)).toBeNull();
      expect(element.querySelector('dialog')!.open).toBe(true);
      expect(closedCount()).toBe(0);
      expect(element.querySelector<HTMLInputElement>('#driver-first')!.value).toBe('Gianni');
      expect(accountPosts()).toHaveLength(0);
      http.match(() => true);
    });

    it('cancelling the driver dialog after an account was created sends nothing more', async () => {
      const rendered = renderAdmin();
      const { fixture, element, closedCount, open } = rendered;
      await answerAccounts(fixture);
      fill(element, { first: 'Gianni', last: 'Ciccone' });
      await open();
      await submitAccount(rendered);
      accountPosts()[0].flush(NEW_ACCOUNT, { status: 201, statusText: 'Created' });
      await settle(fixture);
      http.match((r) => r.url === ACCOUNTS_URL);

      buttonNamed(element.querySelector('.pt-dialog__actions')!, 'Annulla').click();
      await settle(fixture);

      expect(closedCount()).toBe(1);
      expect(http.match((r) => r.method !== 'GET')).toHaveLength(0);
      expect(TestBed.inject(Toast).current()).toBeNull();
    });
  });
});
