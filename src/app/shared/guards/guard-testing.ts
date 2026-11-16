import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { CurrentUser } from '../../core/auth/auth-api';
import { Session } from '../../core/auth/session';

@Component({ template: '' })
export class Page {}

/**
 * A `setup(user, wait)` for the given routes: the session is `ready` once `wait` resolves and
 * has `user` as the current user. It returns the router.
 */
export function guardSetup(routes: Routes) {
  return (user: CurrentUser | null, wait: Promise<void> = Promise.resolve()) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: Session, useValue: { wait: () => wait, user: signal(user).asReadonly() } },
      ],
    });
    return TestBed.inject(Router);
  };
}
