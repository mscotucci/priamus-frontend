import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { ContractRateRows, type RateRow } from './contract-rate-rows';

const ROWS: RateRow[] = [
  {
    key: 'a',
    parts: [{ label: 'Cantiere A14, Chieti Scalo', pill: null }],
    summary: '30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 € · minimo 60,00 €',
  },
  {
    key: 'b',
    parts: [
      { label: 'Magazzino centrale, Pescara', pill: null },
      {
        label: 'Cantiere SP49, Spoltore',
        pill: { key: 'contracts.form.locationRates.deactivated', tone: 'danger' },
      },
    ],
    summary: '32,00 €/h',
  },
  {
    key: 'c',
    parts: [{ label: 'Discarica Cerratina, Lanciano', pill: null }],
    summary: '38,00 €/h',
  },
];

@Component({
  imports: [ContractRateRows],
  template: `
    <app-contract-rate-rows
      [rows]="rows()"
      (edit)="edited.push($event)"
      (removed)="remove($event)"
      (focusAdd)="addFocused = addFocused + 1"
    />
  `,
})
class Host {
  readonly rows = signal<RateRow[]>(ROWS);
  readonly edited: string[] = [];
  addFocused = 0;

  remove(key: string): void {
    this.rows.update((rows) => rows.filter((row) => row.key !== key));
  }
}

describe('ContractRateRows', () => {
  const render = () => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    TestBed.inject(TranslateService).use('it');
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const items = () => Array.from(element.querySelectorAll('li'));
    const text = (node: Element | null | undefined) =>
      node?.textContent?.replace(/\s+/g, ' ').trim();
    const buttons = (label: string) =>
      Array.from(element.querySelectorAll<HTMLButtonElement>('button')).filter(
        (b) => text(b) === label,
      );
    return { fixture, element, host: fixture.componentInstance, items, text, buttons };
  };

  afterEach(() => document.body.replaceChildren());

  it('each row is a card with its title, its summary, "Modifica" and "Togli"', () => {
    const { items, text, buttons } = render();

    expect(items().length).toBe(3);
    expect(items().every((item) => item.classList.contains('pt-card'))).toBe(true);
    expect(text(items()[0].querySelector('strong'))).toBe('Cantiere A14, Chieti Scalo');
    expect(text(items()[0].querySelector('.pt-muted'))).toBe(
      '30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 € · minimo 60,00 €',
    );
    expect(buttons('Modifica').length).toBe(3);
    expect(buttons('Togli').length).toBe(3);
  });

  it('the buttons are described by the title of their row', () => {
    const { items, buttons } = render();

    for (const [index, item] of items().entries()) {
      const title = item.querySelector('strong')!;
      expect(title.id).not.toBe('');
      expect(buttons('Modifica')[index].getAttribute('aria-describedby')).toBe(title.id);
      expect(buttons('Togli')[index].getAttribute('aria-describedby')).toBe(title.id);
    }
  });

  it('a part with a pill shows it beside its own label only, and the parts are joined by an arrow', () => {
    const { items, text } = render();

    const title = items()[1].querySelector('strong')!;
    expect(text(title)).toBe('Magazzino centrale, Pescara → Cantiere SP49, Spoltore Disattivato');
    expect(title.querySelectorAll('.pt-pill').length).toBe(1);
    expect(title.querySelector('.pt-pill')!.classList.contains('pt-pill--danger')).toBe(true);
    expect(items()[0].querySelector('.pt-pill')).toBeNull();
  });

  it('a part with a monospace text shows it before its label, and the other parts show none', () => {
    const { host, fixture, items, text } = render();
    host.rows.set([
      {
        key: 'v',
        parts: [{ mono: 'AB123CD', label: 'Autospurgo Scania P410', pill: null }],
        summary: '55,00 €/h',
      },
      ...ROWS,
    ]);
    fixture.detectChanges();

    expect(items()[0].querySelector('strong .pt-mono')?.textContent).toBe('AB123CD');
    expect(text(items()[0].querySelector('strong'))).toBe('AB123CD Autospurgo Scania P410');
    expect(items()[1].querySelector('.pt-mono')).toBeNull();
  });

  it('"Modifica" and "Togli" emit the key of their row', () => {
    const { host, buttons, fixture } = render();

    buttons('Modifica')[2].click();
    expect(host.edited).toEqual(['c']);

    buttons('Togli')[0].click();
    fixture.detectChanges();
    expect(host.rows().map((row) => row.key)).toEqual(['b', 'c']);
  });

  it('after a removal the focus moves to the "Togli" of the row that took its place', async () => {
    const { fixture, buttons, host } = render();

    buttons('Togli')[1].click();
    await settle(fixture);

    expect(host.rows().map((row) => row.key)).toEqual(['a', 'c']);
    expect(document.activeElement).toBe(buttons('Togli')[1]);
    expect(host.addFocused).toBe(0);
  });

  it('removing the last row asks the caller to focus its add button', async () => {
    const { fixture, buttons, host } = render();

    buttons('Togli')[2].click();
    await settle(fixture);

    expect(host.addFocused).toBe(1);
  });
});
