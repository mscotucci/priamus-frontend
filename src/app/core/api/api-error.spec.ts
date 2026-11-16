import { HttpErrorResponse } from '@angular/common/http';
import { noticeOf, toApiError } from './api-error';

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
    expect(noticeOf({ kind: 'domain', errorCode: 'X', detail: 'Nome già usato.' })).toEqual({
      detail: 'Nome già usato.',
    });
  });

  it.each([
    ['a domain error without detail', { kind: 'domain', errorCode: 'X', detail: null }],
    ['a validation error', { kind: 'validation', errors: {} }],
    ['a generic error', { kind: 'generic' }],
  ] as const)('shows the generic key for %s', (_name, error) => {
    expect(noticeOf(error)).toEqual({ key: 'errors.generic' });
  });

  it('shows the given fallback key instead of the generic one', () => {
    expect(noticeOf({ kind: 'generic' }, 'session.expired')).toEqual({ key: 'session.expired' });
  });
});
