import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { Toast } from '../../../core/toast/toast';
import { UserDisableDialog } from './user-disable-dialog';
import type { UserListItem } from './users-api';
import { UsersFacade } from './users-facade';
import { press, settle } from './users-testing';

const URL = '/api/identity/users';

const USER: UserListItem = {
  id: '2',
  username: 'a.rossetti',
  role: 'Driver',
  status: 'Active',
  createdAt: '2026-05-14T12:00:00Z',
  lastModifiedAt: '2026-05-14T12:00:00Z',
};

describe('UserDisableDialog', () => {
  let http: HttpTestingController;

  const render = () => {
    stubModalDialog();
    TestBed.configureTestingModule({
      providers: [provideTestI18n(), UsersFacade, provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UserDisableDialog);
    fixture.componentRef.setInput('user', USER);
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    TestBed.tick();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, closedCount: () => closed };
  };

  afterEach(() => {
    document.body.replaceChildren();
  });

  const posts = () => http.match((r) => r.url === `${URL}/2/disable` && r.method === 'POST');

  const text = (element: HTMLElement, selector: string) =>
    element.querySelector(selector)?.textContent?.trim();

  it('the title names the user, the role is under it with the text, and the buttons are Annulla and a danger Disabilita', () => {
    const { element } = render();

    expect(text(element, '.pt-title')).toBe('Disabilitare a.rossetti?');
    expect(text(element, '.pt-dialog__head .pt-muted')).toBe('Autista');
    expect(element.querySelector('dialog')!.textContent).toContain(
      "Non potrà più accedere. Se è già dentro, resterà attivo al massimo per un'ora. Potrai riattivarlo in ogni momento.",
    );
    const buttons = Array.from(element.querySelectorAll('.pt-dialog__actions button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Annulla', 'Disabilita']);
    expect(buttons[1].classList.contains('pt-btn--danger')).toBe(true);
    expect(element.querySelector('.pt-tile--danger')).not.toBeNull();
    expect(element.querySelector('dialog')!.open).toBe(true);
  });

  it('the focus is on Annulla when the dialog opens', () => {
    const { element } = render();

    expect(document.activeElement).toBe(element.querySelector('.pt-dialog__actions button'));
    expect(document.activeElement?.textContent?.trim()).toBe('Annulla');
  });

  it('Annulla closes the dialog without sending anything', () => {
    const { fixture, closedCount } = render();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.pt-dialog__actions button')!
      .click();

    expect(closedCount()).toBe(1);
    expect(posts()).toHaveLength(0);
  });

  it('while disabling both buttons are disabled, the primary one shows progress and the dialog cannot be closed', async () => {
    const { fixture, element, closedCount } = render();

    await press(fixture, 1);
    const dialog = element.querySelector('dialog')!;

    expect(posts()).toHaveLength(1);
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.every((b) => b.disabled)).toBe(true);
    expect(text(element, '.pt-btn--danger')).toBe('Disabilitazione…');
    expect(dialog.getAttribute('aria-busy')).toBe('true');

    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(closedCount()).toBe(0);
    http.match(() => true);
  });

  it('on success the dialog closes and the toast names the user', async () => {
    const { fixture, closedCount } = render();
    await press(fixture, 1);

    posts()[0].flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);

    expect(closedCount()).toBe(1);
    expect(TestBed.inject(Toast).current()).toBe('Utente a.rossetti disabilitato');
    http.match(() => true);
  });

  it('a refusal shows the backend detail in a danger notice inside the dialog, which stays open', async () => {
    const { fixture, element, closedCount } = render();
    await press(fixture, 1);

    posts()[0].flush(
      { errorCode: 'Identity.User.NotFound', detail: 'Utente non trovato.' },
      { status: 404, statusText: 'Not Found' },
    );
    await settle(fixture);

    expect(text(element, 'dialog .pt-notice--danger')).toBe('Utente non trovato.');
    expect(closedCount()).toBe(0);
    expect(
      Array.from(element.querySelectorAll<HTMLButtonElement>('button')).some((b) => b.disabled),
    ).toBe(false);
    expect(TestBed.inject(Toast).current()).toBeNull();
    http.match(() => true);
  });

  it('after a refusal the focus is back on Annulla, not lost with the disabled button', async () => {
    const { fixture, element } = render();
    element.querySelectorAll<HTMLButtonElement>('.pt-dialog__actions button')[1].focus();
    await press(fixture, 1);

    posts()[0].flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);

    expect(document.activeElement?.textContent?.trim()).toBe('Annulla');
    http.match(() => true);
  });

  it('a failure without a detail shows the generic message', async () => {
    const { fixture, element } = render();
    await press(fixture, 1);

    posts()[0].flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);

    expect(text(element, 'dialog .pt-notice--danger')).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
    http.match(() => true);
  });

  it('the notice of a previous attempt is cleared when the next one starts', async () => {
    const { fixture, element } = render();
    await press(fixture, 1);
    posts()[0].flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(element.querySelector('.pt-notice--danger')).not.toBeNull();

    await press(fixture, 1);

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(posts()).toHaveLength(1);
    http.match(() => true);
  });
});
