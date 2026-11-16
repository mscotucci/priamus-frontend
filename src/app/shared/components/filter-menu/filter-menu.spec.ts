import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubPopover } from '../../../core/testing/dom-testing';
import { FilterMenu, FilterOption } from './filter-menu';

type Colour = 'red' | 'blue';

@Component({
  selector: 'app-filter-menu-host',
  imports: [FilterMenu],
  template: `
    <app-filter-menu
      labelKey="users.list.filter.role"
      [options]="options"
      [value]="value()"
      (valueChange)="picked.push($event)"
    />
  `,
})
class Host {
  readonly options: FilterOption<Colour>[] = [
    { value: 'red', labelKey: 'role.admin' },
    { value: 'blue', labelKey: 'role.driver' },
  ];
  readonly value = signal<Colour | null>(null);
  readonly picked: (Colour | null)[] = [];
}

describe('FilterMenu', () => {
  let hidden: number;

  beforeEach(() => {
    hidden = 0;
    stubPopover(() => {
      hidden++;
    });
  });

  const render = () => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    TestBed.inject(TranslateService).use('it');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  it('shows the label and "Tutti" on the chip while no value is picked, and wires the chip to a native popover menu', () => {
    const element = render().nativeElement as HTMLElement;
    const chip = element.querySelector('button.pt-filter__button')!;
    const menu = element.querySelector('.pt-menu')!;

    expect(chip.textContent?.replace(/\s+/g, ' ').trim()).toBe('Ruolo: tutti');
    expect(menu.hasAttribute('popover')).toBe(true);
    expect(chip.getAttribute('popovertarget')).toBe(menu.id);
    expect(
      Array.from(menu.querySelectorAll('.pt-menu__item')).map((i) => i.textContent?.trim()),
    ).toEqual(['Tutti', 'Amministratore', 'Autista']);
  });

  it('shows the picked option on the chip and marks it selected in the menu', () => {
    const fixture = render();
    fixture.componentInstance.value.set('blue');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const selected = Array.from(element.querySelectorAll('.pt-menu__item')).map((i) =>
      i.getAttribute('aria-selected'),
    );

    expect(
      element.querySelector('.pt-filter__button')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('Ruolo: Autista');
    expect(selected).toEqual(['false', 'false', 'true']);
  });

  it('picking an option closes the menu and emits its value; picking "Tutti" emits null', () => {
    const fixture = render();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      '.pt-menu__item',
    );

    items[1].click();
    items[0].click();

    expect(fixture.componentInstance.picked).toEqual(['red', null]);
    expect(hidden).toBe(2);
  });
});
