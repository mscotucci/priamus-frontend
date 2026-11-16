import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { Session } from './session';

const ANONYMOUS_URLS = ['/api/identity/auth/login', '/api/identity/auth/refresh'];

function withToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/') || ANONYMOUS_URLS.includes(request.url)) {
    return next(request);
  }
  const session = inject(Session);
  if (session.closedElsewhere()) {
    session.endElsewhere();
    return throwError(() => new HttpErrorResponse({ status: 401, url: request.url }));
  }
  const token = session.accessToken();
  if (token === null) {
    return next(request);
  }
  return next(withToken(request, token)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return from(session.renew()).pipe(switchMap((fresh) => next(withToken(request, fresh))));
    }),
  );
};
