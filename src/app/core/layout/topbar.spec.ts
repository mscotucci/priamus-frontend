import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../i18n/i18n-testing';
import { Layout } from './layout';
import { Crumb, Topbar } from './topbar';

@Component({
  imports: [Topbar],
  template: `
    <app-topbar [crumbs]="crumbs" title="Utenti" [line]="line">
      <span titleAside id="aside">Attivo</span>
      <button type="button" id="action">Nuovo utente</button>
    </app-topbar>
  `,
})
class Host {
  crumbs: Crumb[] = [{ label: 'Sistema' }];
  line: string | undefined = '23 utenti';
}

function render(setup: (host: Host) => void = () => undefined) {
  const openDrawer = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideTestI18n(),
      provideRouter([]),
      { provide: Layout, useValue: { openDrawer } },
    ],
  });
  TestBed.inject(TranslateService).use('it');
  const fixture = TestBed.createComponent(Host);
  setup(fixture.componentInstance);
  fixture.detectChanges();
  return { element: fixture.nativeElement as HTMLElement, openDrawer };
}

describe('Topbar', () => {
  it('shows the breadcrumb, the title, the line beside it and the page actions', () => {
    const { element } = render();

    const nav = element.querySelector('nav[aria-label="Percorso"]')!;
    expect(nav.querySelector('ol.pt-breadcrumb')?.textContent?.trim()).toBe('Sistema');
    expect(element.querySelector('h1')?.textContent).toBe('Utenti');
    expect(element.querySelector('h1')?.nextElementSibling?.textContent).toBe('23 utenti');
    expect(element.querySelector('.pt-topbar__actions #action')?.textContent).toBe('Nuovo utente');
  });

  it('with no line there is none', () => {
    const { element } = render((host) => (host.line = undefined));

    expect(element.querySelector('.pt-muted')).toBeNull();
  });

  it('each level is an item, a level with a link is a link to it, and a level with no label is not shown', () => {
    const { element } = render(
      (host) =>
        (host.crumbs = [
          { label: 'Anagrafiche' },
          { label: 'Clienti', link: '/customers' },
          { label: '', link: '/customers/c1' },
        ]),
    );

    const items = Array.from(element.querySelectorAll('.pt-breadcrumb li'));
    expect(items.map((li) => li.textContent?.trim())).toEqual(['Anagrafiche', 'Clienti']);
    expect(items[0].querySelector('a')).toBeNull();
    expect(items[1].querySelector('a')?.getAttribute('href')).toBe('/customers');
  });

  it('the title aside is shown after the title and its line, and the action stays in the actions', () => {
    const { element } = render();

    expect(element.querySelector('.pt-topbar__heading .pt-muted')?.nextElementSibling?.id).toBe(
      'aside',
    );
    expect(element.querySelector('.pt-topbar__actions #aside')).toBeNull();
    expect(element.querySelector('.pt-topbar__actions #action')).not.toBeNull();
  });

  it('the top bar sticks to the top of the scrolling page column', () => {
    const { element } = render();

    expect(element.querySelector('app-topbar')?.classList).toContain('sticky');
    expect(element.querySelector('app-topbar')?.classList).toContain('top-0');
  });

  it('the burger opens the drawer', () => {
    const { element, openDrawer } = render();

    element.querySelector<HTMLButtonElement>('button[aria-label="Apri il menu"]')!.click();

    expect(openDrawer).toHaveBeenCalledTimes(1);
  });

  it('the top bar has no search, no notifications and no theme switch', () => {
    const { element } = render();

    expect(element.querySelector('input, [role="search"], [role="switch"]')).toBeNull();
    const labels = [...element.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Apri il menu', null]);
  });
});
