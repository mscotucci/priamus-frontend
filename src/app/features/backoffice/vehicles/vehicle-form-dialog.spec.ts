import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { Toast } from '../../../core/toast/toast';
import { settle } from '../../../core/testing/interaction-testing';
import type { VehicleListItem } from './vehicles-api';
import { VehicleFormDialog } from './vehicle-form-dialog';
import { VehiclesFacade } from './vehicles-facade';

const URL = '/api/registry/vehicles';

const ROW: VehicleListItem = {
  id: '5',
  licensePlate: 'CZ334KL',
  description: 'Iveco Eurocargo cassonato',
  type: 'Tractor',
  requiresTrailer: false,
  status: 'Decommissioned',
  lastModifiedAt: '2026-11-03T12:00:00Z',
  version: 3,
};

describe('VehicleFormDialog', () => {
  let http: HttpTestingController;

  const render = (vehicle: VehicleListItem | null = null) => {
    stubModalDialog();
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        VehiclesFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(VehicleFormDialog);
    fixture.componentRef.setInput('vehicle', vehicle);
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    TestBed.tick();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, closedCount: () => closed };
  };

  const writes = () => http.match((r) => r.url.startsWith(URL) && r.method !== 'GET');

  const type = (element: HTMLElement, selector: string, value: string) => {
    const field = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const fill = (
    element: HTMLElement,
    values: { plate?: string; description?: string; kind?: string },
  ) => {
    type(element, '#vehicle-plate', values.plate ?? 'ab 456-cd');
    type(element, '#vehicle-description', values.description ?? 'Iveco Stralis 480');
    type(element, '#vehicle-type', values.kind ?? 'StandaloneVehicle');
  };

  const submit = async (fixture: ReturnType<typeof render>['fixture']) => {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(fixture);
  };

  const text = (element: HTMLElement, selector: string) =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  const tick = (
    fixture: ReturnType<typeof render>['fixture'],
    element: HTMLElement,
    on: boolean,
  ) => {
    const box = element.querySelector<HTMLInputElement>('#vehicle-requires-trailer')!;
    if (box.checked !== on) {
      box.click();
    }
    fixture.detectChanges();
  };

  it('a new vehicle shows the title, the line, the three fields and Annulla / Crea mezzo', () => {
    const { element } = render();

    expect(text(element, '.pt-title')).toBe('Nuovo mezzo');
    expect(text(element, '.pt-dialog__head .pt-muted')).toBe(
      'Sarà subito selezionabile sui nuovi viaggi.',
    );
    expect(Array.from(element.querySelectorAll('label')).map((l) => l.textContent?.trim())).toEqual(
      ['Targa', 'Descrizione', 'Tipologia'],
    );
    expect(
      Array.from(element.querySelectorAll('.pt-dialog__actions button')).map((b) =>
        b.textContent?.trim(),
      ),
    ).toEqual(['Annulla', 'Crea mezzo']);
    expect(element.querySelector('dialog')!.open).toBe(true);
  });

  it('a muted line states the rule under Targa and Descrizione, and the type select has nothing preselected', () => {
    const { element } = render();
    const select = element.querySelector<HTMLSelectElement>('#vehicle-type')!;

    expect(text(element, '#vehicle-plate-note')).toBe(
      'Da 2 a 10 lettere e cifre; spazi e trattini vengono tolti.',
    );
    expect(text(element, '#vehicle-description-note')).toBe(
      'Marca, modello o allestimento. Massimo 100 caratteri.',
    );
    expect(element.querySelectorAll('.pt-field__hint')).toHaveLength(2);
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual([
      'Scegli una tipologia',
      'Motrice',
      'Rimorchio',
      'Autonomo',
    ]);
    expect(select.value).toBe('');
    expect(element.querySelector('#vehicle-plate')!.classList.contains('pt-mono')).toBe(true);
  });

  it('the trailer checkbox shows for Motrice only, unticked, and is cleared when the type changes', () => {
    const { fixture, element } = render();
    expect(element.querySelector('#vehicle-requires-trailer')).toBeNull();

    type(element, '#vehicle-type', 'Trailer');
    fixture.detectChanges();
    expect(element.querySelector('#vehicle-requires-trailer')).toBeNull();

    type(element, '#vehicle-type', 'Tractor');
    fixture.detectChanges();
    const box = element.querySelector<HTMLInputElement>('#vehicle-requires-trailer')!;
    expect(box.checked).toBe(false);
    expect(text(element, '#vehicle-requires-trailer-note')).toBe(
      'I viaggi con questa motrice dovranno indicare il rimorchio agganciato.',
    );
    expect(element.querySelector('label.pt-check')!.textContent?.trim()).toBe('Richiede rimorchio');

    tick(fixture, element, true);
    expect(element.querySelector<HTMLInputElement>('#vehicle-requires-trailer')!.checked).toBe(
      true,
    );

    type(element, '#vehicle-type', 'Trailer');
    fixture.detectChanges();
    type(element, '#vehicle-type', 'Tractor');
    fixture.detectChanges();
    expect(element.querySelector<HTMLInputElement>('#vehicle-requires-trailer')!.checked).toBe(
      false,
    );
  });

  it('Modifica opens the same dialog with the plate in the title, the status in the line, the fields prefilled and Salva modifiche', () => {
    const { element } = render(ROW);

    expect(text(element, '.pt-title')).toBe('Modifica mezzo CZ334KL');
    expect(text(element, '.pt-title .pt-mono')).toBe('CZ334KL');
    expect(text(element, '.pt-dialog__head .pt-muted')).toBe(
      'Dismesso. Le modifiche non cambiano i viaggi già registrati.',
    );
    expect(element.querySelector<HTMLInputElement>('#vehicle-plate')!.value).toBe('CZ334KL');
    expect(element.querySelector<HTMLInputElement>('#vehicle-description')!.value).toBe(
      'Iveco Eurocargo cassonato',
    );
    expect(element.querySelector<HTMLSelectElement>('#vehicle-type')!.value).toBe('Tractor');
    expect(element.querySelector<HTMLInputElement>('#vehicle-requires-trailer')!.checked).toBe(
      false,
    );
    expect(text(element, '.pt-btn--primary')).toBe('Salva modifiche');
    expect(Array.from(element.querySelectorAll('label')).map((l) => l.textContent?.trim())).toEqual(
      ['Targa', 'Descrizione', 'Tipologia', 'Richiede rimorchio'],
    );
  });

  it.each([
    ['one character', { plate: 'a' }, '#vehicle-plate-note'],
    ['eleven characters', { plate: 'abcdefghijk' }, '#vehicle-plate-note'],
    ['a punctuation mark', { plate: 'AB.456' }, '#vehicle-plate-note'],
    ['an empty plate', { plate: '' }, '#vehicle-plate-note'],
  ])(
    'a plate with %s sends no request and shows the frontend message',
    async (_n, values, note) => {
      const { fixture, element } = render();
      fill(element, values);

      await submit(fixture);

      expect(writes()).toHaveLength(0);
      expect(text(element, note)).toBe(
        'Usa da 2 a 10 lettere e cifre; spazi e trattini vengono tolti.',
      );
      expect(element.querySelector('#vehicle-plate')!.getAttribute('aria-invalid')).toBe('true');
      http.match(() => true);
    },
  );

  it.each([
    ['an empty description', ''],
    ['a blank description', '    '],
    ['101 characters', 'a'.repeat(101)],
  ])('%s sends no request and shows the message under Descrizione', async (_n, description) => {
    const { fixture, element } = render();
    fill(element, { description });

    await submit(fixture);

    expect(writes()).toHaveLength(0);
    expect(text(element, '#vehicle-description-note')).toBe(
      'Inserisci una descrizione di al massimo 100 caratteri.',
    );
    http.match(() => true);
  });

  it('no type chosen sends no request and shows the message under Tipologia', async () => {
    const { fixture, element } = render();
    fill(element, { kind: '' });

    await submit(fixture);

    expect(writes()).toHaveLength(0);
    expect(text(element, '#vehicle-type-note')).toBe('Scegli una tipologia.');
    http.match(() => true);
  });

  it('a description of 100 characters with spaces around is trimmed and sent, the plate as typed', async () => {
    const { fixture, element } = render();
    fill(element, { description: `  ${'a'.repeat(100)}  ` });

    await submit(fixture);

    const [post] = writes();
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      licensePlate: 'ab 456-cd',
      description: 'a'.repeat(100),
      type: 'StandaloneVehicle',
      requiresTrailer: false,
    });
    http.match(() => true);
  });

  it('a ticked trailer box is sent for a Motrice', async () => {
    const first = render();
    fill(first.element, { kind: 'Tractor' });
    first.fixture.detectChanges();
    tick(first.fixture, first.element, true);
    await submit(first.fixture);

    expect(writes()[0].request.body).toMatchObject({ type: 'Tractor', requiresTrailer: true });
    http.match(() => true);
  });

  it('the edit sends a PUT with the version the dialog was opened on', async () => {
    const { fixture } = render(ROW);

    await submit(fixture);

    const [put] = writes();
    expect(put.request.method).toBe('PUT');
    expect(put.request.url).toBe(`${URL}/5`);
    expect(put.request.body).toEqual({
      licensePlate: 'CZ334KL',
      description: 'Iveco Eurocargo cassonato',
      type: 'Tractor',
      requiresTrailer: false,
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
      Array.from(element.querySelectorAll('input, select')).every(
        (f) => (f as HTMLInputElement).disabled,
      ),
    ).toBe(true);
    expect(Array.from(element.querySelectorAll('button')).every((b) => b.disabled)).toBe(true);
    expect(text(element, '.pt-btn--primary')).toBe('Salvataggio in corso…');
    const escape = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(closedCount()).toBe(0);
    http.match(() => true);
  });

  it('a plate already used shows the backend detail in a danger notice above the fields and keeps the values', async () => {
    const { fixture, element, closedCount } = render();
    fill(element, {});
    await submit(fixture);
    const detail =
      'La targa AB456CD è già registrata su un mezzo dismesso. Per rimetterlo in servizio, riattivalo dalla lista.';

    http
      .match((r) => r.method === 'POST')[0]
      .flush(
        { errorCode: 'Registry.Vehicle.LicensePlateTakenByDecommissioned', detail },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(fixture);

    const notice = element.querySelector('.pt-notice--danger')!;
    expect(notice.textContent?.trim()).toBe(detail);
    expect(notice.compareDocumentPosition(element.querySelector('.pt-field')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(element.querySelector<HTMLInputElement>('#vehicle-plate')!.value).toBe('ab 456-cd');
    expect(element.querySelector<HTMLInputElement>('#vehicle-plate')!.disabled).toBe(false);
    expect(closedCount()).toBe(0);
    http.match(() => true);
  });

  it('a 409 on the edit stays inside the dialog, which stays open, and the list reloads at once', async () => {
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
    await submit(fixture);

    http
      .match((r) => r.method === 'PUT')[0]
      .flush(
        {
          errorCode: 'Registry.Vehicle.ConcurrentUpdate',
          detail: 'Il mezzo è stato modificato da un altro utente nel frattempo.',
        },
        { status: 409, statusText: 'Conflict' },
      );
    await settle(fixture);

    expect(text(element, '.pt-notice--danger')).toBe(
      'Il mezzo è stato modificato da un altro utente nel frattempo.',
    );
    expect(closedCount()).toBe(0);
    expect(http.match((r) => r.url === URL && r.method === 'GET')).toHaveLength(1);
    http.match(() => true);
  });

  it('after a refusal the focus is on Targa', async () => {
    const { fixture, element } = render();
    document.body.appendChild(element);
    fill(element, {});
    await submit(fixture);

    http.match((r) => r.method === 'POST')[0].flush(null, { status: 500, statusText: 'Error' });
    await settle(fixture);

    expect(document.activeElement).toBe(element.querySelector('#vehicle-plate'));
    element.remove();
    http.match(() => true);
  });

  it('a failure without a usable body shows the generic message above the fields', async () => {
    const { fixture, element } = render();
    fill(element, {});
    await submit(fixture);

    http.match((r) => r.method === 'POST')[0].flush(null, { status: 500, statusText: 'Error' });
    await settle(fixture);

    expect(text(element, '.pt-notice--danger')).toBe(
      'Si è verificato un errore. Riprova tra poco.',
    );
    http.match(() => true);
  });

  it('the field errors of a 400 appear under the matching field, ignoring case', async () => {
    const { fixture, element } = render();
    fill(element, { kind: 'Tractor' });
    fixture.detectChanges();
    await submit(fixture);

    http
      .match((r) => r.method === 'POST')[0]
      .flush(
        {
          errors: {
            LicensePlate: ['Targa non valida.'],
            DESCRIPTION: ['Descrizione errata.', 'Troppo lunga.'],
            Type: ['Tipo errato.'],
            RequiresTrailer: ['Rimorchio non ammesso.'],
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle(fixture);

    expect(text(element, '#vehicle-plate-note')).toBe('Targa non valida.');
    expect(text(element, '#vehicle-description-note')).toBe('Descrizione errata. Troppo lunga.');
    expect(text(element, '#vehicle-type-note')).toBe('Tipo errato.');
    expect(text(element, '#vehicle-requires-trailer-note')).toBe('Rimorchio non ammesso.');
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

    type(element, '#vehicle-plate', 'x');
    await submit(fixture);

    expect(element.querySelector('.pt-notice--danger')).toBeNull();
    expect(writes()).toHaveLength(0);
    http.match(() => true);
  });

  it('on success the dialog closes, the toast names the stored plate and the list is asked again', async () => {
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
          licensePlate: 'AB456CD',
          description: 'Iveco Stralis 480',
          type: 'StandaloneVehicle',
          requiresTrailer: false,
          status: 'Active',
          lastModifiedAt: '2026-11-16T08:00:00Z',
          version: 1,
        },
        { status: 201, statusText: 'Created' },
      );
    await settle(fixture);

    expect(closedCount()).toBe(1);
    expect(TestBed.inject(Toast).current()).toBe('Mezzo AB456CD creato');
    http.expectOne((r) => r.url === URL && r.method === 'GET');
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
});
