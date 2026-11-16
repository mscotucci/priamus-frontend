import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { landingPath } from '../../core/auth/landing';
import type { CurrentUser } from '../../core/auth/auth-api';
import { Session } from '../../core/auth/session';
import { toLogin } from './auth-guard';

export function roleGuard(...allowed: CurrentUser['role'][]): CanActivateFn {
  return async (_route, state) => {
    const session = inject(Session);
    const router = inject(Router);
    await session.wait();
    const user = session.user();
    if (user === null) {
      return toLogin(router, state.url);
    }
    if (allowed.includes(user.role)) {
      return true;
    }
    return router.parseUrl(landingPath(user.role));
  };
}
