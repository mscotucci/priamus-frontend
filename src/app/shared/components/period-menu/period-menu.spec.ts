import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { Component, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubPopover } from '../../../core/testing/dom-testing';
import { Period, PeriodMenu } from './period-menu';

registerLocaleData(localeIt);

@Component({
  selector: 'app-period-menu-host',
  imports: [PeriodMenu],
  template: `
    <app-period-menu [value]="value()" [today]="today()" (valueChange)="changes.push($event)" />
  `,
})
class Host {
  readonly value = signal<Period>({ from: '2026-11-01', to: '2026-11-30' });
  readonly today = signal('2026-11-27');
  readonly changes: Period[] = [];
}

describe('PeriodMenu', () => {
  let hidden: number;

  beforeEach(() => {
    hidden = 0;
    stubPopover(() => {
      hidden++;
    });
  });

  const render = () => {
    TestBed.configureTestingModule({
      providers: [provideTestI18n(), { provide: LOCALE_ID, useValue: 'it' }],
    });
    TestBed.inject(TranslateService).use('it');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      element,
      chip: () =>
        element.querySelector('button.pt-filter__button')!.textContent!.replace(/\s+/g, ' ').trim(),
      items: () => Array.from(element.querySelectorAll<HTMLElement>('.pt-menu__item')),
      from: element.querySelector<HTMLInputElement>('input[type="date"]')!,
      to: element.querySelectorAll<HTMLInputElement>('input[type="date"]')[1],
    };
  };

  const type = (field: HTMLInputElement, value: string) => {
    field.value = value;
    field.dispatchEvent(new Event('change'));
  };

  it('offers "Oggi", "Questa settimana" and the current and previous month by name, with "Dal" and "Al"', () => {
    const view = render();

    expect(view.items().map((i) => i.textContent?.trim())).toEqual([
      'Oggi',
      'Questa settimana',
      'Novembre 2026',
      'Ottobre 2026',
    ]);
    expect(view.items().map((i) => i.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'true',
      'false',
    ]);
    expect(view.chip()).toBe('Periodo: Novembre 2026');
    expect(view.element.querySelector('[role="listbox"]')?.getAttribute('aria-label')).toBe(
      'Periodo',
    );
    expect(
      Array.from(view.element.querySelectorAll('label.pt-label')).map((l) => l.textContent?.trim()),
    ).toEqual(['Dal', 'Al']);
  });

  it('each preset emits its days and closes the menu (the week runs Monday to today)', () => {
    const view = render();

    view.items().forEach((item) => item.click());

    expect(view.fixture.componentInstance.changes).toEqual([
      { from: '2026-11-27', to: '2026-11-27' },
      { from: '2026-11-23', to: '2026-11-27' },
      { from: '2026-11-01', to: '2026-11-30' },
      { from: '2026-10-01', to: '2026-10-31' },
    ]);
    expect(hidden).toBe(4);
  });

  it('a period that is no preset shows as "dd/MM/yyyy – dd/MM/yyyy" and fills the range fields', () => {
    const view = render();

    view.fixture.componentInstance.value.set({ from: '2026-03-05', to: '2026-09-18' });
    view.fixture.detectChanges();

    expect(view.chip()).toBe('Periodo: 05/03/2026 – 18/09/2026');
    expect(view.from.value).toBe('2026-03-05');
    expect(view.to.value).toBe('2026-09-18');
  });

  it('on a Monday "Questa settimana" equals "Oggi" and all four presets still render, with no duplicated-key error', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = render();

    view.fixture.componentInstance.today.set('2026-11-23');
    view.fixture.detectChanges();

    expect(view.items().map((i) => i.textContent?.trim())).toEqual([
      'Oggi',
      'Questa settimana',
      'Novembre 2026',
      'Ottobre 2026',
    ]);
    expect(
      [...errors.mock.calls, ...warnings.mock.calls].filter((call) =>
        String(call[0]).includes('NG0955'),
      ),
    ).toEqual([]);
    errors.mockRestore();
    warnings.mockRestore();
  });

  it('with one date only nothing is emitted', () => {
    const view = render();

    type(view.from, '');
    type(view.to, '2026-12-15');

    expect(view.fixture.componentInstance.changes).toEqual([]);
    expect(view.element.querySelector('.pt-field__error')).toBeNull();
  });

  it('"Al" before "Dal" shows the message under "Al" and emits nothing', () => {
    const view = render();

    type(view.from, '2026-12-10');
    type(view.to, '2026-12-09');
    view.fixture.detectChanges();

    const error = view.element.querySelector('.pt-field__error');
    expect(error?.textContent?.trim()).toBe(
      'La data finale non può essere prima di quella iniziale.',
    );
    expect(view.to.parentElement?.contains(error)).toBe(true);
    expect(view.to.getAttribute('aria-invalid')).toBe('true');
    expect(view.fixture.componentInstance.changes).toEqual([]);
  });

  it('two valid dates are emitted, of any span, 600 ms after the last change, and the message goes away', () => {
    vi.useFakeTimers();
    const view = render();

    type(view.from, '2026-12-10');
    type(view.to, '2026-12-09');
    view.fixture.detectChanges();
    type(view.to, '2030-01-31');
    view.fixture.detectChanges();
    vi.advanceTimersByTime(599);

    expect(view.fixture.componentInstance.changes).toEqual([]);

    vi.advanceTimersByTime(1);

    expect(view.fixture.componentInstance.changes).toEqual([
      { from: '2026-12-10', to: '2030-01-31' },
    ]);
    expect(view.element.querySelector('.pt-field__error')).toBeNull();
    vi.useRealTimers();
  });

  it('a date typed digit by digit is read once, never at a day or a year still being typed', () => {
    vi.useFakeTimers();
    const view = render();

    for (const from of ['2026-11-02', '2026-11-25', '0002-11-25', '0020-11-25', '0202-11-25']) {
      type(view.from, from);
      vi.advanceTimersByTime(100);
    }
    type(view.from, '2026-11-25');
    view.fixture.detectChanges();
    vi.advanceTimersByTime(600);

    expect(view.fixture.componentInstance.changes).toEqual([
      { from: '2026-11-25', to: '2026-11-30' },
    ]);
    vi.useRealTimers();
  });

  it('a year still being typed is not a date: no message and nothing emitted', () => {
    vi.useFakeTimers();
    const view = render();

    type(view.to, '0002-11-25');
    view.fixture.detectChanges();
    vi.advanceTimersByTime(600);

    expect(view.element.querySelector('.pt-field__error')).toBeNull();
    expect(view.fixture.componentInstance.changes).toEqual([]);
    vi.useRealTimers();
  });

  it('opening the menu again drops a reversed range and shows the period applied', () => {
    const view = render();
    const menu = view.element.querySelector('.pt-menu')!;
    const open = new Event('toggle') as Event & { newState: string };
    Object.defineProperty(open, 'newState', { value: 'open' });

    type(view.from, '2026-12-10');
    type(view.to, '2026-12-09');
    view.fixture.detectChanges();
    menu.dispatchEvent(open);
    view.fixture.detectChanges();

    expect(view.from.value).toBe('2026-11-01');
    expect(view.to.value).toBe('2026-11-30');
    expect(view.element.querySelector('.pt-field__error')).toBeNull();
  });

  it('picking the already selected preset after an invalid range restores its dates and clears the message', () => {
    const view = render();

    type(view.from, '2026-12-10');
    type(view.to, '2026-12-09');
    view.fixture.detectChanges();
    view.items()[2].click();
    view.fixture.detectChanges();

    expect(view.from.value).toBe('2026-11-01');
    expect(view.to.value).toBe('2026-11-30');
    expect(view.element.querySelector('.pt-field__error')).toBeNull();
  });

  it('in January the previous-month preset is December of the year before', () => {
    const view = render();

    view.fixture.componentInstance.today.set('2027-01-10');
    view.fixture.detectChanges();
    const previous = view.items()[3];
    previous.click();

    expect(previous.textContent?.trim()).toBe('Dicembre 2026');
    expect(view.fixture.componentInstance.changes).toEqual([
      { from: '2026-12-01', to: '2026-12-31' },
    ]);
  });
});
