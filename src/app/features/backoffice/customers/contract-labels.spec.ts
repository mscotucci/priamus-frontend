import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { CONTRACT_STATUS_PILL, documentsSentence } from './contract-labels';

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
});
