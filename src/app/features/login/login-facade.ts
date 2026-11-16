import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiError, NoticeContent, noticeOf } from '../../core/api/api-error';
import { CurrentUser } from '../../core/auth/auth-api';
import { landingPath } from '../../core/auth/landing';
import { Session } from '../../core/auth/session';

export type SignInOutcome = 'signed-in' | 'refused' | 'failed' | 'driver' | 'ignored';

const DRIVER_NOTICE: NoticeContent = { key: 'login.driver.unavailable' };

/** Only an address inside the application is honoured: not `https://…`, not `//host`. */
function isInAppPath(url: string | null): url is string {
  return url !== null && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\');
}

@Injectable()
export class LoginFacade {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly pendingState = signal(false);
  private readonly noticeState = signal<NoticeContent | null>(this.session.notice());

  readonly pending = this.pendingState.asReadonly();
  readonly notice = this.noticeState.asReadonly();

  async submit(username: string, password: string): Promise<SignInOutcome> {
    if (this.pendingState()) {
      return 'ignored';
    }
    this.noticeState.set(null);
    this.pendingState.set(true);
    try {
      let user: CurrentUser;
      try {
        user = await this.session.signIn(username, password);
      } catch (error) {
        const notice = noticeOf(error as ApiError);
        this.noticeState.set(notice);
        return 'detail' in notice ? 'refused' : 'failed';
      }
      if (user.role === 'Driver') {
        await this.session.signOut();
        this.noticeState.set(DRIVER_NOTICE);
        return 'driver';
      }
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(isInAppPath(returnUrl) ? returnUrl : landingPath(user.role));
      return 'signed-in';
    } finally {
      this.pendingState.set(false);
    }
  }
}
