import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CurrentUser } from '../auth/auth-api';
import { Session } from '../auth/session';
import { provideTestI18n } from '../i18n/i18n-testing';
import { stubModalDialog, userWithRole } from '../testing/dom-testing';
import { Layout } from './layout';

const admin = userWithRole('Admin');
const backOffice = userWithRole('BackOffice', '2');

function render(user: CurrentUser) {
  stubModalDialog();
  const signOut = vi.fn(() => Promise.resolve());
  TestBed.configureTestingModule({
    providers: [
      provideTestI18n(),
      provideRouter([{ path: 'users', children: [] }]),
      { provide: Session, useValue: { user: signal(user).asReadonly(), signOut } },
    ],
  });
  TestBed.inject(TranslateService).use('it');
  const fixture = TestBed.createComponent(Layout);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const sidebar = element.querySelector('aside')!;
  const drawer = element.querySelector('dialog')!;
  return { fixture, element, sidebar, drawer, signOut };
}

describe('Layout', () => {
  it('the sidebar has the brand block, the labelled navigation with icons and the user card with "Esci"', () => {
    const { sidebar } = render(admin);

    expect(sidebar.querySelector('.pt-brand__name')?.textContent).toBe('Priamus');
    expect(sidebar.querySelector('.pt-brand__line')?.textContent).toBe('Gestione Viaggi');
    expect(sidebar.querySelector('.pt-nav__group')?.textContent).toBe('Sistema');
    const item = sidebar.querySelector('nav a.pt-nav-item')!;
    expect(item.textContent?.trim()).toBe('Utenti');
    expect(item.querySelector('svg')).not.toBeNull();
    expect(sidebar.querySelector('.pt-avatar')).not.toBeNull();
    expect(sidebar.querySelector('button[aria-label="Esci"]')).not.toBeNull();
  });

  it('an Admin sees "Utenti", pointing to /users, and nothing is shown disabled', () => {
    const { sidebar } = render(admin);

    const items = sidebar.querySelectorAll('nav a');
    expect(items).toHaveLength(1);
    expect(items[0].getAttribute('href')).toBe('/users');
    expect(sidebar.querySelector('[disabled], [aria-disabled="true"]')).toBeNull();
  });

  it('a BackOffice user has no "Utenti" item and no empty group label', () => {
    const { sidebar, drawer } = render(backOffice);

    expect(sidebar.querySelectorAll('nav a')).toHaveLength(0);
    expect(sidebar.querySelector('.pt-nav__group')).toBeNull();
    expect(drawer.textContent).not.toContain('Utenti');
  });

  it('the item of the open page is marked as the current one', async () => {
    const { fixture, sidebar } = render(admin);
    await TestBed.inject(Router).navigateByUrl('/users');
    fixture.detectChanges();

    expect(sidebar.querySelector('nav a')?.getAttribute('aria-current')).toBe('page');
  });

  it.each([
    [admin, 'AD', 'admin', 'Amministratore'],
    [backOffice, 'MR', 'm.rossi', 'Segreteria'],
    [userWithRole('Driver'), 'DA', 'dan', 'Autista'],
  ])(
    'the user card of %o shows initials, user name and the Italian role',
    (user, letters, name, role) => {
      const { sidebar } = render(user);

      expect(sidebar.querySelector('.pt-avatar')?.textContent).toBe(letters);
      expect(sidebar.querySelector('.truncate')?.textContent).toBe(name);
      expect(sidebar.querySelector('.pt-muted')?.textContent?.trim()).toBe(role);
    },
  );

  it('"Esci" signs out at once, without asking for confirmation', () => {
    const confirm = vi.spyOn(window, 'confirm');
    const { sidebar, signOut, element } = render(admin);

    sidebar.querySelector<HTMLButtonElement>('button[aria-label="Esci"]')!.click();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alertdialog"]')).toBeNull();
    confirm.mockRestore();
  });

  it('a second click on "Esci" while the sign-out is pending does not sign out again', async () => {
    const { sidebar, signOut } = render(admin);
    let finish!: () => void;
    signOut.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    const button = sidebar.querySelector<HTMLButtonElement>('button[aria-label="Esci"]')!;

    button.click();
    button.click();
    expect(signOut).toHaveBeenCalledTimes(1);

    finish();
    await Promise.resolve();
    await Promise.resolve();
    button.click();
    expect(signOut).toHaveBeenCalledTimes(2);
  });

  it('the page column scrolls and the drawer is not hidden by width, so an open drawer survives a resize', () => {
    const { element, drawer } = render(admin);

    expect(element.querySelector('router-outlet')?.parentElement?.classList).toContain(
      'overflow-auto',
    );
    expect(drawer.className).not.toContain('min-[900px]:hidden');
  });

  it('the drawer is a native dialog with the same navigation and a close button, closed at first', () => {
    const { drawer } = render(admin);

    expect(drawer.open).toBe(false);
    expect(drawer.querySelector('nav a')?.textContent?.trim()).toBe('Utenti');
    expect(drawer.querySelector('button[aria-label="Chiudi il menu"]')).not.toBeNull();
    expect(drawer.querySelector('button[aria-label="Esci"]')).not.toBeNull();
  });

  it('the close button closes the drawer', () => {
    const { fixture, drawer } = render(admin);
    fixture.componentInstance.openDrawer();
    expect(drawer.open).toBe(true);

    drawer.querySelector<HTMLButtonElement>('button[aria-label="Chiudi il menu"]')!.click();

    expect(drawer.open).toBe(false);
  });

  it('choosing an item closes the drawer', () => {
    const { fixture, drawer } = render(admin);
    fixture.componentInstance.openDrawer();

    drawer.querySelector<HTMLAnchorElement>('nav a')!.click();

    expect(drawer.open).toBe(false);
  });

  it('a click on the backdrop closes the drawer, a click on its content does not', () => {
    const { fixture, drawer } = render(admin);
    fixture.componentInstance.openDrawer();

    drawer.querySelector<HTMLElement>('.pt-brand')!.click();
    expect(drawer.open).toBe(true);

    drawer.click();
    expect(drawer.open).toBe(false);
  });

  it('Escape is left to the native dialog, whose cancel event is not prevented', () => {
    const { fixture, drawer } = render(admin);
    fixture.componentInstance.openDrawer();

    const cancel = new Event('cancel', { cancelable: true });
    drawer.dispatchEvent(cancel);

    expect(cancel.defaultPrevented).toBe(false);
  });

  it('the shell has no search, no notifications and no theme switch', () => {
    const { element } = render(admin);

    expect(element.querySelector('input, [role="search"], [role="switch"]')).toBeNull();
    const labels = [...element.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
    expect(new Set(labels)).toEqual(new Set(['Chiudi il menu', 'Esci']));
  });
});
