import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../i18n/i18n-testing';
import { Layout } from './layout';
import { Topbar } from './topbar';

@Component({
  imports: [Topbar],
  template: `
    <app-topbar section="Sistema" [page]="page" title="Utenti" [line]="line">
      <button type="button" id="action">Nuovo utente</button>
    </app-topbar>
  `,
})
class Host {
  page: string | undefined = 'Utenti';
  line: string | undefined = '23 utenti';
}

function render(setup: (host: Host) => void = () => undefined) {
  const openDrawer = vi.fn();
  TestBed.configureTestingModule({
    providers: [provideTestI18n(), { provide: Layout, useValue: { openDrawer } }],
  });
  TestBed.inject(TranslateService).use('it');
  const fixture = TestBed.createComponent(Host);
  setup(fixture.componentInstance);
  fixture.detectChanges();
  return { element: fixture.nativeElement as HTMLElement, openDrawer };
}

describe('Topbar', () => {
  it('shows the section and page, the title, the line beside it and the page actions', () => {
    const { element } = render();

    expect(element.querySelector('.pt-eyebrow')?.textContent).toBe('Sistema · Utenti');
    expect(element.querySelector('h1')?.textContent).toBe('Utenti');
    expect(element.querySelector('h1')?.nextElementSibling?.textContent).toBe('23 utenti');
    expect(element.querySelector('.pt-topbar__actions #action')?.textContent).toBe('Nuovo utente');
  });

  it('with no page and no line the eyebrow is the section alone and there is no line', () => {
    const { element } = render((host) => {
      host.page = undefined;
      host.line = undefined;
    });

    expect(element.querySelector('.pt-eyebrow')?.textContent).toBe('Sistema');
    expect(element.querySelector('.pt-muted')).toBeNull();
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
