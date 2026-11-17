import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { ApiError, NoticeContent } from '../../core/api/api-error';
import { CurrentUser } from '../../core/auth/auth-api';
import { Session } from '../../core/auth/session';
import { LoginFacade } from './login-facade';

function user(role: CurrentUser['role']): CurrentUser {
  return { id: '1', username: 'ada', role, driverId: null };
}

function setup(options: {
  signIn: () => Promise<CurrentUser>;
  returnUrl?: string;
  notice?: NoticeContent;
}) {
  const signOut = vi.fn(() => Promise.resolve());
  const signIn = vi.fn(options.signIn);
  TestBed.configureTestingModule({
    providers: [
      LoginFacade,
      provideRouter([]),
      {
        provide: Session,
        useValue: { signIn, signOut, notice: signal(options.notice ?? null).asReadonly() },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(
              options.returnUrl === undefined ? {} : { returnUrl: options.returnUrl },
            ),
          },
        },
      },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  return { facade: TestBed.inject(LoginFacade), signIn, signOut, navigate };
}

describe('LoginFacade', () => {
  it.each<[CurrentUser['role'], string]>([
    ['Admin', '/users'],
    ['BackOffice', '/vehicles'],
  ])('after a %s signs in, navigates to %s', async (role, landing) => {
    const { facade, signIn, navigate } = setup({ signIn: () => Promise.resolve(user(role)) });

    const outcome = await facade.submit('ada', 'secret');

    expect(outcome).toBe('signed-in');
    expect(signIn).toHaveBeenCalledWith('ada', 'secret');
    expect(navigate).toHaveBeenCalledWith(landing);
  });

  it('after signing in, navigates to the in-app returnUrl', async () => {
    const { facade, navigate } = setup({
      signIn: () => Promise.resolve(user('Admin')),
      returnUrl: '/trips?page=2',
    });

    await facade.submit('ada', 'secret');

    expect(navigate).toHaveBeenCalledWith('/trips?page=2');
  });

  it.each(['https://evil.example/x', '//evil.example/x', '/\\evil.example', 'users'])(
    'ignores the returnUrl %s that is not an in-app path',
    async (returnUrl) => {
      const { facade, navigate } = setup({
        signIn: () => Promise.resolve(user('BackOffice')),
        returnUrl,
      });

      await facade.submit('ada', 'secret');

      expect(navigate).toHaveBeenCalledWith('/vehicles');
    },
  );

  it('shows the detail the session left when the page opens, and drops it on submit', async () => {
    const { facade } = setup({
      signIn: () => Promise.resolve(user('Admin')),
      notice: { detail: 'Sessione chiusa.' },
    });

    expect(facade.notice()).toEqual({ detail: 'Sessione chiusa.' });

    await facade.submit('ada', 'secret');

    expect(facade.notice()).toBeNull();
  });

  it('shows the key the session left when there is no detail', () => {
    const { facade } = setup({
      signIn: () => Promise.resolve(user('Admin')),
      notice: { key: 'session.expired' },
    });

    expect(facade.notice()).toEqual({ key: 'session.expired' });
  });

  it('is pending until the answer arrives', async () => {
    let release!: (value: CurrentUser) => void;
    const { facade } = setup({ signIn: () => new Promise((resolve) => (release = resolve)) });

    const submitted = facade.submit('ada', 'secret');

    expect(facade.pending()).toBe(true);

    release(user('Admin'));
    await submitted;

    expect(facade.pending()).toBe(false);
  });

  it('a second submit while one is pending does not sign in again', async () => {
    let release!: (value: CurrentUser) => void;
    const { facade, signIn } = setup({
      signIn: () => new Promise((resolve) => (release = resolve)),
    });

    const first = facade.submit('ada', 'secret');
    const second = await facade.submit('ada', 'secret');

    expect(second).toBe('ignored');
    expect(signIn).toHaveBeenCalledTimes(1);

    release(user('Admin'));
    await first;
  });

  it('stays pending until the navigation after the sign-in has completed', async () => {
    let finish!: (value: boolean) => void;
    const { facade, signIn, navigate } = setup({
      signIn: () => Promise.resolve(user('Admin')),
    });
    navigate.mockReturnValue(new Promise<boolean>((resolve) => (finish = resolve)));

    const first = facade.submit('ada', 'secret');
    await Promise.resolve();
    await Promise.resolve();
    await facade.submit('ada', 'secret');

    expect(facade.pending()).toBe(true);
    expect(signIn).toHaveBeenCalledTimes(1);

    finish(true);
    await first;

    expect(facade.pending()).toBe(false);
  });

  it('a refusal with an errorCode becomes the backend detail', async () => {
    const error: ApiError = {
      kind: 'domain',
      status: 401,
      errorCode: 'Identity.Auth.InvalidCredentials',
      detail: 'Nome utente o password non validi.',
    };
    const { facade, navigate } = setup({ signIn: () => Promise.reject(error) });

    const outcome = await facade.submit('ada', 'wrong');

    expect(outcome).toBe('refused');
    expect(facade.notice()).toEqual({ detail: 'Nome utente o password non validi.' });
    expect(facade.pending()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each<ApiError>([
    { kind: 'generic' },
    { kind: 'validation', errors: {} },
    { kind: 'domain', status: 401, errorCode: 'Identity.Auth.Unknown', detail: null },
  ])('a failure without a usable body ($kind) becomes the generic text', async (error) => {
    const { facade } = setup({ signIn: () => Promise.reject(error) });

    const outcome = await facade.submit('ada', 'secret');

    expect(outcome).toBe('failed');
    expect(facade.notice()).toEqual({ key: 'errors.generic' });
  });

  it('signs a Driver out at once, does not navigate and shows the unavailable notice', async () => {
    const { facade, signOut, navigate } = setup({
      signIn: () => Promise.resolve(user('Driver')),
    });

    const outcome = await facade.submit('dan', 'secret');

    expect(outcome).toBe('driver');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(facade.notice()).toEqual({ key: 'login.driver.unavailable' });
  });
});
