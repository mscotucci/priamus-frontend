import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { TripQuestion, TripQuestionState } from './trip-question';

@Component({
  imports: [TripQuestion],
  template: `
    <app-trip-question
      [number]="3"
      name="Quando"
      title="Quando?"
      [state]="state()"
      (modify)="modified = modified + 1"
    >
      <p class="choices">cards</p>
      <p answer class="line">Oggi, lunedì 23 novembre</p>
    </app-trip-question>
  `,
})
class Host {
  readonly state = signal<TripQuestionState>('open');
  modified = 0;
}

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();

describe('TripQuestion', () => {
  const render = (state: TripQuestionState) => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    TestBed.inject(TranslateService).use('it');
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.state.set(state);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  it('open it is the step in the primary frame, with its number, its title and the choices', () => {
    const { element } = render('open');

    const section = element.querySelector('section')!;

    expect(section.getAttribute('aria-current')).toBe('step');
    expect(section.classList).not.toContain('pt-question--answered');
    expect(text(element.querySelector('.pt-question__number'))).toBe('3');
    expect(text(element.querySelector('.pt-question__title'))).toBe('Quando?');
    expect(element.querySelector('.choices')).not.toBeNull();
    expect(element.querySelector('.line')).toBeNull();
    expect(element.querySelector('.pt-link')).toBeNull();
  });

  it('answered it is a check, the name, the answer lines and "Modifica", and "Modifica" asks to modify', () => {
    const { fixture, element } = render('answered');

    const section = element.querySelector('section')!;
    element.querySelector<HTMLButtonElement>('.pt-link')!.click();

    expect(section.getAttribute('aria-current')).toBeNull();
    expect(section.classList).toContain('pt-question--answered');
    expect(element.querySelector('.pt-question__number svg')).not.toBeNull();
    expect(text(element.querySelector('.pt-question__title'))).toBe('Quando');
    expect(text(element.querySelector('.line'))).toBe('Oggi, lunedì 23 novembre');
    expect(text(element.querySelector('.pt-link'))).toBe('Modifica');
    expect(element.querySelector('.choices')).toBeNull();
    expect(fixture.componentInstance.modified).toBe(1);
  });

  it('upcoming it shows its number and its name only', () => {
    const { element } = render('upcoming');

    const section = element.querySelector('section')!;

    expect(section.getAttribute('aria-current')).toBeNull();
    expect(text(element.querySelector('.pt-question__number'))).toBe('3');
    expect(text(element.querySelector('.pt-question__title'))).toBe('Quando');
    expect(text(section)).toBe('3 Quando');
  });
});
