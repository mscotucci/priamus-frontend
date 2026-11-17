import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, fieldErrors, isStale, noticeOf, toApiError } from './api-error';

describe('isStale', () => {
  it('is true for a domain error with status 409', () => {
    expect(isStale({ kind: 'domain', status: 409, errorCode: 'X', detail: null })).toBe(true);
  });

  it.each([
    [
      'a domain error with another status',
      { kind: 'domain', status: 404, errorCode: 'X', detail: null },
    ],
    ['a validation error', { kind: 'validation', errors: {} }],
    ['a generic error', { kind: 'generic' }],
  ] as const)('is false for %s', (_name, error) => {
    expect(isStale(error)).toBe(false);
  });
});

describe('toApiError', () => {
  it('maps a 401 with an errorCode to a domain error carrying its detail', () => {
    const response = new HttpErrorResponse({
      status: 401,
      error: {
        errorCode: 'Identity.RefreshToken.Expired',
        detail: 'Sessione scaduta.',
        errorType: 'Unauthorized',
      },
    });

    expect(toApiError(response)).toEqual({
      kind: 'domain',
      status: 401,
      errorCode: 'Identity.RefreshToken.Expired',
      detail: 'Sessione scaduta.',
    });
  });

  it('maps a 400 with errors to a validation error', () => {
    const response = new HttpErrorResponse({
      status: 400,
      error: { errors: { Username: ['Obbligatorio'], Password: ['Troppo corta', 'Senza cifre'] } },
    });

    expect(toApiError(response)).toEqual({
      kind: 'validation',
      errors: { Username: ['Obbligatorio'], Password: ['Troppo corta', 'Senza cifre'] },
    });
  });

  it.each([
    [
      'status 0 with a network error',
      new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }),
    ],
    [
      'a 500 with a non-JSON body',
      new HttpErrorResponse({ status: 500, error: '<html>boom</html>' }),
    ],
    ['a 401 with an empty body', new HttpErrorResponse({ status: 401, error: null })],
  ])('maps %s to a generic error', (_name, response) => {
    expect(toApiError(response)).toEqual({ kind: 'generic' });
  });
});

describe('toApiError with a value that is not an HttpErrorResponse', () => {
  it.each([
    ['an Error', new Error('boom')],
    ['undefined', undefined],
    ['a string', 'boom'],
  ])('maps %s to a generic error', (_name, value) => {
    expect(toApiError(value)).toEqual({ kind: 'generic' });
  });
});

describe('noticeOf', () => {
  it('shows the detail of a domain error that has one', () => {
    expect(
      noticeOf({ kind: 'domain', status: 409, errorCode: 'X', detail: 'Nome già usato.' }),
    ).toEqual({
      detail: 'Nome già usato.',
    });
  });

  it.each([
    [
      'a domain error without detail',
      { kind: 'domain', status: 409, errorCode: 'X', detail: null },
    ],
    ['a validation error', { kind: 'validation', errors: {} }],
    ['a generic error', { kind: 'generic' }],
  ] as const)('shows the generic key for %s', (_name, error) => {
    expect(noticeOf(error)).toEqual({ key: 'errors.generic' });
  });

  it('shows the given fallback key instead of the generic one', () => {
    expect(noticeOf({ kind: 'generic' }, 'session.expired')).toEqual({ key: 'session.expired' });
  });
});

describe('fieldErrors', () => {
  const refusal: ApiError = {
    kind: 'validation',
    errors: { LicensePlate: ['Targa non valida.', 'Troppo corta.'], Type: ['Obbligatorio.'] },
  };

  it('returns the messages of the field, matching the name ignoring case', () => {
    expect(fieldErrors(refusal, 'licensePlate')).toEqual(['Targa non valida.', 'Troppo corta.']);
    expect(fieldErrors(refusal, 'type')).toEqual(['Obbligatorio.']);
  });

  it('returns nothing for a field the refusal does not name', () => {
    expect(fieldErrors(refusal, 'description')).toEqual([]);
  });

  it.each([
    ['a domain error', { kind: 'domain', status: 409, errorCode: 'X', detail: 'x' }],
    ['a generic error', { kind: 'generic' }],
  ] as const)('returns nothing for %s', (_name, error) => {
    expect(fieldErrors(error, 'type')).toEqual([]);
  });
});
