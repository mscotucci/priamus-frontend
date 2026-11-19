const USERNAME = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const LETTER = /[a-zA-Z]/;
const DIGIT = /[0-9]/;
const SPECIAL = /[!-/:-@[-`{-~]/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

export const isValidUsername = (username: string): boolean => USERNAME.test(username);

export const isValidPassword = (password: string): boolean =>
  password.length >= MIN_PASSWORD &&
  password.length <= MAX_PASSWORD &&
  LETTER.test(password) &&
  DIGIT.test(password) &&
  SPECIAL.test(password);
