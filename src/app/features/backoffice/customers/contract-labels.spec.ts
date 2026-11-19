import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import {
  CONTRACT_STATUS_PILL,
  dayBefore,
  documentsSentence,
  minimumSummary,
  rateSummary,
  tieredExample,
} from './contract-labels';
import type { Minimum } from './contract-rate';
import type { PricingMode } from './contracts-api';

describe('contract labels', () => {
  const translate = () => {
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    const service = TestBed.inject(TranslateService);
    service.use('it');
    return service;
  };

  it('documentsSentence reads "Nessuno" when there are no documents', () => {
    expect(documentsSentence([], translate())).toBe('Nessuno');
  });

  it('documentsSentence joins the names in the given order and capitalises the first letter only', () => {
    const service = translate();

    expect(documentsSentence(['DeliveryNote', 'WasteForm', 'DailySummary'], service)).toBe(
      'DDT, formulario rifiuti, riepilogo di fine giornata',
    );
    expect(documentsSentence(['DeliverySlip', 'DailySummary'], service)).toBe(
      'Bolla, riepilogo di fine giornata',
    );
  });

  it('maps each status to its pill modifier', () => {
    expect(CONTRACT_STATUS_PILL).toEqual({
      Current: 'pt-pill--success',
      Upcoming: 'pt-pill--info',
      Expired: '',
    });
  });

  it('rateSummary reads the day price alone, or with the night price and call fee, in the unit of the mode', () => {
    const service = translate();

    expect(rateSummary({ day: 30, night: null, callFee: null }, 'ByHour', service)).toBe(
      '30,00 €/h',
    );
    expect(rateSummary({ day: 30, night: 42, callFee: 35 }, 'ByHour', service)).toBe(
      '30,00 €/h di giorno · 42,00 €/h di notte · chiamata 35,00 €',
    );
    expect(rateSummary({ day: 7.5, night: 9, callFee: 0 }, 'ByWeight', service)).toBe(
      '7,50 €/ton di giorno · 9,00 €/ton di notte · chiamata 0,00 €',
    );
    expect(rateSummary({ day: 120, night: null, callFee: null }, 'ByTrip', service)).toBe(
      '120,00 €',
    );
  });

  it('minimumSummary reads none, fixed and tiered', () => {
    const service = translate();
    const none: Minimum = { kind: 'None', amount: null, threshold: null, overage: null };
    const fixed: Minimum = { kind: 'FixedMinimum', amount: 30, threshold: null, overage: null };
    const tiered: Minimum = { kind: 'TieredOverage', amount: 50, threshold: 4, overage: 12 };

    expect(minimumSummary(none, 'ByHour', service)).toBe('Nessun minimo');
    expect(minimumSummary(fixed, 'ByHour', service)).toBe('Minimo 30,00 €');
    expect(minimumSummary(tiered, 'ByHour', service)).toBe(
      'Scaglione: 50,00 € fino a 4 ore, poi 12,00 €/h',
    );
    expect(minimumSummary({ ...tiered, threshold: 2.5 }, 'ByDistance', service)).toBe(
      'Scaglione: 50,00 € fino a 2,5 km, poi 12,00 €/km',
    );
  });

  it('tieredExample works the formula on a trip two units over the threshold, in the unit of the mode', () => {
    const service = translate();
    const tiered: Minimum = { kind: 'TieredOverage', amount: 50, threshold: 4, overage: 12 };
    const modes: [PricingMode, string][] = [
      [
        'ByHour',
        'Esempio: fino a 4 ore si fatturano 50,00 €; ogni ora oltre 4 ore aggiunge 12,00 €. Un viaggio di 6 ore: 74,00 €.',
      ],
      [
        'ByWeight',
        'Esempio: fino a 4 ton si fatturano 50,00 €; ogni ton oltre 4 ton aggiunge 12,00 €. Un viaggio di 6 ton: 74,00 €.',
      ],
      [
        'ByDistance',
        'Esempio: fino a 4 km si fatturano 50,00 €; ogni km oltre 4 km aggiunge 12,00 €. Un viaggio di 6 km: 74,00 €.',
      ],
    ];

    for (const [mode, sentence] of modes) {
      expect(tieredExample(tiered, mode, service)).toBe(sentence);
    }
    expect(tieredExample({ ...tiered, amount: 10.1, overage: 0.1 }, 'ByHour', service)).toContain(
      'Un viaggio di 6 ore: 10,30 €.',
    );
  });

  it('dayBefore gives the previous ISO date, across month and year ends', () => {
    expect(dayBefore('2026-03-15')).toBe('2026-03-14');
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
    expect(dayBefore('2026-01-01')).toBe('2025-12-31');
  });
});
