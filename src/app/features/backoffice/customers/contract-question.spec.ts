import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { ContractQuestion } from './contract-question';

@Component({
  imports: [ContractQuestion],
  template: `
    <app-contract-question
      [number]="3"
      title="Quali luoghi?"
      [hint]="hint()"
      [open]="open()"
      [current]="current()"
      [answer]="answer()"
      (modify)="modified = modified + 1"
    >
      <p class="projected">Scelte</p>
    </app-contract-question>
  `,
})
class Host {
  readonly hint = signal<string | undefined>('Un suggerimento');
  readonly open = signal(true);
  readonly current = signal(true);
  readonly answer = signal<string | null>('Entrambi i luoghi');
  modified = 0;
}

describe('ContractQuestion', () => {
  const render = () => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    TestBed.inject(TranslateService).use('it');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, section: () => element.querySelector('section.pt-question')! };
  };

  const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim();

  it('an open question shows its number, title, hint and the projected choices, and no answer', () => {
    const { element, section } = render();

    expect(text(section().querySelector('.pt-question__number'))).toBe('3');
    expect(text(section().querySelector('h3'))).toBe('Quali luoghi?');
    expect(text(section().querySelector('.pt-muted'))).toBe('Un suggerimento');
    expect(element.querySelector('.projected')).not.toBeNull();
    expect(section().querySelector('.pt-pill')).toBeNull();
    expect(section().getAttribute('aria-current')).toBe('step');
    expect(section().classList.contains('pt-question--answered')).toBe(false);
  });

  it('a closed question shows its title, hint and the answer pill with a check and "Modifica", not the choices', () => {
    const { fixture, element, section } = render();
    fixture.componentInstance.open.set(false);
    fixture.componentInstance.current.set(false);
    fixture.detectChanges();

    expect(section().classList.contains('pt-question--answered')).toBe(true);
    expect(section().getAttribute('aria-current')).toBeNull();
    expect(text(section().querySelector('h3'))).toBe('Quali luoghi?');
    expect(text(section().querySelector('.pt-muted'))).toBe('Un suggerimento');
    const pill = section().querySelector('.pt-pill--success')!;
    expect(text(pill)).toBe('Entrambi i luoghi');
    expect(pill.querySelector('app-icon')).not.toBeNull();
    expect(text(section().querySelector('button'))).toBe('Modifica');
    expect(element.querySelector('.projected')).toBeNull();
  });

  it('"Modifica" emits modify', () => {
    const { fixture, section } = render();
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();

    section().querySelector('button')!.click();

    expect(fixture.componentInstance.modified).toBe(1);
  });

  it('a question without a hint renders no hint line', () => {
    const { fixture, section } = render();
    fixture.componentInstance.hint.set(undefined);
    fixture.detectChanges();

    expect(section().querySelector('.pt-muted')).toBeNull();
  });
});
