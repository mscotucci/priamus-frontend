import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Session } from '../../../core/auth/session';
import { Layout } from '../../../core/layout/layout';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { routes } from '../../../app.routes';
import { Home } from './home';

describe('Home', () => {
  it('is titled "Benvenuto" and carries the one message "Nessuna sezione disponibile per ora"', () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        { provide: Layout, useValue: { openDrawer: () => undefined } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toBe('Benvenuto');
    expect(element.querySelector('.pt-eyebrow')?.textContent).toBe('Priamus');
    const main = element.querySelector('main')!;
    expect(main.textContent?.trim()).toBe('Nessuna sezione disponibile per ora');
    expect(main.querySelectorAll('p')).toHaveLength(1);
  });

  it('/home opened with nobody signed in leads to the login', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: Session, useValue: { wait: () => Promise.resolve(), user: signal(null) } },
      ],
    });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/home');

    expect(router.url).toBe('/login?returnUrl=%2Fhome');
  });
});
