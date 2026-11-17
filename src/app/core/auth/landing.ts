import type { CurrentUser } from './auth-api';

/** The address a signed-in user of the given role starts from; an unexpected role goes to the login. */
export function landingPath(role: CurrentUser['role']): string {
  switch (role) {
    case 'Admin':
      return '/users';
    case 'BackOffice':
      return '/vehicles';
    default:
      return '/login';
  }
}
