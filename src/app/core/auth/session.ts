import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NoticeContent, noticeOf, toApiError } from '../api/api-error';
import { AuthApi, CurrentUser, Tokens } from './auth-api';

export type SessionStatus = 'starting' | 'ready' | 'unreachable';

const REFRESH_TOKEN_KEY = 'priamus.refresh-token';
const EXPIRED_NOTICE_KEY = 'session.expired';
const CONCURRENT_REFRESH_WAIT_MS = 300;

function isRefused(error: unknown): error is HttpErrorResponse {
  return (
    error instanceof HttpErrorResponse &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}

@Injectable({ providedIn: 'root' })
export class Session {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  private readonly statusState = signal<SessionStatus>('starting');
  private readonly userState = signal<CurrentUser | null>(null);
  private readonly noticeState = signal<NoticeContent | null>(null);
  private accessTokenInMemory: string | null = null;
  private refreshing: Promise<string> | null = null;
  private markSettled!: () => void;
  private readonly settled = new Promise<void>((resolve) => {
    this.markSettled = resolve;
  });

  readonly status = this.statusState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly notice = this.noticeState.asReadonly();

  /** Resolves once the status first becomes `ready`; it stays pending while the status is `unreachable`. */
  wait(): Promise<void> {
    return this.settled;
  }

  async start(): Promise<void> {
    this.statusState.set('starting');
    const stored = this.storedToken();
    if (stored === null) {
      this.settle('ready');
      return;
    }
    try {
      await this.refresh(stored);
      this.userState.set(await firstValueFrom(this.api.me()));
      this.settle('ready');
    } catch (error) {
      if (isRefused(error)) {
        this.expire(error);
        this.settle('ready');
      } else {
        this.settle('unreachable');
      }
    }
  }

  retry(): Promise<void> {
    return this.start();
  }

  async signIn(username: string, password: string): Promise<CurrentUser> {
    let storedHere = false;
    try {
      this.store(await firstValueFrom(this.api.login({ username, password })));
      storedHere = true;
      const user = await firstValueFrom(this.api.me());
      this.userState.set(user);
      this.noticeState.set(null);
      this.statusState.set('ready');
      return user;
    } catch (error) {
      if (storedHere) {
        this.clear();
      } else {
        this.clearMemory();
      }
      throw toApiError(error);
    }
  }

  async signOut(): Promise<void> {
    const sent = this.storedToken();
    if (sent !== null) {
      try {
        await firstValueFrom(this.api.revoke(sent));
      } catch {
        // the interceptor may have rotated the token before replaying the revoke with the old one
        const current = this.storedToken();
        if (current !== null && current !== sent) {
          try {
            await firstValueFrom(this.api.revoke(current));
          } catch {
            // the backend session stays open, the user is signed out here all the same
          }
        }
      }
    }
    this.clear();
    this.noticeState.set(null);
    await this.router.navigate(['/login']);
  }

  accessToken(): string | null {
    return this.accessTokenInMemory;
  }

  /** True when a user is signed in here but the refresh token is gone: another tab signed out. */
  closedElsewhere(): boolean {
    return this.userState() !== null && this.storedToken() === null;
  }

  endElsewhere(): void {
    this.clear();
    this.noticeState.set(null);
    void this.goToLogin();
  }

  /** Renews the session for a caller holding an expired access token; resolves with the new one. */
  async renew(): Promise<string> {
    const stored = this.storedToken();
    if (stored === null) {
      if (this.userState() !== null) {
        this.endElsewhere();
      }
      throw new HttpErrorResponse({ status: 401 });
    }
    try {
      return await this.refresh(stored);
    } catch (error) {
      if (isRefused(error)) {
        this.expire(error);
      }
      throw error;
    }
  }

  private refresh(sent: string): Promise<string> {
    return (this.refreshing ??= this.runRefresh(sent).finally(() => {
      this.refreshing = null;
    }));
  }

  private async runRefresh(sent: string): Promise<string> {
    try {
      return this.store(await firstValueFrom(this.api.refresh(sent)));
    } catch (error) {
      let stored = this.storedToken();
      if (error instanceof HttpErrorResponse && error.status === 409 && stored === sent) {
        // the other tab may not have written its new token yet
        await new Promise((resolve) => setTimeout(resolve, CONCURRENT_REFRESH_WAIT_MS));
        stored = this.storedToken();
      }
      if (isRefused(error) && stored !== null && stored !== sent) {
        // another tab renewed first: repeat once with the token it stored
        return this.store(await firstValueFrom(this.api.refresh(stored)));
      }
      throw error;
    }
  }

  private expire(refusal: HttpErrorResponse): void {
    const inside = this.userState() !== null;
    this.clear();
    // a session the backend no longer knows has simply ended for the user: its own text
    // ("not found") would read as a fault
    this.noticeState.set(
      refusal.status === 404
        ? { key: EXPIRED_NOTICE_KEY }
        : noticeOf(toApiError(refusal), EXPIRED_NOTICE_KEY),
    );
    if (inside) {
      void this.goToLogin();
    }
  }

  private goToLogin(): Promise<boolean> {
    return this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  private store(tokens: Tokens): string {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.accessTokenInMemory = tokens.accessToken;
    return tokens.accessToken;
  }

  private storedToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private clear(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.clearMemory();
  }

  private clearMemory(): void {
    this.accessTokenInMemory = null;
    this.userState.set(null);
  }

  private settle(status: SessionStatus): void {
    this.statusState.set(status);
    if (status === 'ready') {
      this.markSettled();
    }
  }
}
