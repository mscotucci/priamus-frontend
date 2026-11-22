import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { Toast } from '../../../core/toast/toast';
import type { LocationListItem } from './locations-api';
import { LocationFormDialog } from './location-form-dialog';
import { LocationsFacade } from './locations-facade';

const URL = '/api/registry/locations';

const ROW: LocationListItem = {
  id: '5',
  name: 'Discarica Cerratina',
  municipality: 'Lanciano',
  address: 'Località Cerratina',
  status: 'Deactivated',
  lastModifiedAt: '2026-11-03T12:00:00Z',
  version: 3,
};

describe('LocationFormDialog', () => {
  let http: HttpTestingController;

  const render = (location: LocationListItem | null = null) => {
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
    const fixture = TestBed.createComponent(LocationFormDialog);
    fixture.componentRef.setInput('location', location);
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    TestBed.tick();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, closedCount: () => closed };
  };

  const writes = () => http.match((r) => r.url.startsWith(URL) && r.method !== 'GET');

  const type = (element: HTMLElement, selector: string, value: string) => {
    const field = element.querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const fill = (
    element: HTMLElement,
    values: { name?: string; municipality?: string; address?: string },
  ) => {
    type(element, '#location-name', values.name ?? 'Cantiere A14');
    type(element, '#location-municipality', values.municipality ?? 'Chieti');
    type(element, '#location-address', values.address ?? '');
  };

  const submit = async (fixture: ReturnType<typeof render>['fixture']) => {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(fixture);
  };

  const text = (element: HTMLElement, selector: string) =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  it('a new location shows the pin icon, the title, the line, the three fields and Annulla / Crea luogo', () => {
    const { element } = render();

    expect(text(element, '.pt-title')).toBe('Nuovo luogo');
    expect(text(element, '.pt-dialog__head .pt-muted')).toBe('Nome e comune sono obbligatori.');
    expect(Array.from(element.querySelectorAll('label')).map((l) => l.textContent?.trim())).toEqual(
      ['Nome', 'Comune', 'Indirizzo'],
    );
    expect(
      Array.from(element.querySelectorAll('.pt-dialog__actions button')).map((b) =>
        b.textContent?.trim(),
      ),
    ).toEqual(['Annulla', 'Crea luogo']);
    expect(element.querySelector('dialog')!.open).toBe(true);
    expect(element.querySelector('.pt-tile use')?.getAttribute('href')).toBe('icons.svg#pin');
  });

  it('a muted line states the rule under each field', () => {
    const { element } = render();

    expect(text(element, '#location-name-note')).toBe(
      'Come lo chiamano autisti e segreteria. Massimo 100 caratteri.',
    );
    expect(text(element, '#location-municipality-note')).toBe(
      'Distingue due luoghi con lo stesso nome. Massimo 100 caratteri.',
    );
    expect(text(element, '#location-address-note')).toBe(
      'Facoltativo, su una riga. Massimo 200 caratteri.',
    );
    expect(element.querySelectorAll('.pt-field__hint')).toHaveLength(3);
  });

  it.each([
    ['Disattivato', ROW, 'Disattivato: non selezionabile su nuove tariffe e nuovi viaggi.'],
    [
      'Attivo',
      { ...ROW, status: 'Active' as const },
      'Attivo: selezionabile su nuove tariffe e nuovi viaggi.',
    ],
  ])(
    'Modifica on a location %s opens the dialog with the status in the line, the fields prefilled and Salva modifiche',
    (_status, location, line) => {
      const { element } = render(location);

      expect(text(element, '.pt-title')).toBe('Modifica luogo');
      expect(text(element, '.pt-dialog__head .pt-muted')).toBe(line);
      expect(element.querySelector<HTMLInputElement>('#location-name')!.value).toBe(
        'Discarica Cerratina',
      );
      expect(element.querySelector<HTMLInputElement>('#location-municipality')!.value).toBe(
        'Lanciano',
      );
      expect(element.querySelector<HTMLInputElement>('#location-address')!.value).toBe(
        'Località Cerratina',
      );
      expect(text(element, '.pt-btn--primary')).toBe('Salva modifiche');
      expect(element.querySelectorAll('select, input[type="checkbox"]')).toHaveLength(0);
    },
  );

  it('a location without address opens with the address empty', () => {
    const { element } = render({ ...ROW, address: null });

    expect(element.querySelector<HTMLInputElement>('#location-address')!.value).toBe('');
  });

  it.each([
    ['an empty name', { name: '' }, 'name', 'Inserisci il nome.'],
    ['a blank name', { name: '    ' }, 'name', 'Inserisci il nome.'],
    [
      '101 characters of name',
      { name: 'a'.repeat(101) },
      'name',
      'Il nome può avere al massimo 100 caratteri.',
    ],
    ['an empty municipality', { municipality: '' }, 'municipality', 'Inserisci il comune.'],
    ['a blank municipality', { municipality: '   ' }, 'municipality', 'Inserisci il comune.'],
    [
      '101 characters of municipality',
      { municipality: 'a'.repeat(101) },
      'municipality',
      'Il comune può avere al massimo 100 caratteri.',
    ],
    [
      '201 characters of address',
      { address: 'a'.repeat(201) },
      'address',
      "L'indirizzo può avere al massimo 200 caratteri.",
    ],
  ])(
    '%s sends no request and shows the message under its field',
    async (_n, values, field, message) => {
      const { fixture, element } = render();
      fill(element, values);

      await submit(fixture);

      expect(writes()).toHaveLength(0);
      expect(text(element, `#location-${field}-note`)).toBe(message);
      expect(element.querySelector(`#location-${field}`)!.getAttribute('aria-invalid')).toBe(
        'true',
      );
      http.match(() => true);
    },
  );

  it('values at their limits are sent trimmed, and an empty address as null', async () => {
    const { fixture, element } = render();
    fill(element, {
      name: `  ${'n'.repeat(100)}  `,
      municipality: ` ${'m'.repeat(100)} `,
      address: '   ',
    });

    await submit(fixture);

    const [post] = writes();
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      name: 'n'.repeat(100),
      municipality: 'm'.repeat(100),
      address: null,
    });
    http.match(() => true);
  });

  it('an address of 200 characters is sent trimmed', async () => {
    const { fixture, element } = render();
    fill(element, { address: `  ${'a'.repeat(200)}  ` });

    await submit(fixture);

    expect(writes()[0].request.body).toEqual({
      name: 'Cantiere A14',
      municipality: 'Chieti',
      address: 'a'.repeat(200),
    });
    http.match(() => true);
  });

  it('the edit sends a PUT with the version the dialog was opened on', async () => {
    const { fixture } = render(ROW);

    await submit(fixture);

    const [put] = writes();
    expect(put.request.method).toBe('PUT');
    expect(put.request.url).toBe(`${URL}/5`);
    expect(put.request.body).toEqual({
      name: 'Discarica Cerratina',
      municipality: 'Lanciano',
      address: 'Località Cerratina',
      version: 3,
    });
    http.match(() => true);
  });

  it('while saving, fields and buttons are disabled, the primary button shows progress and the dialog cannot be closed', async () => {
    const { fixture, element, closedCount } = render();
    fill(element, {});

    await submit(fixture);
    const dialog = element.querySelector('dialog')!;

    expect(writes()).toHaveLength(1);
    expect(
      Array.from(element.querySelectorAll('input')).every((f) => (f as HTMLInputElement).disabled),
    ).toBe(true);
    expect(Array.from(element.querySelectorAll('button')).every((b) => b.disabled)).toBe(true);
    expect(text(element, '.pt-btn--primary')).toBe('Salvataggio in corso…');
    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(closedCount()).toBe(0);
    http.match(() => true);
  });

  it('Annulla and Escape close the dialog whatever was typed, and a click on the dialog does not', () => {
    const { fixture, element, closedCount } = render();
    fill(element, {});
    fixture.detectChanges();
    const dialog = element.querySelector('dialog')!;

    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(closedCount()).toBe(0);

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(closedCount()).toBe(1);

    element.querySelector<HTMLButtonElement>('.pt-dialog__actions button')!.click();
    expect(closedCount()).toBe(2);
    expect(writes()).toHaveLength(0);
    http.match(() => true);
  });

  it.each([
    ['Registry.Location.Taken', 'Il luogo Cantiere A14, Chieti è già in anagrafica.'],
    [
      'Registry.Location.TakenByDeactivated',
      'Il luogo Cantiere A14, Chieti è già in anagrafica (disattivato). Per riprenderlo, riattivalo dalla lista.',
    ],
    [
      'Registry.Location.ConcurrentUpdate',
      'Il luogo è stato modificato da un altro utente nel frattempo. Controlla i dati aggiornati e riprova.',
    ],
  ])(
    'a 409 %s shows the backend detail in a danger notice above the fields and keeps the values',
    async (errorCode, detail) => {
      const { fixture, element, closedCount } = render();
      fill(element, { address: 'Via Roma 1' });
      await submit(fixture);

      http
        .match((r) => r.method === 'POST')[0]
        .flush({ errorCode, detail }, { status: 409, statusText: 'Conflict' });
      await settle(fixture);

      const notice = element.querySelector('.pt-notice--danger')!;
      expect(notice.textContent?.trim()).toBe(detail);
      expect(notice.compareDocumentPosition(element.querySelector('.pt-field')!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(element.querySelector<HTMLInputElement>('#location-name')!.value).toBe('Cantiere A14');
      expect(element.querySelector<HTMLInputElement>('#location-municipality')!.value).toBe(
        'Chieti',
      );
      expect(element.querySelector<HTMLInputElement>('#location-address')!.value).toBe(
        'Via Roma 1',
      );
      expect(element.querySelector<HTMLInputElement>('#location-name')!.disabled).toBe(false);
      expect(closedCount()).toBe(0);
      http.match(() => true);
    },
  );

  it('a failure without a usable body shows the generic message above the fields and puts the focus on Nome', async () => {
    const { fixture, element } = render();
    document.body.appendChild(element);
    fill(element, {});
    await submit(fixture);

    http.match((r) => r.method === 'POST')[0].flush(null, { status: 500, statusText: 'Error' });
    await settle(fixture);

    expect(text(element, '.pt-notice--danger')).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
    expect(document.activeElement).toBe(element.querySelector('#location-name'));
    element.remove();
    http.match(() => true);
  });

  it('a backend 400 on a field shows under that field, ignoring case, with no notice above', async () => {
    const { fixture, element } = render();
    fill(element, {});
    await submit(fixture);

    http
      .match((r) => r.method === 'POST')[0]
      .flush(
        {
          errors: {
            Name: ['Nome errato.', 'Troppo lungo.'],
            MUNICIPALITY: ['Comune errato.'],
            Address: ['Indirizzo errato.'],
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle(fixture);

    expect(text(element, '#location-name-note')).toBe('Nome errato. Troppo lungo.');
    expect(text(element, '#location-municipality-note')).toBe('Comune errato.');
    expect(text(element, '#location-address-note')).toBe('Indirizzo errato.');
    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    http.match(() => true);
  });

  it('an invalid resubmit after a refusal removes the old notice', async () => {
    const { fixture, element } = render();
    fill(element, {});
    await submit(fixture);
    http.match((r) => r.method === 'POST')[0].flush(null, { status: 500, statusText: 'Error' });
    await settle(fixture);
    expect(element.querySelector('.pt-notice--danger')).not.toBeNull();

    type(element, '#location-name', '');
    await submit(fixture);

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(writes()).toHaveLength(0);
    http.match(() => true);
  });

  it('on success the dialog closes, the toast names the location as "<name>, <municipality>" and the list is asked again', async () => {
    const { fixture, element, closedCount } = render();
    http.expectOne((r) => r.url === URL && r.method === 'GET').flush({ data: [], totalCount: 0 });
    await settle(fixture);
    fill(element, {});
    await submit(fixture);

    http
      .match((r) => r.method === 'POST')[0]
      .flush(
        {
          id: '9',
          name: 'Cantiere A14',
          municipality: 'Chieti',
          address: null,
          status: 'Active',
          lastModifiedAt: '2026-11-16T08:00:00Z',
          version: 1,
        },
        { status: 201, statusText: 'Created' },
      );
    await settle(fixture);

    expect(closedCount()).toBe(1);
    expect(TestBed.inject(Toast).current()).toBe('Luogo Cantiere A14, Chieti creato');
    http.expectOne((r) => r.url === URL && r.method === 'GET');
  });

  it('a successful edit toasts "modificato" with the label', async () => {
    const { fixture, closedCount } = render(ROW);
    await submit(fixture);

    http.match((r) => r.method === 'PUT')[0].flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);

    expect(closedCount()).toBe(1);
    expect(TestBed.inject(Toast).current()).toBe('Luogo Discarica Cerratina, Lanciano modificato');
    http.match(() => true);
  });

  it('a 409 on edit shows the message in the dialog, which stays open, and the list reloads at once', async () => {
    const { fixture, element, closedCount } = render(ROW);
    http
      .expectOne((r) => r.url === URL && r.method === 'GET')
      .flush({
        data: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    await settle(fixture);
    await submit(fixture);

    writes()[0].flush(
      {
        errorCode: 'Registry.Location.ConcurrentUpdate',
        detail: 'Il luogo è stato modificato da un altro utente nel frattempo.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await settle(fixture);

    expect(text(element, '.pt-notice--danger')).toBe(
      'Il luogo è stato modificato da un altro utente nel frattempo.',
    );
    expect(closedCount()).toBe(0);
    http.expectOne((r) => r.url === URL && r.method === 'GET');
  });
});
