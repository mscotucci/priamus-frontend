import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import localeIt from '@angular/common/locales/it';
import { Component, LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { CurrentUser } from '../../../core/auth/auth-api';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog, userWithRole } from '../../../core/testing/dom-testing';
import { press, settle } from '../../../core/testing/interaction-testing';
import { DocumentsPage } from './documents-page';
import { Trips } from './trips';
import { TripsFacade } from './trips-facade';
import type { Trip, TripDocuments } from './trips-api';

registerLocaleData(localeIt);

const TRIP_URL = '/api/operations/driver/trips/t1';
const DOCUMENTS_URL = `${TRIP_URL}/documents`;

const trip: Trip = {
  id: 't1',
  state: 'InProgress',
  customer: { id: 'c1', companyName: 'Calcestruzzi Vestina S.p.A.', vatNumber: null },
  vehicle: {
    id: 'v1',
    kind: 'StandaloneVehicle',
    licensePlate: 'XY123AB',
    description: 'Autospurgo Scania P410',
    requiresTrailer: false,
  },
  trailer: null,
  pickup: null,
  delivery: null,
  day: '2026-11-28',
  start: '07:30:00',
  end: null,
  kilograms: null,
  kilometres: null,
  number: null,
};

const attachment = (id: string, fileKind: 'Jpeg' | 'Pdf', addedAt: string) => ({
  id,
  fileKind,
  addedAt,
});

/** The mockup's first state: DDT and formulario rifiuti required, the DDT has two photos. */
const documents = (extra: Partial<TripDocuments> = {}): TripDocuments => ({
  trip,
  documents: [
    {
      document: 'DeliveryNote',
      required: true,
      attachments: [
        attachment('a1', 'Jpeg', new Date(2026, 10, 28, 7, 41).toISOString()),
        attachment('a2', 'Jpeg', new Date(2026, 10, 28, 7, 42).toISOString()),
      ],
    },
    { document: 'WasteForm', required: true, attachments: [] },
    { document: 'DeliverySlip', required: false, attachments: [] },
  ],
  ...extra,
});

const text = (element: Node | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();

@Component({ template: '' })
class HomeStub {}

const routes = [
  {
    path: 'driver',
    component: Trips,
    children: [
      { path: '', component: HomeStub },
      { path: 'trips/:tripId/documents', component: DocumentsPage },
    ],
  },
];

describe('DocumentsPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;

  beforeEach(() => {
    stubModalDialog();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 28, 9, 0));
    const user: CurrentUser = { ...userWithRole('Driver'), driverId: 'd1' };
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        { provide: LOCALE_ID, useValue: 'it' },
        {
          provide: Session,
          useValue: {
            wait: () => Promise.resolve(),
            user: signal(user).asReadonly(),
            signOut: () => Promise.resolve(),
          },
        },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const fixture = () => harness.fixture as ComponentFixture<unknown>;

  const open = async (body: TripDocuments | number = documents()) => {
    harness = await RouterTestingHarness.create('/driver/trips/t1/documents');
    harness.detectChanges();
    const request = http.expectOne(DOCUMENTS_URL);
    if (typeof body === 'number') {
      request.flush(null, { status: body, statusText: 'x' });
    } else {
      request.flush(body);
    }
    await settle(fixture());
    element = harness.routeNativeElement as HTMLElement;
  };

  const cards = () => Array.from(element.querySelectorAll('.pt-card'));
  const card = (name: string) => cards().find((c) => text(c.querySelector('h2')) === name)!;
  const addButton = (name: string) =>
    Array.from(card(name).querySelectorAll('button')).find((b) => text(b) === 'Aggiungi')!;
  const files = (name: string) =>
    Array.from(card(name).querySelectorAll('.pt-file')).map(
      (row) =>
        `${text(row.querySelector('.pt-file__name')?.firstChild)} ${text(row.querySelector('.pt-file__hint'))}`,
    );

  /** Chooses `file` in the card's picker, as the phone's own picker would. */
  const choose = async (name: string, file: File) => {
    const input = card(name).querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await settle(fixture());
  };

  const pdf = () => new File(['%PDF-1.4 body'], 'bolla.pdf', { type: 'application/pdf' });

  const put = (): TestRequest =>
    http.expectOne((r) => r.method === 'PUT' && r.url.startsWith(`${TRIP_URL}/attachments/`));

  describe('the page', () => {
    it('shows the back arrow, the title, the customer, the state, the line and the cards in the order of the response', async () => {
      await open();

      expect(element.querySelector('.pt-appbar button')?.getAttribute('aria-label')).toBe(
        'Indietro',
      );
      expect(text(element.querySelector('h1'))).toBe('Documenti');
      expect(text(element.querySelector('main > p'))).toBe(
        'Calcestruzzi Vestina S.p.A.In corso · iniziato oggi alle 07:30',
      );
      expect(text(element.querySelectorAll('main > p')[1])).toBe(
        'Una foto o un PDF per ogni documento. Puoi terminare il viaggio anche senza.',
      );
      expect(cards().map((c) => text(c.querySelector('h2')))).toEqual([
        'DDT',
        'Formulario rifiuti',
        'Bolla',
      ]);
    });

    it('says the number and the day of an ended trip', async () => {
      await open(documents({ trip: { ...trip, state: 'Ended', number: 12, day: '2026-11-26' } }));

      expect(text(element.querySelector('main > p'))).toBe(
        'Calcestruzzi Vestina S.p.A.n. 12 · giovedì 26 novembre',
      );
    });

    it('a required document carries "Richiesto · allegato" with files and "Richiesto · manca" without; one not required no pill', async () => {
      await open();

      expect(text(card('DDT').querySelector('.pt-pill'))).toBe('Richiesto · allegato');
      expect(card('DDT').querySelector('.pt-pill--success')).not.toBeNull();
      expect(text(card('Formulario rifiuti').querySelector('.pt-pill'))).toBe('Richiesto · manca');
      expect(card('Formulario rifiuti').querySelector('.pt-pill--warn')).not.toBeNull();
      expect(card('Bolla').querySelector('.pt-pill')).toBeNull();
    });

    it('lists the files with their time, a remove button each, and a native picker behind "Aggiungi" that is primary only on a required document with no file', async () => {
      await open();

      expect(files('DDT')).toEqual(['Foto 1 oggi 07:41', 'Foto 2 oggi 07:42']);
      expect(
        Array.from(card('DDT').querySelectorAll('.pt-file button')).map((b) =>
          b.getAttribute('aria-label'),
        ),
      ).toEqual(['Rimuovi foto 1 del DDT', 'Rimuovi foto 2 del DDT']);
      const input = card('Formulario rifiuti').querySelector<HTMLInputElement>('input[type=file]')!;
      expect(input.accept).toBe('image/*,application/pdf');
      expect(input.hasAttribute('capture')).toBe(false);
      expect(addButton('Formulario rifiuti').classList).toContain('pt-btn--primary');
      expect(addButton('DDT').classList).not.toContain('pt-btn--primary');
      expect(addButton('Bolla').classList).not.toContain('pt-btn--primary');
    });

    it('names the files by their position among the ones of their kind, so removing "Foto 1" makes "Foto 2" the new "Foto 1"', async () => {
      const at = new Date(2026, 10, 27, 16, 5).toISOString();
      const mixed = (list: ReturnType<typeof attachment>[]) =>
        documents({
          documents: [{ document: 'DeliverySlip', required: false, attachments: list }],
        });
      await open(
        mixed([
          attachment('p1', 'Pdf', at),
          attachment('a1', 'Jpeg', at),
          attachment('a2', 'Jpeg', at),
        ]),
      );

      expect(files('Bolla').map((row) => row?.slice(0, 6))).toEqual(['PDF 1 ', 'Foto 1', 'Foto 2']);

      card('Bolla').querySelectorAll<HTMLButtonElement>('.pt-file button')[1].click();
      await settle(fixture());
      await press(fixture(), 1);
      http
        .expectOne((r) => r.method === 'DELETE' && r.url === `${TRIP_URL}/attachments/a1`)
        .flush(null, {
          status: 204,
          statusText: 'No Content',
        });
      await settle(fixture());
      http
        .expectOne(DOCUMENTS_URL)
        .flush(mixed([attachment('p1', 'Pdf', at), attachment('a2', 'Jpeg', at)]));
      await settle(fixture());

      expect(files('Bolla').map((row) => row?.slice(0, 6))).toEqual(['PDF 1 ', 'Foto 1']);
    });

    it('tells when a file was added as "oggi hh:mm", "ieri hh:mm" or "dd/MM hh:mm"', async () => {
      await open(
        documents({
          documents: [
            {
              document: 'DeliveryNote',
              required: false,
              attachments: [
                attachment('a1', 'Jpeg', new Date(2026, 10, 28, 7, 41).toISOString()),
                attachment('a2', 'Pdf', new Date(2026, 10, 27, 16, 5).toISOString()),
                attachment('a3', 'Jpeg', new Date(2026, 10, 26, 10, 15).toISOString()),
              ],
            },
          ],
        }),
      );

      expect(files('DDT')).toEqual(['Foto 1 oggi 07:41', 'PDF 1 ieri 16:05', 'Foto 2 26/11 10:15']);
    });

    it('a trip out of the driver window shows a notice and a way home, with no card to add to', async () => {
      await open(404);

      expect(cards()).toHaveLength(0);
      expect(text(element.querySelector('main app-notice'))).toContain('non esiste più');
      expect(element.querySelector('main a[href="/driver"]')).not.toBeNull();
    });

    it('a trip in the window offers adding and removing', async () => {
      await open();

      expect(element.querySelectorAll('input[type=file]')).toHaveLength(3);
      expect(element.querySelectorAll('.pt-file button')).toHaveLength(2);
    });
  });

  describe('back and the trip asked for', () => {
    it('the back arrow asks the facade to go back', async () => {
      await open();
      const back = vi
        .spyOn(harness.routeDebugElement!.injector.get(TripsFacade), 'back')
        .mockImplementation(() => undefined);

      element.querySelector<HTMLButtonElement>('.pt-appbar button')!.click();

      expect(back).toHaveBeenCalledOnce();
    });

    it('shows no card of the documents read for another trip', async () => {
      await open(documents({ trip: { ...trip, id: 'other' } }));

      expect(cards()).toHaveLength(0);
      expect(element.querySelector('main [role=status]')).not.toBeNull();
    });
  });

  describe('adding', () => {
    it('while a file is sent the card shows the spinner and "Invio del PDF…" in place of "Aggiungi", and the other cards stay usable', async () => {
      await open();

      await choose('Bolla', pdf());
      const request = put();

      expect(request.request.params.get('document')).toBe('DeliverySlip');
      expect(text(card('Bolla').querySelector('[role=status]'))).toBe('Invio del PDF…');
      expect(card('Bolla').querySelector('.pt-spinner')).not.toBeNull();
      expect(card('Bolla').querySelector('input[type=file]')).toBeNull();
      expect(addButton('DDT').disabled).toBe(false);
      expect(addButton('Formulario rifiuti').disabled).toBe(false);

      request.flush(null, { status: 201, statusText: 'Created' });
      await settle(fixture());
      const reread = http.expectOne(DOCUMENTS_URL);

      expect(text(card('Bolla').querySelector('[role=status]'))).toBe('Invio del PDF…');
      expect(card('Bolla').querySelector('input[type=file]')).toBeNull();

      reread.flush(documents());
      await settle(fixture());

      expect(card('Bolla').querySelector('[role=status]')).toBeNull();
      expect(addButton('Bolla')).toBeDefined();
    });

    it('a send that does not reach the server shows "Connessione persa. Riprova." in the same place', async () => {
      await open();

      await choose('Bolla', pdf());
      put().error(new ProgressEvent('error'), { status: 0, statusText: '' });
      await settle(fixture());

      expect(text(card('Bolla').querySelector('.pt-field__error'))).toBe(
        'Connessione persa. Riprova.',
      );
      expect(addButton('Bolla').disabled).toBe(false);
    });

    it('after a send that did not reach the server, "Riprova" sends the same identifier and the same file again', async () => {
      await open();
      const file = pdf();

      await choose('Bolla', file);
      const first = put();
      first.error(new ProgressEvent('error'), { status: 0, statusText: '' });
      await settle(fixture());

      const retry = Array.from(card('Bolla').querySelectorAll('button')).find(
        (b) => text(b) === 'Riprova',
      )!;
      expect(retry).toBeDefined();
      expect(text(card('Bolla').querySelector('.pt-field__error'))).toBe(
        'Connessione persa. Riprova.',
      );

      retry.click();
      await settle(fixture());
      const second = put();

      expect(second.request.url).toBe(first.request.url);
      expect(second.request.body).toBe(first.request.body);
      expect(second.request.params.get('document')).toBe('DeliverySlip');
      expect(text(card('Bolla').querySelector('[role=status]'))).toBe('Invio del PDF…');
      expect(card('Bolla').querySelector('.pt-field__error')).toBeNull();

      second.flush(null, { status: 200, statusText: 'OK' });
      await settle(fixture());
      http.expectOne(DOCUMENTS_URL).flush(documents());
      await settle(fixture());

      expect(card('Bolla').querySelector('[role=status]')).toBeNull();
      expect(card('Bolla').querySelector('.pt-field__error')).toBeNull();
      expect(Array.from(card('Bolla').querySelectorAll('button')).map((b) => text(b))).toEqual([
        'Aggiungi',
      ]);
    });

    it('after a failed send "Riprova" sends the same identifier again, and a refusal that is final offers no retry', async () => {
      await open();

      await choose('Bolla', pdf());
      const first = put();
      first.flush(null, { status: 500, statusText: 'x' });
      await settle(fixture());

      expect(text(card('Bolla').querySelector('.pt-field__error'))).toBe(
        'Si è verificato un errore. Riprova tra poco.',
      );
      Array.from(card('Bolla').querySelectorAll('button'))
        .find((b) => text(b) === 'Riprova')!
        .click();
      await settle(fixture());
      const second = put();
      expect(second.request.url).toBe(first.request.url);
      second.flush(null, { status: 429, statusText: 'x' });
      await settle(fixture());

      expect(text(card('Bolla').querySelector('.pt-field__error'))).toBe(
        'Troppi invii in poco tempo. Riprova tra un minuto.',
      );
      expect(Array.from(card('Bolla').querySelectorAll('button')).map((b) => text(b))).toEqual([
        'Aggiungi',
      ]);
    });

    it('a kept file is not offered for another trip when the route changes to it', async () => {
      await open();
      await choose('Bolla', pdf());
      put().error(new ProgressEvent('error'), { status: 0, statusText: '' });
      await settle(fixture());
      expect(text(card('Bolla').querySelector('.pt-field__error'))).not.toBeUndefined();

      await harness.navigateByUrl('/driver/trips/t2/documents');
      http
        .expectOne('/api/operations/driver/trips/t2/documents')
        .flush(documents({ trip: { ...trip, id: 't2' } }));
      await settle(fixture());

      expect(card('Bolla').querySelector('.pt-field__error')).toBeNull();
      expect(Array.from(card('Bolla').querySelectorAll('button')).map((b) => text(b))).toEqual([
        'Aggiungi',
      ]);
      http.expectNone((r) => r.method === 'PUT');
    });

    it.each([
      ['an image the browser cannot read', null, false],
      ['a preparation that throws', { width: 100, height: 80, close: () => undefined }, true],
    ])(
      'a preparation of the trip left that ends late as %s shows no refusal on the new trip',
      async (_case, decoded, canvasFails) => {
        let decode: (image: unknown) => void = () => undefined;
        vi.stubGlobal(
          'createImageBitmap',
          vi.fn(() =>
            decoded === null
              ? new Promise((_resolve, reject) => (decode = () => reject(new Error('x'))))
              : new Promise((resolve) => (decode = resolve)),
          ),
        );
        if (canvasFails) {
          vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
            throw new Error('no canvas');
          });
        }
        await open();
        await choose('Bolla', new File(['x'], 'p.jpg', { type: 'image/jpeg' }));

        await harness.navigateByUrl('/driver/trips/t2/documents');
        http
          .expectOne('/api/operations/driver/trips/t2/documents')
          .flush(documents({ trip: { ...trip, id: 't2' } }));
        await settle(fixture());
        decode(decoded);
        await settle(fixture());

        expect(card('Bolla').querySelector('.pt-field__error')).toBeNull();
        expect(addButton('Bolla').disabled).toBe(false);
        http.expectNone((r) => r.method === 'PUT');
      },
    );

    it('going to another trip and back, the late answer of the first send does not idle the new send of the same document', async () => {
      await open();
      await choose('Bolla', pdf());
      const first = put();
      const goTo = async (id: string) => {
        await harness.navigateByUrl(`/driver/trips/${id}/documents`);
        http
          .expectOne(`/api/operations/driver/trips/${id}/documents`)
          .flush(documents({ trip: { ...trip, id } }));
        await settle(fixture());
      };
      await goTo('t2');
      await goTo('t1');
      await choose('Bolla', pdf());
      const second = put();

      first.flush(null, { status: 500, statusText: 'x' });
      await settle(fixture());

      expect(text(card('Bolla').querySelector('[role=status]'))).toBe('Invio del PDF…');
      expect(card('Bolla').querySelector('.pt-field__error')).toBeNull();
      second.flush(null, { status: 201, statusText: 'Created' });
      await settle(fixture());
      http.expectOne(DOCUMENTS_URL).flush(documents());
      await settle(fixture());

      expect(card('Bolla').querySelector('[role=status]')).toBeNull();
    });

    it('a late answer for the trip left does not idle the card of the same document on the new trip', async () => {
      await open();
      await choose('Bolla', pdf());
      const late = put();

      await harness.navigateByUrl('/driver/trips/t2/documents');
      http
        .expectOne('/api/operations/driver/trips/t2/documents')
        .flush(documents({ trip: { ...trip, id: 't2' } }));
      await settle(fixture());
      await choose('Bolla', pdf());
      const current = http.expectOne(
        (r) => r.method === 'PUT' && r.url.startsWith('/api/operations/driver/trips/t2/'),
      );
      expect(text(card('Bolla').querySelector('[role=status]'))).toBe('Invio del PDF…');

      late.flush(null, { status: 500, statusText: 'x' });
      await settle(fixture());

      expect(text(card('Bolla').querySelector('[role=status]'))).toBe('Invio del PDF…');
      expect(card('Bolla').querySelector('.pt-field__error')).toBeNull();
      current.flush(null, { status: 201, statusText: 'Created' });
      await settle(fixture());
      http.expectOne('/api/operations/driver/trips/t2/documents').flush(documents());
    });

    it('choosing a new file with "Aggiungi" drops the kept one and sends under a new identifier', async () => {
      await open();
      await choose('Bolla', pdf());
      const first = put();
      first.error(new ProgressEvent('error'), { status: 0, statusText: '' });
      await settle(fixture());

      await choose('Bolla', pdf());
      const second = put();

      expect(second.request.url).not.toBe(first.request.url);
      expect(card('Bolla').querySelector('.pt-field__error')).toBeNull();
      second.flush(null, { status: 201, statusText: 'Created' });
      await settle(fixture());
      http.expectOne(DOCUMENTS_URL).flush(documents());
      await settle(fixture());

      expect(Array.from(card('Bolla').querySelectorAll('button')).map((b) => text(b))).toEqual([
        'Aggiungi',
      ]);
    });

    it('a send that throws before it reaches the server ends as the generic refusal, not silently', async () => {
      vi.stubGlobal(
        'createImageBitmap',
        vi.fn().mockResolvedValue({ width: 100, height: 80, close: () => undefined }),
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
        throw new Error('no canvas');
      });
      await open();

      await choose('Bolla', new File(['x'], 'p.jpg', { type: 'image/jpeg' }));

      http.expectNone((r) => r.method === 'PUT');
      expect(text(card('Bolla').querySelector('.pt-field__error'))).toBe(
        'Si è verificato un errore. Riprova tra poco.',
      );
      expect(addButton('Bolla').disabled).toBe(false);
    });

    it('a photo shows "Invio della foto…" while it is sent', async () => {
      vi.stubGlobal(
        'createImageBitmap',
        vi.fn().mockResolvedValue({ width: 100, height: 80, close: () => undefined }),
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        fillRect: () => undefined,
        drawImage: () => undefined,
      } as unknown as CanvasRenderingContext2D);
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
        callback(new Blob(['jpeg'], { type: 'image/jpeg' })),
      );
      await open();

      await choose('Bolla', new File(['x'], 'p.heic', { type: 'image/heic' }));
      const request = put();

      expect(text(card('Bolla').querySelector('[role=status]'))).toBe('Invio della foto…');

      request.flush(null, { status: 201, statusText: 'Created' });
      await settle(fixture());
      http.expectOne(DOCUMENTS_URL).flush(documents());
    });

    it('a send for a trip that is gone reads the documents again, and the 404 shows the notice and the way home', async () => {
      await open();

      await choose('Bolla', pdf());
      put().flush(null, { status: 404, statusText: 'x' });
      await settle(fixture());
      http.expectOne(DOCUMENTS_URL).flush(null, { status: 404, statusText: 'x' });
      await settle(fixture());

      expect(cards()).toHaveLength(0);
      expect(text(element.querySelector('main app-notice'))).toContain('non esiste più');
      expect(element.querySelector('main a[href="/driver"]')).not.toBeNull();
    });

    it('a send that fails otherwise shows the generic notice under the card', async () => {
      await open();

      await choose('Bolla', pdf());
      put().flush(null, { status: 500, statusText: 'x' });
      await settle(fixture());

      expect(text(card('Bolla').querySelector('.pt-field__error'))).toBe(
        'Si è verificato un errore. Riprova tra poco.',
      );
      expect(addButton('Bolla').disabled).toBe(false);
    });

    it('a file that is neither a photo nor a PDF is refused with "Si possono allegare solo foto o PDF." and nothing is sent', async () => {
      await open();

      await choose('Bolla', new File(['hello'], 'note.txt', { type: 'text/plain' }));

      http.expectNone((r) => r.method === 'PUT');
      expect(text(card('Bolla').querySelector('.pt-field__error'))).toBe(
        'Si possono allegare solo foto o PDF.',
      );
      expect(addButton('Bolla').disabled).toBe(false);
    });

    it('a file over 10 MB is refused with "Il file è troppo grande: al massimo 10 MB." and nothing is sent; 10 MB exactly is sent', async () => {
      await open();
      const sized = (bytes: number) =>
        new File(['%PDF-', new Uint8Array(bytes - 5)], 'big.pdf', { type: 'application/pdf' });

      await choose('Bolla', sized(10 * 1024 * 1024 + 1));

      http.expectNone((r) => r.method === 'PUT');
      expect(text(card('Bolla').querySelector('.pt-field__error'))).toBe(
        'Il file è troppo grande: al massimo 10 MB.',
      );
      expect(Array.from(card('Bolla').querySelectorAll('button')).map(text)).not.toContain(
        'Riprova',
      );
      expect(addButton('Bolla').disabled).toBe(false);

      await choose('Bolla', sized(10 * 1024 * 1024));

      const sent = put();
      expect(sent.request.body.size).toBe(10 * 1024 * 1024);
      sent.flush(null, { status: 201, statusText: 'Created' });
      await settle(fixture());
      http.expectOne(DOCUMENTS_URL).flush(documents());
    });

    it.each([
      [
        '422 shows the server text under the button of its document',
        422,
        {
          errorCode: 'Operations.Attachment.TooMany',
          detail: 'Hai raggiunto il massimo di 20 file per questo viaggio.',
        },
        'Hai raggiunto il massimo di 20 file per questo viaggio.',
      ],
      [
        'a raw 413 shows the text of a file too large',
        413,
        null,
        'Il file è troppo grande: al massimo 10 MB.',
      ],
      [
        '429 shows "Troppi invii in poco tempo. Riprova tra un minuto."',
        429,
        null,
        'Troppi invii in poco tempo. Riprova tra un minuto.',
      ],
    ])('%s', async (_case, status, body, expected) => {
      await open();

      await choose('Bolla', pdf());
      put().flush(body, { status, statusText: 'x' });
      await settle(fixture());

      expect(text(card('Bolla').querySelector('.pt-field__error'))).toBe(expected);
      expect(addButton('Bolla').disabled).toBe(false);
      http.expectNone(DOCUMENTS_URL);
      expect(files('Bolla')).toEqual([]);
    });

    it('a refusal goes away when the next file is chosen', async () => {
      await open();
      await choose('Bolla', new File(['hello'], 'note.txt', { type: 'text/plain' }));

      await choose('Bolla', pdf());

      expect(card('Bolla').querySelector('.pt-field__error')).toBeNull();
      put().flush(null, { status: 201, statusText: 'Created' });
      await settle(fixture());
      http.expectOne(DOCUMENTS_URL).flush(documents());
    });
  });

  describe('removing', () => {
    const openRemove = async () => {
      await open();
      card('DDT').querySelectorAll<HTMLButtonElement>('.pt-file button')[0].click();
      await settle(fixture());
    };

    it('asks "Rimuovere la foto 1 del DDT?" with "Rimuovi" and "Annulla"; "Annulla" removes nothing', async () => {
      await openRemove();

      expect(text(element.querySelector('.pt-dialog .pt-title'))).toBe(
        'Rimuovere la foto 1 del DDT?',
      );
      expect(
        Array.from(element.querySelectorAll('.pt-dialog__actions button')).map((b) => text(b)),
      ).toEqual(['Annulla', 'Rimuovi']);

      await press(fixture(), 0);

      http.expectNone((r) => r.method === 'DELETE');
      expect(element.querySelector('.pt-dialog')).toBeNull();
    });

    it.each([
      ['DeliverySlip', 'Pdf', 'Bolla', 'Rimuovere il PDF 1 della bolla?'],
      ['WasteForm', 'Jpeg', 'Formulario rifiuti', 'Rimuovere la foto 1 del formulario rifiuti?'],
    ] as const)(
      'names the article and the document of %s',
      async (document, fileKind, name, title) => {
        await open(
          documents({
            documents: [
              {
                document,
                required: false,
                attachments: [
                  attachment('x1', fileKind, new Date(2026, 10, 28, 8, 0).toISOString()),
                ],
              },
            ],
          }),
        );

        card(name).querySelector<HTMLButtonElement>('.pt-file button')!.click();
        await settle(fixture());

        expect(text(element.querySelector('.pt-dialog .pt-title'))).toBe(title);
      },
    );

    it('"Rimuovi" removes the file and reads the documents again', async () => {
      await openRemove();

      await press(fixture(), 1);
      http
        .expectOne((r) => r.method === 'DELETE' && r.url === `${TRIP_URL}/attachments/a1`)
        .flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture());
      http.expectOne(DOCUMENTS_URL).flush(
        documents({
          documents: [
            {
              document: 'DeliveryNote',
              required: true,
              attachments: [attachment('a2', 'Jpeg', new Date(2026, 10, 28, 7, 42).toISOString())],
            },
          ],
        }),
      );
      await settle(fixture());

      expect(files('DDT')).toEqual(['Foto 1 oggi 07:42']);
      expect(element.querySelector('.pt-dialog')).toBeNull();
    });

    it('a removal that does not reach the server shows "Connessione persa. Riprova."', async () => {
      await openRemove();

      await press(fixture(), 1);
      http
        .expectOne((r) => r.method === 'DELETE')
        .error(new ProgressEvent('error'), { status: 0, statusText: '' });
      await settle(fixture());

      expect(text(element.querySelector('.pt-dialog app-notice'))).toBe(
        'Connessione persa. Riprova.',
      );
      expect(element.querySelector('main > app-notice')).toBeNull();
      http.expectNone(DOCUMENTS_URL);
    });

    it('any other failure of a removal shows the generic notice', async () => {
      await openRemove();

      await press(fixture(), 1);
      http.expectOne((r) => r.method === 'DELETE').flush(null, { status: 500, statusText: 'x' });
      await settle(fixture());

      expect(text(element.querySelector('.pt-dialog app-notice'))).toBe(
        'Si è verificato un errore. Riprova tra poco.',
      );
      expect(
        element.querySelector<HTMLButtonElement>('.pt-dialog__actions .pt-btn--danger')!.disabled,
      ).toBe(false);

      await press(fixture(), 1);
      http
        .expectOne((r) => r.method === 'DELETE')
        .flush(null, { status: 204, statusText: 'No Content' });
      await settle(fixture());
      http.expectOne(DOCUMENTS_URL).flush(documents());
      await settle(fixture());

      expect(element.querySelector('.pt-dialog')).toBeNull();
    });

    it('a removal of a file that is gone reads the documents again, and the 404 shows the notice and the way home', async () => {
      await openRemove();

      await press(fixture(), 1);
      http.expectOne((r) => r.method === 'DELETE').flush(null, { status: 404, statusText: 'x' });
      await settle(fixture());
      http.expectOne(DOCUMENTS_URL).flush(null, { status: 404, statusText: 'x' });
      await settle(fixture());

      expect(element.querySelector('.pt-dialog')).toBeNull();
      expect(text(element.querySelector('main app-notice'))).toContain('non esiste più');
      expect(element.querySelector('main a[href="/driver"]')).not.toBeNull();
    });
  });
});
