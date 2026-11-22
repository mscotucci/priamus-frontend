import { CurrentUser } from '../auth/auth-api';

/** jsdom does not implement the modal dialog. */
export function stubModalDialog(): void {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

/** jsdom does not lay anything out: it has no scrolling. */
export function stubScrollIntoView(onScroll: (element: Element) => void = () => undefined): void {
  Element.prototype.scrollIntoView = function (this: Element) {
    onScroll(this);
  };
}

/** jsdom has no popover API: the native methods are stood in for, the component is not changed. */
export function stubPopover(onHide: () => void = () => undefined): void {
  HTMLElement.prototype.hidePopover = onHide;
  HTMLElement.prototype.showPopover = () => undefined;
}

const USER_NAMES: Record<CurrentUser['role'], string> = {
  Admin: 'admin',
  BackOffice: 'm.rossi',
  Driver: 'dan',
};

/** A current user of the given role. */
export function userWithRole(role: CurrentUser['role'], id = '1'): CurrentUser {
  return { id, username: USER_NAMES[role], role, driverId: null };
}
