import italian from '../../../../../public/i18n/it.json';
import type { TripDocument } from './trips-api';

/**
 * Every document the API knows: a value the API's union gains and this map lacks is a compile error,
 * and so is a key left here after the union drops it (excess property).
 */
const DOCUMENTS: Record<TripDocument, true> = {
  DeliveryNote: true,
  DeliverySlip: true,
  WasteForm: true,
};

const SETS = [
  'driver.documents.name',
  'driver.documents.remove.of',
  'driver.ended.documents.the',
  'driver.home.inProgress.documents.attached',
  'driver.home.inProgress.documents.missing',
];

const textsOf = (set: string): Record<string, unknown> =>
  (set
    .split('.')
    .reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], italian) as
    Record<string, unknown> | undefined) ?? {};

describe('the texts that name a document', () => {
  it.each(SETS)('%s has a text for every document', (set) => {
    const texts = textsOf(set);

    for (const document of Object.keys(DOCUMENTS)) {
      expect(texts[document.toLowerCase()], `${set}.${document.toLowerCase()}`).toEqual(
        expect.any(String),
      );
    }
  });
});
