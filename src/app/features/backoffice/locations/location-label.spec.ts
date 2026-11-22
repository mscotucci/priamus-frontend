import { locationLabel } from './location-label';

describe('locationLabel', () => {
  it('names a location as "<name>, <municipality>"', () => {
    expect(locationLabel({ name: 'Cantiere A14', municipality: 'Chieti Scalo' })).toBe(
      'Cantiere A14, Chieti Scalo',
    );
  });
});
