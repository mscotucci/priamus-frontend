import { HttpErrorResponse } from '@angular/common/http';

export type ApiError =
  | { kind: 'domain'; errorCode: string; detail: string | null }
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
