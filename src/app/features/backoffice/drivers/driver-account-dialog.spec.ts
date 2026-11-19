import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog, userWithRole } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { DriverAccountDialog } from './driver-account-dialog';
import { DriversFacade } from './drivers-facade';

const USERS_URL = '/api/identity/users';

describe('DriverAccountDialog', () => {
  let http: HttpTestingController;

  const render = (firstName = 'Gianni', lastName = 'Ciccone') => {
    stubModalDialog();
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        DriversFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Session, useValue: { user: signal(userWithRole('Admin')).asReadonly() } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DriverAccountDialog);
    fixture.componentRef.setInput('firstName', firstName);
    fixture.componentRef.setInput('lastName', lastName);
    const created: string[] = [];
    let closed = 0;
    fixture.componentInstance.created.subscribe((id) => created.push(id));
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    TestBed.tick();
    return {
      fixture,
      element: fixture.nativeElement as HTMLElement,
      created,
      closedCount: () => closed,
    };
  };

  const type = (element: HTMLElement, selector: string, value: string) => {
    const field = element.querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const submit = async (fixture: ReturnType<typeof render>['fixture']) => {
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(fixture);
  };

  const posts = () => http.match((r) => r.url === USERS_URL && r.method === 'POST');

  it('the frontend validation of "Nuovo utente" refuses a bad user name and password without sending anything', async () => {
    const { fixture, element, created } = render();
    type(element, '#account-username', 'A');
    type(element, '#account-password', 'short');
    await submit(fixture);

    expect(element.querySelector('#account-username-note')?.textContent).toContain(
      'Usa da 3 a 64 caratteri',
    );
    expect(element.querySelector('#account-password-note')?.textContent).toContain(
      'La password deve contenere tra 8 e 128 caratteri',
    );
    expect(posts()).toHaveLength(0);
    expect(created).toEqual([]);
  });

  it('Mostra reveals the password and Nascondi hides it again', async () => {
    const { fixture, element } = render();
    const password = element.querySelector<HTMLInputElement>('#account-password')!;
    const toggle = password.parentElement!.querySelector('button')!;

    expect(password.type).toBe('password');
    toggle.click();
    await settle(fixture);
    expect(password.type).toBe('text');
    expect(toggle.textContent?.trim()).toBe('Nascondi');
  });

  it('a valid submit creates the user with the role Driver and emits the new id', async () => {
    const { fixture, element, created, closedCount } = render();
    type(element, '#account-password', 'Password1!');
    await submit(fixture);

    const [post] = posts();
    expect(post.request.body).toEqual({
      username: 'g.ciccone',
      password: 'Password1!',
      role: 'Driver',
    });
    post.flush(
      { id: 'u9', role: 'Driver', status: 'Active' },
      { status: 201, statusText: 'Created' },
    );
    await settle(fixture);

    expect(created).toEqual(['u9']);
    expect(closedCount()).toBe(0);
    http.match(() => true);
  });

  it('a 400 on the user name shows under the field and the dialog stays open', async () => {
    const { fixture, element, created } = render();
    type(element, '#account-password', 'Password1!');
    await submit(fixture);

    posts()[0].flush(
      { errors: { Username: ['Nome già usato.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(fixture);

    expect(element.querySelector('#account-username-note')?.textContent?.trim()).toBe(
      'Nome già usato.',
    );
    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(created).toEqual([]);
    http.match(() => true);
  });

  it('Annulla emits closed and creates nothing', async () => {
    const { fixture, element, closedCount } = render();
    const cancel = Array.from(element.querySelectorAll('.pt-dialog__actions button')).find(
      (b) => b.textContent?.trim() === 'Annulla',
    ) as HTMLButtonElement;
    cancel.click();
    await settle(fixture);

    expect(closedCount()).toBe(1);
    expect(posts()).toHaveLength(0);
  });
});
