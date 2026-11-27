import { landingPath } from './landing';

describe('landingPath', () => {
  it.each([
    ['Admin', '/users'],
    ['BackOffice', '/customers'],
    ['Driver', '/driver'],
    ['Unknown', '/login'],
  ])('sends the role %s to %s', (role, path) => {
    expect(landingPath(role as Parameters<typeof landingPath>[0])).toBe(path);
  });
});
