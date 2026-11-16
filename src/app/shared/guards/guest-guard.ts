import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { landingPath } from '../../core/auth/landing';
import { Session } from '../../core/auth/session';

export const guestGuard: CanActivateFn = async () => {
  const session = inject(Session);
  const router = inject(Router);
  await session.wait();
  const user = session.user();
  if (user === null) {
    return true;
  }
  const landing = landingPath(user.role);
  // a role whose landing page is the login itself has nowhere else to go
  return landing === '/login' ? true : router.parseUrl(landing);
};
