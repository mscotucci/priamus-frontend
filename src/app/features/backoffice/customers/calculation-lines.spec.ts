import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { calculationLines, type CalculationInput } from './calculation-lines';

const BASE: CalculationInput = {
  mode: 'ByHour',
  start: '09:00',
  nightBand: { start: '22:00', end: '06:00' },
  isNight: false,
  nightSurcharge: true,
  rateSource: 'Contract',
  rateVehiclePlate: null,
  ratePickup: null,
  rateDelivery: null,
  quantity: 330,
  unitPrice: 52,
  baseAmount: 286,
  minimumKind: 'None',
  minimumAmount: null,
  minimumThreshold: null,
  minimumOveragePrice: null,
  minimumApplied: false,
  amountAfterMinimum: 286,
  nightCallFee: null,
  total: 286,
};

const magazzino = { name: 'Magazzino centrale', municipality: 'Pescara' };
const cantiere = { name: 'Cantiere A14', municipality: 'Chieti' };

describe('calculationLines', () => {
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    translate = TestBed.inject(TranslateService);
    translate.use('it');
  });

  const lines = (overrides: Partial<CalculationInput>) =>
    calculationLines({ ...BASE, ...overrides }, translate);

  const row = (rows: ReturnType<typeof lines>, label: string) =>
    rows.find((entry) => entry.label === label);

  it('writes the band, the rate, the formula and the minimum of a day trip, without a call fee', () => {
    const rows = lines({});

    expect(rows.map((entry) => entry.label)).toEqual(['Fascia', 'Tariffa', 'Importo', 'Minimo']);
    expect(row(rows, 'Fascia')?.text).toBe(
      'Di giorno · inizia alle 09:00, fuori dalla fascia notturna 22:00–06:00',
    );
    expect(row(rows, 'Tariffa')?.text).toBe('Del cliente');
    expect(row(rows, 'Importo')).toEqual({
      label: 'Importo',
      text: '5 h 30 min × 52,00 €/h = 286,00 €',
      mono: true,
    });
    expect(row(rows, 'Minimo')?.text).toBe('Nessun minimo');
  });

  it('adds the night call fee after the minimum, in the night band with the surcharge', () => {
    const rows = lines({
      start: '22:10',
      isNight: true,
      nightCallFee: 45,
      total: 331,
    });

    expect(row(rows, 'Fascia')?.text).toBe(
      'Di notte · inizia alle 22:10, nella fascia notturna 22:00–06:00',
    );
    expect(rows.map((entry) => entry.label).at(-1)).toBe('Chiamata notturna');
    expect(row(rows, 'Chiamata notturna')?.text).toBe('+ 45,00 € = 331,00 €');
  });

  it('says the day price holds for a night trip of a contract without the surcharge', () => {
    const rows = lines({ isNight: true, nightSurcharge: false });

    expect(row(rows, 'Fascia')?.text).toBe(
      'Di notte · il contratto non ha la maggiorazione notturna: vale il prezzo di giorno',
    );
  });

  it.each([
    ['the contract', { rateSource: 'Contract' as const }, 'Del cliente', undefined],
    [
      'a vehicle without a place',
      { rateSource: 'Vehicle' as const, rateVehiclePlate: 'PE-482-WF' },
      'Propria del mezzo',
      'PE-482-WF',
    ],
    [
      'a vehicle on one place',
      { rateSource: 'Vehicle' as const, rateVehiclePlate: 'PE-482-WF', rateDelivery: cantiere },
      'Propria del mezzo per il luogo Cantiere A14, Chieti',
      undefined,
    ],
    [
      'a vehicle on a pair',
      {
        rateSource: 'Vehicle' as const,
        rateVehiclePlate: 'PE-482-WF',
        ratePickup: magazzino,
        rateDelivery: cantiere,
      },
      'Propria del mezzo per la coppia Magazzino centrale, Pescara → Cantiere A14, Chieti',
      undefined,
    ],
    [
      'a location',
      { rateSource: 'Location' as const, ratePickup: magazzino },
      'Del luogo Magazzino centrale, Pescara',
      undefined,
    ],
    [
      'a pair',
      { rateSource: 'LocationPair' as const, ratePickup: magazzino, rateDelivery: cantiere },
      'Della coppia Magazzino centrale, Pescara → Cantiere A14, Chieti',
      undefined,
    ],
  ])('names the rate of %s', (_name, overrides, text, plate) => {
    const rate = row(lines(overrides), 'Tariffa');

    expect(rate?.text).toBe(text);
    expect(rate?.plate).toBe(plate);
  });

  it.each([
    ['ByWeight' as const, 3520, '3,52 ton × 120,00 €/ton = 422,40 €'],
    ['ByDistance' as const, 120, '120 km × 120,00 €/km = 422,40 €'],
    ['ByTrip' as const, null, '120,00 € a viaggio'],
  ])('writes the formula of a trip priced %s', (mode, quantity, text) => {
    const rows = lines({ mode, quantity, unitPrice: 120, baseAmount: 422.4 });

    expect(row(rows, 'Importo')?.text).toBe(text);
  });

  it.each([
    [
      'a fixed minimum that raised the amount',
      {
        minimumKind: 'FixedMinimum' as const,
        minimumAmount: 400,
        minimumApplied: true,
        amountAfterMinimum: 400,
      },
      "Minimo 400,00 €: l'importo diventa 400,00 €",
    ],
    [
      'a fixed minimum that was not needed',
      { minimumKind: 'FixedMinimum' as const, minimumAmount: 120 },
      'Minimo 120,00 €: non serve',
    ],
    [
      'a tiered overage that changed nothing',
      {
        minimumKind: 'TieredOverage' as const,
        minimumAmount: 100,
        minimumThreshold: 2,
        minimumOveragePrice: 1,
      },
      "Scaglione: 100,00 € fino a 2 ore, poi 1,00 €/h: non cambia l'importo",
    ],
  ])('writes the minimum rule of %s', (_name, overrides, text) => {
    expect(row(lines(overrides), 'Minimo')?.text).toBe(text);
  });
});
