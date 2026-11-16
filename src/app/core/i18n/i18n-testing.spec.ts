import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from './i18n-testing';

@Component({
  selector: 'app-test-host',
  imports: [TranslatePipe],
  template: `<p>{{ 'errors.generic' | translate }}</p>`,
})
class TestHost {}

describe('provideTestI18n', () => {
  it('renders the Italian text of it.json through the translate pipe', () => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    TestBed.inject(TranslateService).use('it');

    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p').textContent).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
  });
});
