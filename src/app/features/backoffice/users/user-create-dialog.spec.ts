import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { Toast } from '../../../core/toast/toast';
import { UserCreateDialog } from './user-create-dialog';
import { UsersFacade } from './users-facade';
import { settle } from '../../../core/testing/interaction-testing';

const URL = '/api/identity/users';

const VALID_USERNAME = 'm.rossi';
const VALID_PASSWORD = 'Password1!';

describe('UserCreateDialog', () => {
  let http: HttpTestingController;

  const render = () => {
    stubModalDialog();
    TestBed.configureTestingModule({
      providers: [provideTestI18n(), UsersFacade, provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UserCreateDialog);
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    TestBed.tick();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, closedCount: () => closed };
  };

  const posts = () => http.match((r) => r.url === URL && r.method === 'POST');

  const type = (element: HTMLElement, selector: string, value: string) => {
    const field = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const fill = (
    element: HTMLElement,
    values: { username?: string; password?: string; role?: string },
  ) => {
    type(element, '#create-username', values.username ?? VALID_USERNAME);
    type(element, '#create-password', values.password ?? VALID_PASSWORD);
    type(element, '#create-role', values.role ?? 'BackOffice');
  };

  const submit = async (fixture: ReturnType<typeof render>['fixture']) => {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(fixture);
  };

  const text = (element: HTMLElement, selector: string) =>
    element.querySelector(selector)?.textContent?.trim();

  it('shows the fields Nome utente, Password and Ruolo and the buttons Annulla and Crea utente', () => {
    const { element } = render();

    expect(text(element, '.pt-title')).toBe('Nuovo utente');
    expect(Array.from(element.querySelectorAll('label')).map((l) => l.textContent?.trim())).toEqual(
      ['Nome utente', 'Password', 'Ruolo'],
    );
    expect(
      Array.from(element.querySelectorAll('.pt-dialog__actions button')).map((b) =>
        b.textContent?.trim(),
      ),
    ).toEqual(['Annulla', 'Crea utente']);
    expect(element.querySelector('dialog')!.open).toBe(true);
  });

  it('a muted line states the rule under Nome utente and under Password', () => {
    const { element } = render();

    expect(text(element, '#create-username-note')).toBe(
      'Da 3 a 64 caratteri: lettere minuscole, cifre, punto, trattino e trattino basso.',
    );
    expect(text(element, '#create-password-note')).toBe(
      'Da 8 a 128 caratteri, con almeno una lettera, un numero e un carattere speciale.',
    );
    expect(element.querySelectorAll('.pt-field__hint')).toHaveLength(2);
    expect(element.querySelector('.pt-field__error')).toBeNull();
  });

  it('the password is hidden at first, one field only, and Mostra / Nascondi toggles it', () => {
    const { fixture, element } = render();
    const input = element.querySelector<HTMLInputElement>('#create-password')!;
    const toggle = element.querySelector<HTMLButtonElement>('#create-password + button')!;

    expect(input.type).toBe('password');
    expect(toggle.textContent?.trim()).toBe('Mostra');
    expect(element.querySelectorAll('input')).toHaveLength(2);

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.textContent?.trim()).toBe('Nascondi');

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
    expect(toggle.textContent?.trim()).toBe('Mostra');
  });

  it('the role is a select with Amministratore, Segreteria and Autista and nothing preselected', () => {
    const { element } = render();
    const select = element.querySelector<HTMLSelectElement>('#create-role')!;

    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual([
      'Scegli un ruolo',
      'Amministratore',
      'Segreteria',
      'Autista',
    ]);
    expect(select.value).toBe('');
  });

  it.each([
    ['2 characters', { username: 'ab' }],
    ['65 characters', { username: 'a'.repeat(65) }],
    ['an uppercase letter', { username: 'M.rossi' }],
    ['a leading dot', { username: '.mrossi' }],
    ['a space', { username: 'm rossi' }],
    ['an empty value', { username: '' }],
  ])('a user name with %s sends no request and shows the frontend message', async (_n, values) => {
    const { fixture, element } = render();
    fill(element, values);

    await submit(fixture);

    expect(posts()).toHaveLength(0);
    expect(text(element, '#create-username-note')).toBe(
      'Usa da 3 a 64 caratteri: solo lettere minuscole, cifre, punto, trattino e trattino basso, iniziando con una lettera o una cifra.',
    );
    expect(element.querySelector('#create-username')!.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('.pt-field__hint#create-username-note')).toBeNull();
    http.match(() => true);
  });

  it.each([
    ['7 characters', 'Abcde1!'],
    ['129 characters', 'Abcde1!' + 'a'.repeat(122)],
    ['no letter', '12345678!'],
    ['no digit', 'Password!!'],
    ['no special character', 'Password12'],
    ['an empty value', ''],
  ])('a password with %s sends no request and shows the frontend message', async (_n, password) => {
    const { fixture, element } = render();
    fill(element, { password });

    await submit(fixture);

    expect(posts()).toHaveLength(0);
    expect(text(element, '#create-password-note')).toBe(
      'La password deve contenere tra 8 e 128 caratteri, almeno una lettera, un numero e un carattere speciale.',
    );
    http.match(() => true);
  });

  it('no role chosen sends no request and shows the message under Ruolo', async () => {
    const { fixture, element } = render();
    fill(element, { role: '' });

    await submit(fixture);

    expect(posts()).toHaveLength(0);
    expect(text(element, '#create-role-note')).toBe('Scegli un ruolo.');
    http.match(() => true);
  });

  it.each([
    ['a user name of 3 characters', { username: 'abc' }],
    ['a user name of 64 characters', { username: 'a'.repeat(64) }],
    ['a user name starting with a digit', { username: '1.a_b-c' }],
    ['a password of 8 characters', { password: 'Abcdef1!' }],
    ['a password of 128 characters', { password: 'Abcde1!' + 'a'.repeat(121) }],
  ] as [string, { username?: string; password?: string }][])(
    '%s is accepted and sent as typed',
    async (_n, values) => {
      const { fixture, element } = render();
      fill(element, values);

      await submit(fixture);

      const [request] = posts();
      expect(request.request.body).toEqual({
        username: values.username ?? VALID_USERNAME,
        password: values.password ?? VALID_PASSWORD,
        role: 'BackOffice',
      });
      http.match(() => true);
    },
  );

  it('while creating, fields and buttons are disabled, the primary button shows progress and the dialog cannot be closed', async () => {
    const { fixture, element, closedCount } = render();
    fill(element, {});

    await submit(fixture);
    const dialog = element.querySelector('dialog')!;

    expect(posts()).toHaveLength(1);
    expect(
      Array.from(element.querySelectorAll('input, select')).every(
        (f) => (f as HTMLInputElement).disabled,
      ),
    ).toBe(true);
    expect(Array.from(element.querySelectorAll('button')).every((b) => b.disabled)).toBe(true);
    expect(text(element, '.pt-btn--primary')).toBe('Creazione in corso…');
    expect(dialog.getAttribute('aria-busy')).toBe('true');

    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(closedCount()).toBe(0);
    http.match(() => true);
  });

  it('a refusal with an error code shows its detail in a danger notice above the fields and keeps the values', async () => {
    const { fixture, element, closedCount } = render();
    fill(element, {});
    await submit(fixture);

    posts()[0].flush(
      { errorCode: 'Identity.User.UsernameAlreadyTaken', detail: 'Il nome utente è già in uso.' },
      { status: 409, statusText: 'Conflict' },
    );
    await settle(fixture);

    const notice = element.querySelector('.pt-notice--danger')!;
    expect(notice.textContent?.trim()).toBe('Il nome utente è già in uso.');
    expect(notice.compareDocumentPosition(element.querySelector('.pt-field')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(element.querySelector<HTMLInputElement>('#create-username')!.value).toBe(VALID_USERNAME);
    expect(element.querySelector<HTMLInputElement>('#create-password')!.value).toBe(VALID_PASSWORD);
    expect(element.querySelector<HTMLSelectElement>('#create-role')!.value).toBe('BackOffice');
    expect(element.querySelector<HTMLInputElement>('#create-username')!.disabled).toBe(false);
    expect(closedCount()).toBe(0);
    http.match(() => true);
  });

  it('after a refusal the focus is on Nome utente, not lost with the disabled button', async () => {
    const { fixture, element } = render();
    document.body.appendChild(element);
    fill(element, {});
    await submit(fixture);

    posts()[0].flush(
      { errorCode: 'Identity.User.UsernameAlreadyTaken', detail: 'Il nome utente è già in uso.' },
      { status: 409, statusText: 'Conflict' },
    );
    await settle(fixture);

    expect(document.activeElement).toBe(element.querySelector('#create-username'));
    element.remove();
    http.match(() => true);
  });

  it('a failure without a usable body shows the generic message above the fields', async () => {
    const { fixture, element } = render();
    fill(element, {});
    await submit(fixture);

    posts()[0].flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);

    expect(text(element, '.pt-notice--danger')).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
    expect(element.querySelector('.pt-btn--primary')!.textContent?.trim()).toBe('Crea utente');
    http.match(() => true);
  });

  it('the field errors of a 400 appear under the matching field, ignoring case', async () => {
    const { fixture, element } = render();
    fill(element, {});
    await submit(fixture);

    posts()[0].flush(
      {
        errors: { Username: ['Nome non valido.'], PASSWORD: ['Password debole.', 'Troppo corta.'] },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(fixture);

    expect(text(element, '#create-username-note')).toBe('Nome non valido.');
    expect(text(element, '#create-password-note')).toBe('Password debole. Troppo corta.');
    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    http.match(() => true);
  });

  it('a 400 whose errors match no field shows the generic message above the fields', async () => {
    const { fixture, element } = render();
    fill(element, {});
    await submit(fixture);

    posts()[0].flush(
      { errors: { Unknown: ['Qualcosa non va.'], Username: [] } },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(fixture);

    expect(text(element, '.pt-notice--danger')).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
    http.match(() => true);
  });

  it('an invalid resubmit after a refusal removes the old notice', async () => {
    const { fixture, element } = render();
    fill(element, {});
    await submit(fixture);
    posts()[0].flush(
      { errorCode: 'Identity.User.UsernameAlreadyTaken', detail: 'Il nome utente è già in uso.' },
      { status: 409, statusText: 'Conflict' },
    );
    await settle(fixture);
    expect(element.querySelector('.pt-notice--danger')).not.toBeNull();

    type(element, '#create-username', 'X');
    await submit(fixture);

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(element.querySelector('.pt-field__error')).not.toBeNull();
    expect(posts()).toHaveLength(0);
    http.match(() => true);
  });

  it('on success the dialog closes, the toast names the user and the list is asked again', async () => {
    const { fixture, element, closedCount } = render();
    http
      .expectOne((r) => r.url === URL && r.method === 'GET')
      .flush({ data: [], totalCount: 0, page: 1, pageSize: 20 });
    await settle(fixture);
    fill(element, {});
    await submit(fixture);

    posts()[0].flush(
      { id: '9', username: VALID_USERNAME, role: 'BackOffice', status: 'Active' },
      { status: 201, statusText: 'Created' },
    );
    await settle(fixture);

    expect(closedCount()).toBe(1);
    expect(TestBed.inject(Toast).current()).toBe('Utente m.rossi creato');
    http.expectOne((r) => r.url === URL && r.method === 'GET');
  });

  it('Annulla and Escape close the dialog whatever was typed, and no click handler closes it (a click on the dialog emits nothing and leaves it open)', () => {
    const { fixture, element, closedCount } = render();
    fill(element, {});
    fixture.detectChanges();
    const dialog = element.querySelector('dialog')!;

    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(closedCount()).toBe(0);
    expect(dialog.open).toBe(true);

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(closedCount()).toBe(1);

    element.querySelector<HTMLButtonElement>('.pt-dialog__actions button')!.click();
    expect(closedCount()).toBe(2);
    expect(posts()).toHaveLength(0);
    http.match(() => true);
  });
});
