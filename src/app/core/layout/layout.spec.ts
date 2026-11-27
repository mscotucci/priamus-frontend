import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CurrentUser } from '../auth/auth-api';
import { Session } from '../auth/session';
import { provideTestI18n } from '../i18n/i18n-testing';
import { LeaveConfirmation } from '../../shared/guards/leave-confirmation';
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
      provideRouter([
        { path: 'trips', children: [] },
        { path: 'users', children: [] },
        { path: 'settings', children: [] },
        { path: 'customers', children: [] },
        { path: 'drivers', children: [] },
        { path: 'vehicles', children: [] },
        { path: 'locations', children: [] },
      ]),
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
    expect(sidebar.querySelector('.pt-nav__group')?.textContent).toBe('Operatività');
    const item = sidebar.querySelector('nav a.pt-nav-item')!;
    expect(item.textContent?.trim()).toBe('Viaggi');
    expect(item.querySelector('svg')).not.toBeNull();
    expect(sidebar.querySelector('.pt-avatar')).not.toBeNull();
    expect(sidebar.querySelector('button[aria-label="Esci"]')).not.toBeNull();
  });

  it('an Admin sees the group "Operatività" with "Viaggi" first, then the group "Anagrafiche" with "Clienti", "Autisti", "Mezzi", "Luoghi" in that order, then the group "Sistema" with "Utenti" and "Impostazioni", and nothing is shown disabled', () => {
    const { sidebar } = render(admin);

    const groups = [...sidebar.querySelectorAll('.pt-nav__group')].map((g) => g.textContent);
    expect(groups).toEqual(['Operatività', 'Anagrafiche', 'Sistema']);
    const items = sidebar.querySelectorAll('nav a');
    expect(items).toHaveLength(7);
    expect(items[0].getAttribute('href')).toBe('/trips');
    expect(items[0].textContent?.trim()).toBe('Viaggi');
    expect(items[0].querySelector('use')?.getAttribute('href')).toBe('icons.svg#route');
    expect(items[1].getAttribute('href')).toBe('/customers');
    expect(items[1].textContent?.trim()).toBe('Clienti');
    expect(items[1].querySelector('use')?.getAttribute('href')).toBe('icons.svg#building');
    expect(items[2].getAttribute('href')).toBe('/drivers');
    expect(items[2].textContent?.trim()).toBe('Autisti');
    expect(items[2].querySelector('use')?.getAttribute('href')).toBe('icons.svg#users');
    expect(items[3].getAttribute('href')).toBe('/vehicles');
    expect(items[4].getAttribute('href')).toBe('/locations');
    expect(items[4].textContent?.trim()).toBe('Luoghi');
    expect(items[4].querySelector('use')?.getAttribute('href')).toBe('icons.svg#pin');
    expect(items[5].getAttribute('href')).toBe('/users');
    expect(items[6].getAttribute('href')).toBe('/settings');
    expect(items[6].textContent?.trim()).toBe('Impostazioni');
    expect(items[6].querySelector('use')?.getAttribute('href')).toBe('icons.svg#settings');
    expect(sidebar.querySelector('[disabled], [aria-disabled="true"]')).toBeNull();
  });

  it('a BackOffice user sees "Viaggi" under "Operatività" above "Clienti", "Autisti", "Mezzi", "Luoghi" under "Anagrafiche", with no "Utenti" or "Impostazioni" item and no "Sistema" group', () => {
    const { sidebar, drawer } = render(backOffice);

    const items = sidebar.querySelectorAll('nav a');
    expect(items).toHaveLength(5);
    expect(items[0].getAttribute('href')).toBe('/trips');
    expect(items[1].getAttribute('href')).toBe('/customers');
    expect(items[2].getAttribute('href')).toBe('/drivers');
    expect(items[3].getAttribute('href')).toBe('/vehicles');
    expect(items[4].getAttribute('href')).toBe('/locations');
    expect(
      [...sidebar.querySelectorAll('.pt-nav__group')].map((group) => group.textContent),
    ).toEqual(['Operatività', 'Anagrafiche']);
    expect(drawer.textContent).not.toContain('Utenti');
    expect(drawer.textContent).not.toContain('Impostazioni');
    expect(drawer.textContent).not.toContain('Sistema');
  });

  it('a Driver has no "Viaggi" link and no "Operatività" group', () => {
    const { sidebar, drawer } = render(userWithRole('Driver'));

    expect(sidebar.querySelector('nav a[href="/trips"]')).toBeNull();
    expect(drawer.querySelector('nav a[href="/trips"]')).toBeNull();
    expect(sidebar.textContent).not.toContain('Operatività');
    expect(sidebar.querySelector('nav')?.textContent).not.toContain('Viaggi');
  });

  it('the "Luoghi" item draws the pin icon of the icon set', () => {
    const { sidebar } = render(admin);

    expect(sidebar.querySelector('nav a[href="/locations"] use')?.getAttribute('href')).toBe(
      'icons.svg#pin',
    );
  });

  it('the item of the open page is marked as the current one', async () => {
    const { fixture, sidebar } = render(admin);
    await TestBed.inject(Router).navigateByUrl('/users');
    fixture.detectChanges();

    expect(sidebar.querySelector('nav a[href="/users"]')?.getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      sidebar.querySelector('nav a[href="/vehicles"]')?.getAttribute('aria-current'),
    ).toBeNull();
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

  const settled = () => new Promise<void>((resolve) => setTimeout(resolve));

  it('"Esci" signs out at once, without asking for confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const { sidebar, signOut, element } = render(admin);

    sidebar.querySelector<HTMLButtonElement>('button[aria-label="Esci"]')!.click();
    await settled();

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
    await settled();
    expect(signOut).toHaveBeenCalledTimes(1);

    finish();
    await settled();
    button.click();
    await settled();
    expect(signOut).toHaveBeenCalledTimes(2);
  });

  describe('with a page that has unsaved changes', () => {
    const renderWithPage = (answer: () => Promise<boolean>) => {
      const harness = render(admin);
      TestBed.inject(LeaveConfirmation).register({ confirmLeave: answer });
      const button = harness.sidebar.querySelector<HTMLButtonElement>('button[aria-label="Esci"]')!;
      return { ...harness, button };
    };

    it('"Esci" asks the page first and does not sign out while the page says to stay', async () => {
      const { button, signOut } = renderWithPage(() => Promise.resolve(false));

      button.click();
      await settled();

      expect(signOut).not.toHaveBeenCalled();
    });

    it('"Esci" signs out once the page says the user may leave', async () => {
      const { button, signOut } = renderWithPage(() => Promise.resolve(true));

      button.click();
      await settled();

      expect(signOut).toHaveBeenCalledTimes(1);
    });

    it('after staying, "Esci" asks again', async () => {
      const answer = vi.fn(() => Promise.resolve(false));
      const { button } = renderWithPage(answer);

      button.click();
      await settled();
      button.click();
      await settled();

      expect(answer).toHaveBeenCalledTimes(2);
    });
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
    expect(drawer.querySelector('nav a')?.textContent?.trim()).toBe('Viaggi');
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
