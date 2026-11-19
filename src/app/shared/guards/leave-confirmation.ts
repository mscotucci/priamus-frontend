import { Injectable } from '@angular/core';
import type { LeaveConfirmable } from './unsaved-changes-guard';

/**
 * Lets code outside the router (the sign-out button) ask the open page whether the user may
 * leave it: a page registers itself for its lifetime, `confirm()` delegates to it.
 */
@Injectable({ providedIn: 'root' })
export class LeaveConfirmation {
  private page: LeaveConfirmable | null = null;

  /** Registers the page; the returned function unregisters it. */
  register(page: LeaveConfirmable): () => void {
    this.page = page;
    return () => {
      if (this.page === page) {
        this.page = null;
      }
    };
  }

  /** True when nothing is registered, else the registered page's answer. */
  confirm(): Promise<boolean> {
    return this.page === null ? Promise.resolve(true) : this.page.confirmLeave();
  }
}
