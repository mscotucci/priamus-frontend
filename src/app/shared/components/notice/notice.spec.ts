import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { NoticeContent } from '../../../core/api/api-error';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Notice } from './notice';

@Component({
  selector: 'app-test-host',
  imports: [Notice],
  template: `<app-notice [notice]="notice()"><button type="button">Riprova</button></app-notice>`,
})
class TestHost {
  readonly notice = signal<NoticeContent>({ key: 'errors.generic' });
}

describe('Notice', () => {
  const render = () => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    TestBed.inject(TranslateService).use('it');
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    return fixture;
  };

  it('is a danger notice announced as an alert', () => {
    const element = render().nativeElement.querySelector('app-notice') as HTMLElement;

    expect(element.classList.contains('pt-notice')).toBe(true);
    expect(element.classList.contains('pt-notice--danger')).toBe(true);
    expect(element.getAttribute('role')).toBe('alert');
  });

  it('translates a key', () => {
    const element = render().nativeElement.querySelector('app-notice') as HTMLElement;

    expect(element.textContent).toContain('Si è verificato un errore. Riprova tra poco.');
  });

  it('shows a detail as it is, without translating it', () => {
    const fixture = render();
    fixture.componentInstance.notice.set({ detail: 'Nome utente già in uso.' });
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('app-notice') as HTMLElement;

    expect(element.textContent).toContain('Nome utente già in uso.');
    expect(element.textContent).not.toContain('Si è verificato un errore');
  });

  it('projects its content after the text', () => {
    const element = render().nativeElement.querySelector('app-notice') as HTMLElement;

    expect(element.querySelector('button')?.textContent).toBe('Riprova');
  });
});
