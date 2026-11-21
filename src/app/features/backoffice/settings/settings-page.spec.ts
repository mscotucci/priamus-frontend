import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { routes } from '../../../app.routes';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { Layout } from '../../../core/layout/layout';
import { userWithRole } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { Toast } from '../../../core/toast/toast';
import type { NightBand } from './settings-api';
import { SettingsFacade } from './settings-facade';
import { SettingsPage } from './settings-page';

const URL = '/api/registry/night-band';
const saved: NightBand = { start: '22:00', end: '06:00', version: 3 };

describe('SettingsPage', () => {
  let http: HttpTestingController;

  const render = async (band: NightBand = saved) => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        SettingsFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Layout, useValue: { openDrawer: () => undefined } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne((r) => r.url === URL).flush(band);
    await settle(fixture);
    const element = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      element,
      start: () => element.querySelector<HTMLInputElement>('#band-start')!,
      end: () => element.querySelector<HTMLInputElement>('#band-end')!,
      type(input: HTMLInputElement, value: string) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      },
      async save() {
        element.querySelector<HTMLButtonElement>('button.pt-btn--primary')!.click();
        await settle(fixture);
      },
    };
  };

  it('shows the card "Fascia notturna" with "Dalle" and "Alle" to the minute, the saved band and "Salva"', async () => {
    const { element, start, end } = await render();

    expect(element.querySelector('.pt-breadcrumb')?.textContent?.trim()).toBe('Sistema');
    expect(element.querySelector('h1')?.textContent).toBe('Impostazioni');
    expect(element.querySelector('h3')?.textContent).toBe('Fascia notturna');
    expect(element.querySelector('label[for="band-start"]')?.textContent).toBe('Dalle');
    expect(element.querySelector('label[for="band-end"]')?.textContent).toBe('Alle');
    expect(start().type).toBe('time');
    expect(end().type).toBe('time');
    expect(start().value).toBe('22:00');
    expect(end().value).toBe('06:00');
    expect(element.querySelector('.pt-field__hint')?.textContent).toBe(
      'Esclusa: un viaggio che inizia alle 06:00 è di giorno.',
    );
    expect(element.querySelector('button.pt-btn--primary')?.textContent?.trim()).toBe('Salva');
  });

  it('the hint under "Alle" names the end written in the field, and is not shown while the field is incomplete', async () => {
    const page = await render();

    page.type(page.end(), '05:00');
    await settle(page.fixture);
    expect(page.element.querySelector('#band-end-hint')?.textContent).toBe(
      'Esclusa: un viaggio che inizia alle 05:00 è di giorno.',
    );
    expect(page.end().getAttribute('aria-describedby')).toBe('band-end-hint');

    page.type(page.end(), '');
    await settle(page.fixture);
    expect(page.element.querySelector('#band-end-hint')).toBeNull();
    expect(page.end().hasAttribute('aria-describedby')).toBe(false);
  });

  it('a save sends the band with the version it was read at and shows the toast "Fascia notturna salvata."', async () => {
    const page = await render();
    page.type(page.start(), '21:30');
    page.type(page.end(), '05:45');

    await page.save();
    const put = http.expectOne((r) => r.url === URL && r.method === 'PUT');
    expect(put.request.body).toEqual({ start: '21:30', end: '05:45', version: 3 });
    put.flush(null, { status: 204, statusText: 'No Content' });
    await settle(page.fixture);

    expect(TestBed.inject(Toast).current()).toBe('Fascia notturna salvata.');
    http
      .expectOne((r) => r.url === URL && r.method === 'GET')
      .flush({ start: '21:30', end: '05:45', version: 4 });
    await settle(page.fixture);
    expect(page.start().value).toBe('21:30');
  });

  it('saving the values already saved writes nothing and still shows the toast', async () => {
    const page = await render();

    await page.save();

    http.expectNone((r) => r.method === 'PUT');
    expect(TestBed.inject(Toast).current()).toBe('Fascia notturna salvata.');
  });

  it('a band whose start equals its end is refused under "Alle" and nothing is sent', async () => {
    const page = await render();
    page.type(page.end(), '22:00');

    await page.save();

    http.expectNone((r) => r.method === 'PUT');
    expect(page.element.querySelector('#band-end-error')?.textContent).toBe(
      "La fine deve essere diversa dall'inizio.",
    );
    expect(page.end().getAttribute('aria-invalid')).toBe('true');
    expect(TestBed.inject(Toast).current()).toBeNull();
  });

  it('the server answer for the same refusal is shown under "Alle"', async () => {
    const page = await render();
    page.type(page.end(), '07:00');

    await page.save();
    http
      .expectOne((r) => r.method === 'PUT')
      .flush(
        { errors: { End: ["La fine deve essere diversa dall'inizio."] } },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle(page.fixture);

    expect(page.element.querySelector('#band-end-error')?.textContent).toBe(
      "La fine deve essere diversa dall'inizio.",
    );
    expect(page.element.querySelector('#band-start-error')).toBeNull();
    expect(TestBed.inject(Toast).current()).toBeNull();
  });

  it('a stale version shows the notice and reloads the saved values into the fields', async () => {
    const page = await render();
    page.type(page.start(), '20:00');

    await page.save();
    http
      .expectOne((r) => r.method === 'PUT')
      .flush(
        { errorCode: 'Registry.NightBand.ConcurrentUpdate', detail: 'Modificata.' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(page.fixture);
    http
      .expectOne((r) => r.url === URL && r.method === 'GET')
      .flush({ start: '23:00', end: '05:00', version: 4 });
    await settle(page.fixture);

    expect(page.element.querySelector('.pt-notice')?.textContent?.trim()).toBe(
      'Un altro amministratore ha cambiato la fascia notturna nel frattempo. Ecco la fascia salvata ora: ricontrolla e salva di nuovo.',
    );
    expect(page.start().value).toBe('23:00');
    expect(page.end().value).toBe('05:00');
    expect(TestBed.inject(Toast).current()).toBeNull();
  });

  it('a failed first read shows the generic notice with "Riprova"', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        SettingsFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Layout, useValue: { openDrawer: () => undefined } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    const failing = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    TestBed.tick();
    failing
      .expectOne((r) => r.url === URL)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.pt-notice')?.textContent).toContain(
      'Si è verificato un errore. Riprova tra poco.',
    );
    expect(element.querySelector('.pt-notice button')?.textContent?.trim()).toBe('Riprova');
  });
});

describe('the route "settings"', () => {
  const open = async (role: 'Admin' | 'BackOffice') => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestI18n(),
        {
          provide: Session,
          useValue: {
            wait: () => Promise.resolve(),
            user: signal(userWithRole(role)).asReadonly(),
          },
        },
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/settings');
    return router;
  };

  it('is refused to the back office, which lands on /customers', async () => {
    const router = await open('BackOffice');

    expect(router.url).toBe('/customers');
  });

  it('is open to an administrator', async () => {
    const router = await open('Admin');

    expect(router.url).toBe('/settings');
  });
});
