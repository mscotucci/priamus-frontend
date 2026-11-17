import { HttpErrorResponse } from '@angular/common/http';

export type ApiError =
  | { kind: 'domain'; status: number; errorCode: string; detail: string | null }
  | { kind: 'validation'; errors: Record<string, string[]> }
  | { kind: 'generic' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** What a refusal shows: the backend's `detail` as text, or a translation key. */
export type NoticeContent = { detail: string } | { key: string };

export function toApiError(response: unknown): ApiError {
  if (!(response instanceof HttpErrorResponse)) {
    return { kind: 'generic' };
  }
  const body: unknown = response.error;
  if (!isRecord(body)) {
    return { kind: 'generic' };
  }
  if (typeof body['errorCode'] === 'string') {
    return {
      kind: 'domain',
      status: response.status,
      errorCode: body['errorCode'],
      detail: typeof body['detail'] === 'string' ? body['detail'] : null,
    };
  }
  if (response.status === 400 && isRecord(body['errors'])) {
    const errors: Record<string, string[]> = {};
    for (const [field, messages] of Object.entries(body['errors'])) {
      errors[field] = Array.isArray(messages)
        ? messages.filter((message): message is string => typeof message === 'string')
        : [];
    }
    return { kind: 'validation', errors };
  }
  return { kind: 'generic' };
}

export function noticeOf(error: ApiError, fallbackKey = 'errors.generic'): NoticeContent {
  return error.kind === 'domain' && error.detail !== null
    ? { detail: error.detail }
    : { key: fallbackKey };
}

/** The backend's messages for one field of a validation refusal, the field name matched ignoring case. */
export function fieldErrors(error: ApiError, field: string): string[] {
  if (error.kind !== 'validation') {
    return [];
  }
  return Object.entries(error.errors)
    .filter(([name]) => name.toLowerCase() === field.toLowerCase())
    .flatMap(([, messages]) => messages);
}
