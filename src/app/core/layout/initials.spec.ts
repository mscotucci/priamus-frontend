import { initials } from './initials';

describe('initials', () => {
  it.each([
    ['m.rossi', 'MR'],
    ['mario_rossi', 'MR'],
    ['anna-maria', 'AM'],
    ['anna.maria.bianchi', 'AM'],
    ['admin', 'AD'],
    ['x', 'X'],
  ])('"%s" gives "%s"', (username, expected) => {
    expect(initials(username)).toBe(expected);
  });
});
