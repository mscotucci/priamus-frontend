import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiError, NoticeContent } from '../../core/api/api-error';
import { CurrentUser } from '../../core/auth/auth-api';
import { Session } from '../../core/auth/session';
import { provideTestI18n } from '../../core/i18n/i18n-testing';
import { userWithRole } from '../../core/testing/dom-testing';
import { Login } from './login';

function render(options: { signIn?: () => Promise<CurrentUser>; notice?: NoticeContent }) {
  const signIn = vi.fn(options.signIn ?? (() => new Promise<CurrentUser>(() => undefined)));
  TestBed.configureTestingModule({
    providers: [
      provideTestI18n(),
      provideRouter([]),
      {
        provide: Session,
        useValue: {
          signIn,
          signOut: vi.fn(() => Promise.resolve()),
          notice: signal(options.notice ?? null).asReadonly(),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
      },
    ],
  });
  TestBed.inject(TranslateService).use('it');
  const fixture = TestBed.createComponent(Login);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const username = element.querySelector<HTMLInputElement>('#login-username')!;
  const password = element.querySelector<HTMLInputElement>('#login-password')!;
  const button = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;

  function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }
  async function submit() {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
  }
  return { fixture, element, username, password, button, signIn, type, submit };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Login', () => {
  it('shows only the card with the brand block, the two fields and "Accedi"', () => {
    const { element, button } = render({});

    expect(element.querySelector('.pt-brand__name')?.textContent).toBe('Priamus');
    expect(element.querySelector('.pt-brand__line')?.textContent).toBe('Gestione Viaggi');
    expect(element.querySelector('label[for="login-username"]')?.textContent).toBe('Nome utente');
    expect(element.querySelector('label[for="login-password"]')?.textContent).toBe('Password');
    expect(button.textContent?.trim()).toBe('Accedi');
    expect(element.querySelectorAll('input')).toHaveLength(2);
    expect(element.querySelector('.pt-notice')).toBeNull();
    expect(element.textContent).not.toMatch(/dimenticata|ricordami/i);
  });

  it('an empty submit shows the frontend messages under each empty field and sends no request', async () => {
    const { element, signIn, submit } = render({});

    await submit();

    expect(element.querySelector('#login-username-error')?.textContent).toBe(
      'Inserisci il nome utente.',
    );
    expect(element.querySelector('#login-password-error')?.textContent).toBe(
      'Inserisci la password.',
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it('only the empty field gets a message', async () => {
    const { element, signIn, type, username, submit } = render({});
    type(username, 'ada');

    await submit();

    expect(element.querySelector('#login-username-error')).toBeNull();
    expect(element.querySelector('#login-password-error')).not.toBeNull();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('while the answer is pending the fields and the button are disabled and the button reads "Accesso in corso…"', async () => {
    const { element, username, password, button, type, submit, signIn } = render({});
    type(username, 'ada');
    type(password, 'secret');

    await submit();

    expect(signIn).toHaveBeenCalledWith('ada', 'secret');
    expect(username.disabled).toBe(true);
    expect(password.disabled).toBe(true);
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('Accesso in corso…');
    expect(element.querySelector('.pt-notice')).toBeNull();
  });

  it('a refusal shows the backend detail, keeps the user name, empties the password and focuses it', async () => {
    const refusal: ApiError = {
      kind: 'domain',
      status: 401,
      errorCode: 'Identity.Auth.InvalidCredentials',
      detail: 'Nome utente o password non validi.',
    };
    const { element, username, password, type, submit } = render({
      signIn: () => Promise.reject(refusal),
    });
    type(username, 'ada');
    type(password, 'wrong');

    await submit();

    expect(element.querySelector('.pt-notice--danger')?.textContent?.trim()).toBe(
      'Nome utente o password non validi.',
    );
    expect(username.value).toBe('ada');
    expect(password.value).toBe('');
    expect(element.querySelector('#login-password-error')).toBeNull();
    expect(document.activeElement).toBe(password);
  });

  it('a failure without a usable body shows the generic message and keeps both values', async () => {
    const failure: ApiError = { kind: 'generic' };
    const { element, username, password, type, submit } = render({
      signIn: () => Promise.reject(failure),
    });
    type(username, 'ada');
    type(password, 'secret');

    await submit();

    expect(element.querySelector('.pt-notice--danger')?.textContent?.trim()).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
    expect(username.value).toBe('ada');
    expect(password.value).toBe('secret');
  });

  it('a Driver signing in gets no notice about an unavailable app', async () => {
    const driver = userWithRole('Driver');
    const { element, username, password, type, submit } = render({
      signIn: () => Promise.resolve(driver),
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    type(username, 'dan');
    type(password, 'secret');

    await submit();

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(element.textContent).not.toContain('non è ancora disponibile');
    expect(navigate).toHaveBeenCalledWith('/driver');
  });

  it('shows the notice the session left, as the backend detail', () => {
    const { element } = render({ notice: { detail: 'Account disabilitato.' } });

    expect(element.querySelector('.pt-notice--danger')?.textContent?.trim()).toBe(
      'Account disabilitato.',
    );
  });

  it('shows the notice the session left, as "Sessione scaduta. Accedi di nuovo."', () => {
    const { element } = render({ notice: { key: 'session.expired' } });

    expect(element.querySelector('.pt-notice--danger')?.textContent?.trim()).toBe(
      'Sessione scaduta. Accedi di nuovo.',
    );
  });
});
