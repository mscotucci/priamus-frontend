import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { landingPath } from '../../core/auth/landing';
import { Session } from '../../core/auth/session';
import { toLogin } from './auth-guard';

export const landingGuard: CanActivateFn = async (_route, state) => {
  const session = inject(Session);
  const router = inject(Router);
  await session.wait();
  const user = session.user();
  return user === null ? toLogin(router, state.url) : router.parseUrl(landingPath(user.role));
};
