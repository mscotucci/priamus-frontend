import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { Toast } from '../../../core/toast/toast';
import { press, settle } from '../../../core/testing/interaction-testing';
import type { LocationListItem, LocationListPage } from './locations-api';
import { LocationDeactivateDialog } from './location-deactivate-dialog';
import { LocationsFacade } from './locations-facade';

const URL = '/api/registry/locations';

const LOCATION: LocationListItem = {
  id: '2',
  name: 'Cantiere A14',
  municipality: 'Chieti Scalo',
  address: null,
  status: 'Active',
  lastModifiedAt: '2026-05-14T12:00:00Z',
  version: 5,
};

const EMPTY: LocationListPage = {
  data: [],
  totalCount: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

describe('LocationDeactivateDialog', () => {
  let http: HttpTestingController;

  const render = () => {
    stubModalDialog();
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        LocationsFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(LocationsFacade).loadList();
    const fixture = TestBed.createComponent(LocationDeactivateDialog);
    fixture.componentRef.setInput('location', LOCATION);
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne((r) => r.url === URL && r.method === 'GET').flush(EMPTY);
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, closedCount: () => closed };
  };

  afterEach(() => {
    document.body.replaceChildren();
  });

  const posts = () => http.match((r) => r.url === `${URL}/2/deactivate` && r.method === 'POST');
  const reloads = () => http.match((r) => r.url === URL && r.method === 'GET');

  const text = (element: HTMLElement, selector: string) =>
    element.querySelector(selector)?.textContent?.trim();

  it('the title names the location as name and municipality, the text is in the body, and the buttons are Annulla and a danger Disattiva', () => {
    const { element } = render();

    expect(text(element, '.pt-title')).toBe('Disattivare il luogo Cantiere A14, Chieti Scalo?');
    expect(element.querySelector('dialog')!.textContent).toContain(
      'Non sarà più selezionabile su nuove tariffe e nuovi viaggi. Potrai riattivarlo in qualsiasi momento.',
    );
    const buttons = Array.from(element.querySelectorAll('.pt-dialog__actions button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Annulla', 'Disattiva']);
    expect(buttons[1].classList.contains('pt-btn--danger')).toBe(true);
    expect(element.querySelector('.pt-tile--danger')).not.toBeNull();
    expect(element.querySelector('.pt-tile--danger use')?.getAttribute('href')).toContain('alert');
    expect(element.querySelector('dialog')!.open).toBe(true);
  });

  it('the focus is on Annulla when the dialog opens', () => {
    const { element } = render();

    expect(document.activeElement).toBe(element.querySelector('.pt-dialog__actions button'));
    expect(document.activeElement?.textContent?.trim()).toBe('Annulla');
  });

  it('Annulla closes the dialog without sending anything', () => {
    const { fixture, closedCount } = render();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.pt-dialog__actions button')!
      .click();

    expect(closedCount()).toBe(1);
    expect(posts()).toHaveLength(0);
  });

  it('Disattiva sends the version of the row, both buttons are disabled, the primary shows progress and the dialog cannot be closed', async () => {
    const { fixture, element, closedCount } = render();

    await press(fixture, 1);
    const dialog = element.querySelector('dialog')!;

    const sent = posts();
    expect(sent).toHaveLength(1);
    expect(sent[0].request.body).toEqual({ version: 5 });
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.every((b) => b.disabled)).toBe(true);
    expect(text(element, '.pt-btn--danger')).toBe('Disattivazione…');
    expect(dialog.getAttribute('aria-busy')).toBe('true');

    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(closedCount()).toBe(0);
    http.match(() => true);
  });

  it('on success the dialog closes, the toast names the location and the list is asked again', async () => {
    const { fixture, closedCount } = render();
    await press(fixture, 1);

    posts()[0].flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);

    expect(closedCount()).toBe(1);
    expect(TestBed.inject(Toast).current()).toBe('Luogo Cantiere A14, Chieti Scalo disattivato');
    expect(reloads()).toHaveLength(1);
    http.match(() => true);
  });

  it('a refusal shows the backend detail in a danger notice inside the dialog, which stays open', async () => {
    const { fixture, element, closedCount } = render();
    await press(fixture, 1);

    posts()[0].flush(
      { errorCode: 'Registry.Location.NotFound', detail: 'Luogo non trovato.' },
      { status: 404, statusText: 'Not Found' },
    );
    await settle(fixture);

    expect(text(element, 'dialog .pt-notice--danger')).toBe('Luogo non trovato.');
    expect(closedCount()).toBe(0);
    expect(
      Array.from(element.querySelectorAll<HTMLButtonElement>('button')).some((b) => b.disabled),
    ).toBe(false);
    expect(TestBed.inject(Toast).current()).toBeNull();
    expect(reloads()).toHaveLength(0);
    http.match(() => true);
  });

  it('a 409 shows the message inside the dialog, which stays open, and the list reloads at once', async () => {
    const { fixture, element, closedCount } = render();
    await press(fixture, 1);

    posts()[0].flush(
      {
        errorCode: 'Registry.Location.ConcurrentUpdate',
        detail: 'Il luogo è stato modificato da un altro utente nel frattempo.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await settle(fixture);

    expect(text(element, 'dialog .pt-notice--danger')).toBe(
      'Il luogo è stato modificato da un altro utente nel frattempo.',
    );
    expect(closedCount()).toBe(0);
    expect(reloads()).toHaveLength(1);
    http.match(() => true);
  });

  it('after a refusal the focus is back on Annulla, not lost with the disabled button', async () => {
    const { fixture, element } = render();
    element.querySelectorAll<HTMLButtonElement>('.pt-dialog__actions button')[1].focus();
    await press(fixture, 1);

    posts()[0].flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);

    expect(document.activeElement?.textContent?.trim()).toBe('Annulla');
    http.match(() => true);
  });

  it('a failure without a detail shows the generic message', async () => {
    const { fixture, element } = render();
    await press(fixture, 1);

    posts()[0].flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);

    expect(text(element, 'dialog .pt-notice--danger')).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
    http.match(() => true);
  });

  it('the notice of a previous attempt is cleared when the next one starts', async () => {
    const { fixture, element } = render();
    await press(fixture, 1);
    posts()[0].flush(null, { status: 500, statusText: 'Server Error' });
    await settle(fixture);
    expect(element.querySelector('.pt-notice--danger')).not.toBeNull();

    await press(fixture, 1);

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(posts()).toHaveLength(1);
    http.match(() => true);
  });
});
