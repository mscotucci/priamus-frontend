import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubPopover } from '../../../core/testing/dom-testing';
import { SearchFilterMenu, SearchFilterOption } from './search-filter-menu';

@Component({
  selector: 'app-search-filter-menu-host',
  imports: [SearchFilterMenu],
  template: `
    <app-search-filter-menu
      labelKey="filter.all.label"
      searchLabelKey="trips.list.find.customer"
      [options]="options()"
      [value]="value()"
      [loading]="loading()"
      [more]="more()"
      (searchChange)="searched.push($event)"
      (valueChange)="picked.push($event)"
    />
  `,
})
class Host {
  readonly options = signal<SearchFilterOption[]>([
    { id: 'c1', label: 'Edilcave SpA' },
    { id: 'c2', label: 'Edilizia Vestina Srl' },
  ]);
  readonly value = signal<SearchFilterOption | null>(null);
  readonly loading = signal(false);
  readonly more = signal(false);
  readonly searched: string[] = [];
  readonly picked: (SearchFilterOption | null)[] = [];
}

describe('SearchFilterMenu', () => {
  let hidden: number;

  beforeEach(() => {
    hidden = 0;
    stubPopover(() => {
      hidden++;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const render = () => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    TestBed.inject(TranslateService).use('it');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim();

  /** Types in the menu's search and lets its 300 ms pause pass. */
  const search = (fixture: ReturnType<typeof render>, value: string) => {
    vi.useFakeTimers();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '.pt-search input',
    )!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    fixture.detectChanges();
  };

  const items = (fixture: ReturnType<typeof render>) =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.pt-menu__item'),
    );

  const note = (fixture: ReturnType<typeof render>) =>
    text((fixture.nativeElement as HTMLElement).querySelector('[role="status"]'));

  it('the menu opens on a search field, "Tutti" and "Scrivi per cercare.", never on a list of records', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const chip = element.querySelector('button.pt-filter__button')!;
    const menu = element.querySelector('.pt-menu')!;

    expect(text(chip)).toBe('Tutti tutti');
    expect(chip.getAttribute('popovertarget')).toBe(menu.id);
    expect(menu.querySelector('.pt-search input')?.getAttribute('aria-label')).toBe('Cerca cliente');
    expect(items(fixture).map(text)).toEqual(['Tutti']);
    expect(note(fixture)).toBe('Scrivi per cercare.');
  });

  it('a search lists the options found; the chip names the one picked', () => {
    const fixture = render();
    search(fixture, 'edil');

    expect(items(fixture).map(text)).toEqual(['Tutti', 'Edilcave SpA', 'Edilizia Vestina Srl']);
    expect(note(fixture)).toBeUndefined();

    fixture.componentInstance.value.set({ id: 'c2', label: 'Edilizia Vestina Srl' });
    fixture.detectChanges();

    expect(text((fixture.nativeElement as HTMLElement).querySelector('.pt-filter__button'))).toBe(
      'Tutti Edilizia Vestina Srl',
    );
    expect(items(fixture).map((i) => i.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'true',
    ]);
  });

  it('picking an option closes the menu and emits it; picking "Tutti" emits null', () => {
    const fixture = render();
    search(fixture, 'edil');

    items(fixture)[2].click();
    items(fixture)[0].click();

    expect(fixture.componentInstance.picked).toEqual([
      { id: 'c2', label: 'Edilizia Vestina Srl' },
      null,
    ]);
    expect(hidden).toBe(2);
  });

  it('typing emits the search text once, 300 ms after the last keystroke; emptying the field at once', () => {
    vi.useFakeTimers();
    const fixture = render();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '.pt-search input',
    )!;

    input.value = 'ed';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(200);
    input.value = 'edil';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(299);

    expect(fixture.componentInstance.searched).toEqual([]);

    vi.advanceTimersByTime(1);

    expect(fixture.componentInstance.searched).toEqual(['edil']);

    input.value = '';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.searched).toEqual(['edil', '']);
  });

  it('says "Caricamento…" while the options load and "Nessun risultato." when none is found', () => {
    const fixture = render();
    fixture.componentInstance.loading.set(true);
    search(fixture, 'zzz');

    expect(note(fixture)).toBe('Caricamento…');

    fixture.componentInstance.loading.set(false);
    fixture.componentInstance.options.set([]);
    fixture.detectChanges();

    expect(note(fixture)).toBe('Nessun risultato.');
  });

  it('closing the menu empties its search, so it opens again on the hint', () => {
    const fixture = render();
    search(fixture, 'edil');
    const element = fixture.nativeElement as HTMLElement;
    const menu = element.querySelector('.pt-menu')!;
    const close = new Event('toggle') as Event & { newState: string };
    Object.defineProperty(close, 'newState', { value: 'closed' });

    menu.dispatchEvent(close);
    fixture.detectChanges();

    expect(element.querySelector<HTMLInputElement>('.pt-search input')!.value).toBe('');
    expect(fixture.componentInstance.searched).toEqual(['edil', '']);
    expect(items(fixture).map(text)).toEqual(['Tutti']);
  });

  it('asks to type more when the search found more options than those listed', () => {
    const fixture = render();
    search(fixture, 'edil');

    expect(note(fixture)).toBeUndefined();

    fixture.componentInstance.more.set(true);
    fixture.detectChanges();

    expect(items(fixture).map(text)).toEqual(['Tutti', 'Edilcave SpA', 'Edilizia Vestina Srl']);
    expect(note(fixture)).toBe('Scrivi di più per restringere la ricerca.');
  });
});
