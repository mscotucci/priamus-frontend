import { CanDeactivateFn } from '@angular/router';

/** A page that can ask the user whether to leave it. */
export interface LeaveConfirmable {
  confirmLeave(): Promise<boolean>;
}

const LOGIN_URL = /^\/login(?:[?#]|$)/;

/** Leaving asks the page to confirm; going to the login (session expiry) is never asked about. */
export const unsavedChangesGuard: CanDeactivateFn<LeaveConfirmable> = (
  component,
  _route,
  _state,
  nextState,
) => (nextState !== undefined && LOGIN_URL.test(nextState.url) ? true : component.confirmLeave());
