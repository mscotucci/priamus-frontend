import { isValidPlate, normalizePlate } from './vehicle-plate';

describe('vehicle plate', () => {
  it('normalises to uppercase without spaces and hyphens', () => {
    expect(normalizePlate(' ab-45 6cd ')).toBe('AB456CD');
  });

  it.each([
    ['two characters', 'ab', true],
    ['ten characters', 'abcdefghij', true],
    ['spaces and hyphens around valid characters', 'ab 456-cd', true],
    ['one character', 'a', false],
    ['eleven characters', 'abcdefghijk', false],
    ['an empty value', '', false],
    ['only spaces', '   ', false],
    ['a punctuation mark', 'AB.456', false],
    ['an accented letter', 'ÀB456', false],
    ['an eszett that uppercases to SS', 'ßß456', false],
    ['a dotless i that uppercases to I', 'AB45ı', false],
    ['a final newline', 'AB456CD\n', false],
    ['a tab inside', 'AB\t456', false],
  ])('%s: valid is %s', (_name, text, valid) => {
    expect(isValidPlate(text as string)).toBe(valid);
  });
});
