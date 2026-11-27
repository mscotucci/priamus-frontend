import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Session } from '../../../core/auth/session';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { settle } from '../../../core/testing/interaction-testing';
import { TripVehicle } from './new-trip-answers';
import { TripsFacade } from './trips-facade';
import { VehicleQuestion } from './vehicle-question';

const URL = '/api/operations/driver/vehicles';

const vehicle = (
  id: string,
  kind: TripVehicle['kind'],
  description: string,
  requiresTrailer = false,
): TripVehicle => ({ id, kind, description, requiresTrailer, licensePlate: id.toUpperCase() });
const TRACTOR = vehicle('ab123cd', 'Tractor', 'Scania R450', true);
const FREE_TRACTOR = vehicle('ab999cd', 'Tractor', 'Iveco Stralis');
const STANDALONE = vehicle('cd456ef', 'StandaloneVehicle', 'Ribaltabile Menci');
const TRAILER = vehicle('xa456zz', 'Trailer', 'Semirimorchio Menci');

const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();

@Component({
  imports: [VehicleQuestion],
  providers: [TripsFacade],
  template: `
    <app-vehicle-question
      [tractor]="tractor()"
      [vehicle]="vehicle()"
      [trailer]="trailer()"
      (tractorChosen)="tractor.set($event)"
      (answered)="answers.push($event)"
    />
  `,
})
class Host {
  readonly tractor = signal<TripVehicle | null>(null);
  readonly vehicle = signal<TripVehicle | null>(null);
  readonly trailer = signal<TripVehicle | null>(null);
  readonly answers: { vehicle: TripVehicle; trailer: TripVehicle | null }[] = [];
}

describe('VehicleQuestion', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Session, useValue: { signOut: () => Promise.resolve() } },
      ],
    });
    TestBed.inject(TranslateService).use('it');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle(fixture);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const element = () => fixture.nativeElement as HTMLElement;

  const flush = async (query: string, vehicles: TripVehicle[]) => {
    http.expectOne(`${URL}?${query}`).flush(vehicles);
    await settle(fixture);
  };

  const cards = () => Array.from(element().querySelectorAll<HTMLLabelElement>('.pt-choice'));

  const tap = async (card: HTMLLabelElement | undefined) => {
    card!.querySelector('input')!.click();
    await settle(fixture);
  };

  it('the search reaches the server after the debounce, with the role Leading', async () => {
    await flush('role=Leading', [STANDALONE]);
    vi.useFakeTimers();
    const field = element().querySelector<HTMLInputElement>('input[type="search"]')!;

    field.value = 'menci';
    field.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(299);
    http.expectNone(`${URL}?role=Leading&search=menci`);
    vi.advanceTimersByTime(1);
    vi.useRealTimers();
    await settle(fixture);

    await flush('role=Leading&search=menci', [STANDALONE]);
    expect(cards().map((card) => text(card))).toEqual(['CD456EFRibaltabile Menci']);
  });

  it('a search without results shows "Nessun risultato."', async () => {
    await flush('role=Leading', []);

    expect(text(element())).toContain('Nessun risultato.');
  });

  it('no "Nessun risultato." while vehicles are listed', async () => {
    await flush('role=Leading', [STANDALONE]);

    expect(text(element())).not.toContain('Nessun risultato.');
  });

  it('a standalone vehicle answers at once, with no trailer', async () => {
    await flush('role=Leading', [STANDALONE, TRACTOR]);

    await tap(cards().find((card) => text(card)?.startsWith('CD456EF')));

    expect(host.answers).toEqual([{ vehicle: STANDALONE, trailer: null }]);
    http.expectNone(`${URL}?role=Trailer`);
  });

  it('a tractor answers nothing yet and reads the trailers; one that requires a trailer has no "Senza rimorchio", and a tap on a trailer answers', async () => {
    await flush('role=Leading', [TRACTOR]);

    await tap(cards()[0]);

    expect(host.answers).toEqual([]);
    await flush('role=Trailer', [TRAILER]);
    expect(cards().map((card) => text(card))).toEqual(['XA456ZZSemirimorchio Menci']);

    await tap(cards()[0]);

    expect(host.answers).toEqual([{ vehicle: TRACTOR, trailer: TRAILER }]);
  });

  it('a tractor that does not require a trailer offers "Senza rimorchio" first, and it answers with no trailer', async () => {
    host.tractor.set(FREE_TRACTOR);
    await settle(fixture);
    await flush('role=Trailer', [TRAILER]);

    expect(cards().map((card) => text(card))).toEqual([
      'Senza rimorchio',
      'XA456ZZSemirimorchio Menci',
    ]);

    await tap(cards()[0]);

    expect(host.answers).toEqual([{ vehicle: FREE_TRACTOR, trailer: null }]);
  });

  it('shows the answered vehicle selected, and "Senza rimorchio" when the answered tractor has none', async () => {
    host.vehicle.set(STANDALONE);
    await settle(fixture);
    await flush('role=Leading', [STANDALONE, TRACTOR]);

    expect(cards().map((card) => card.querySelector('input')!.checked)).toEqual([true, false]);

    host.vehicle.set(FREE_TRACTOR);
    host.tractor.set(FREE_TRACTOR);
    await settle(fixture);
    await flush('role=Trailer', [TRAILER]);

    expect(cards().map((card) => card.querySelector('input')!.checked)).toEqual([true, false]);
  });

  it('the search field is emptied when the question moves on to the trailers', async () => {
    await flush('role=Leading', [TRACTOR]);
    const field = element().querySelector<HTMLInputElement>('input[type="search"]')!;
    field.value = 'scania';

    host.tractor.set(TRACTOR);
    await settle(fixture);
    await flush('role=Trailer', [TRAILER]);

    expect(field.value).toBe('');
  });
});
