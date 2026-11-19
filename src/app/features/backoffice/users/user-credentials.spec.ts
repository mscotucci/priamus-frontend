import { isValidPassword, isValidUsername } from './user-credentials';

describe('user credentials', () => {
  it.each([
    ['m.rossi', true],
    ['abc', true],
    ['0abc', true],
    ['a'.repeat(64), true],
    ['ab', false],
    ['a'.repeat(65), false],
    ['.abc', false],
    ['M.rossi', false],
    ['m rossi', false],
    ['', false],
  ])('user name "%s" is valid: %s', (username, valid) => {
    expect(isValidUsername(username)).toBe(valid);
  });

  it.each([
    ['Password1!', true],
    ['a1!aaaaa', true],
    ['a1!aaaa', false],
    ['Password!!', false],
    ['Password11', false],
    ['12345678!', false],
    [`a1!${'x'.repeat(125)}`, true],
    [`a1!${'x'.repeat(126)}`, false],
  ])('password "%s" is valid: %s', (password, valid) => {
    expect(isValidPassword(password)).toBe(valid);
  });
});
