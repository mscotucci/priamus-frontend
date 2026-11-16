import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Session, SessionStatus } from '../auth/session';
import { provideTestI18n } from '../i18n/i18n-testing';
import { Startup } from './startup';

function render(retryEndsIn: SessionStatus) {
  const status = signal<SessionStatus>('unreachable');
  // as the real session: the status is `starting` for a while, so the button leaves the page
  const retry = vi.fn(async () => {
    status.set('starting');
    await new Promise((resolve) => setTimeout(resolve));
    status.set(retryEndsIn);
  });
  TestBed.configureTestingModule({
    providers: [provideTestI18n(), { provide: Session, useValue: { status, retry } }],
  });
  TestBed.inject(TranslateService).use('it');
  const fixture = TestBed.createComponent(Startup);
  fixture.autoDetectChanges();
  document.body.appendChild(fixture.nativeElement);
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, retry };
}

const retryButton = (element: HTMLElement) =>
  Array.from(element.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Riprova');

describe('Startup', () => {
  afterEach(() => document.body.replaceChildren());

  it('shows the generic error with "Riprova" while the backend cannot be reached', () => {
    const { element } = render('unreachable');

    expect(element.querySelector('.pt-notice--danger')?.textContent).toContain(
      'Si è verificato un errore. Riprova tra poco.',
    );
    expect(retryButton(element)).toBeDefined();
  });

  it('a "Riprova" that fails again puts the focus back on "Riprova"', async () => {
    const { fixture, element, retry } = render('unreachable');
    retryButton(element)!.focus();

    retryButton(element)!.click();
    await new Promise((resolve) => setTimeout(resolve, 10));
    await fixture.whenStable();

    expect(retry).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(retryButton(element));
  });
});
