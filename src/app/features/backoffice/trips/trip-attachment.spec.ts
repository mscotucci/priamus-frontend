import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeIt from '@angular/common/locales/it';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { settle } from '../../../core/testing/interaction-testing';
import type { TripAttachmentItem } from './backoffice-trips-api';
import { BackofficeTripsFacade } from './backoffice-trips-facade';
import { TripAttachment } from './trip-attachment';

registerLocaleData(localeIt);

const FILE_URL = '/api/operations/backoffice/trips/t1/attachments';

const at = (hour: number, minute: number) => new Date(2026, 10, 28, hour, minute).toISOString();
const photo: TripAttachmentItem = { id: 'a1', fileKind: 'Jpeg', addedAt: at(7, 41) };
const pdf: TripAttachmentItem = { id: 'a3', fileKind: 'Pdf', addedAt: at(9, 20) };

describe('TripAttachment', () => {
  let http: HttpTestingController;
  let revokeUrl: ReturnType<typeof vi.fn<(url: string) => void>>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        BackofficeTripsFacade,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'it' },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    let count = 0;
    revokeUrl = vi.fn<(url: string) => void>();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:file-${++count}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeUrl);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const text = (element: Element | null | undefined) =>
    element?.textContent?.replace(/\s+/g, ' ').trim();

  const fakeTab = () => ({ opener: {} as unknown, location: { href: '' }, close: vi.fn() });

  const create = async (
    attachment: TripAttachmentItem,
  ): Promise<ComponentFixture<TripAttachment>> => {
    const fixture = TestBed.createComponent(TripAttachment);
    fixture.componentRef.setInput('tripId', 't1');
    fixture.componentRef.setInput('attachment', attachment);
    fixture.componentRef.setInput('documentName', 'DDT');
    fixture.componentRef.setInput('number', 1);
    await settle(fixture);
    return fixture;
  };

  const el = (fixture: ComponentFixture<TripAttachment>) => fixture.nativeElement as HTMLElement;

  it('shows a photo as a thumbnail fetched with the session, named by document, number and time', async () => {
    const fixture = await create(photo);
    const request = http.expectOne(`${FILE_URL}/a1/file`);
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['1'], { type: 'image/jpeg' }));
    await settle(fixture);
    const thumb = el(fixture).querySelector<HTMLElement>('.pt-thumb')!;

    expect(thumb.getAttribute('aria-label')).toBe('DDT, foto 1, aggiunta il 28/11 alle 07:41');
    expect(thumb.querySelector('img')?.getAttribute('src')).toBe('blob:file-1');
    expect(el(fixture).querySelector('a')).toBeNull();
  });

  it('shows a PDF as a line "PDF 1" with day and time, named for assistive technology with its document', async () => {
    const fixture = await create(pdf);
    const line = el(fixture).querySelector<HTMLElement>('.pt-file')!;

    expect(Array.from(line.children).map(text)).toEqual(['', 'PDF 1', '28/11 09:20']);
    expect(line.getAttribute('aria-label')).toBe('DDT, PDF 1, aggiunto il 28/11 alle 09:20');
    http.expectNone(`${FILE_URL}/a3/file`);
  });

  it('reads the time of a file as day/month and hour:minute', async () => {
    const fixture = await create({ ...pdf, addedAt: at(9, 5) });

    expect(text(el(fixture).querySelector('.pt-file .pt-muted'))).toBe('28/11 09:05');
  });

  it('keeps a frame with the image icon when a photo cannot be fetched', async () => {
    const fixture = await create(photo);
    const thumb = el(fixture).querySelector('.pt-thumb')!;
    expect(thumb.querySelector('img')).toBeNull();

    http.expectOne(`${FILE_URL}/a1/file`).flush(null, { status: 404, statusText: 'x' });
    await settle(fixture);

    expect(thumb.querySelector('img')).toBeNull();
    expect(thumb.querySelector('app-icon')).not.toBeNull();
  });

  it('opens a photo already fetched in a new tab with its own object URL', async () => {
    const tab = fakeTab();
    const opened = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    const fixture = await create(photo);
    http.expectOne(`${FILE_URL}/a1/file`).flush(new Blob(['1']));
    await settle(fixture);

    el(fixture).querySelector<HTMLElement>('.pt-thumb')!.click();

    expect(opened).toHaveBeenCalledWith('', '_blank');
    expect(tab.location.href).toBe('blob:file-1');
    expect(tab.opener).toBeNull();
    http.verify();
  });

  it('opens a PDF in a tab opened by the click, then pointed to the fetched file', async () => {
    const tab = fakeTab();
    const opened = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    const fixture = await create(pdf);

    el(fixture).querySelector<HTMLElement>('.pt-file')!.click();
    expect(opened).toHaveBeenCalledWith('', '_blank');
    expect(tab.location.href).toBe('');
    const request = http.expectOne(`${FILE_URL}/a3/file`);
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['pdf'], { type: 'application/pdf' }));
    await settle(fixture);

    expect(tab.location.href).toBe('blob:file-1');
  });

  it('releases the object URL of a PDF tab after 60 seconds, not before', async () => {
    const tab = fakeTab();
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    const fixture = await create(pdf);
    vi.useFakeTimers({ toFake: ['setTimeout'] });

    el(fixture).querySelector<HTMLElement>('.pt-file')!.click();
    http.expectOne(`${FILE_URL}/a3/file`).flush(new Blob(['pdf']));
    await vi.advanceTimersByTimeAsync(0);

    expect(tab.location.href).toBe('blob:file-1');
    await vi.advanceTimersByTimeAsync(59_999);
    expect(revokeUrl).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:file-1');
  });

  it('closes the tab and says the file could not be opened when it cannot be fetched', async () => {
    const tab = fakeTab();
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    const fixture = await create(pdf);
    const failed = vi.fn();
    fixture.componentInstance.failed.subscribe(failed);

    el(fixture).querySelector<HTMLElement>('.pt-file')!.click();
    http.expectOne(`${FILE_URL}/a3/file`).flush(null, { status: 404, statusText: 'x' });
    await settle(fixture);

    expect(tab.close).toHaveBeenCalled();
    expect(tab.location.href).toBe('');
    expect(failed).toHaveBeenCalledOnce();
  });

  it('fetches nothing and says the file could not be opened when the browser blocks the new tab', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const fixture = await create(pdf);
    const failed = vi.fn();
    fixture.componentInstance.failed.subscribe(failed);

    el(fixture).querySelector<HTMLElement>('.pt-file')!.click();
    await settle(fixture);

    http.expectNone(`${FILE_URL}/a3/file`);
    expect(failed).toHaveBeenCalledOnce();
  });

  it('says the file could not be opened when the new tab is blocked for a photo already fetched', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const fixture = await create(photo);
    http.expectOne(`${FILE_URL}/a1/file`).flush(new Blob(['1']));
    await settle(fixture);
    const failed = vi.fn();
    fixture.componentInstance.failed.subscribe(failed);

    el(fixture).querySelector<HTMLElement>('.pt-thumb')!.click();

    expect(failed).toHaveBeenCalledOnce();
    http.verify();
  });

  it('releases the photo URL when the component goes away', async () => {
    const fixture = await create(photo);
    http.expectOne(`${FILE_URL}/a1/file`).flush(new Blob(['1']));
    await settle(fixture);

    fixture.destroy();

    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:file-1');
  });

  it('creates no object URL for a photo that arrives after the component went away', async () => {
    const fixture = await create(photo);
    const request = http.expectOne(`${FILE_URL}/a1/file`);

    fixture.destroy();
    request.flush(new Blob(['1']));
    await settle();

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
