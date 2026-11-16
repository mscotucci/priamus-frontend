import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Session } from './core/auth/session';
import { Startup } from './core/startup/startup';
import { ToastRegion } from './core/toast/toast-region';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Startup, ToastRegion],
  template: `
    @if (session.status() === 'ready') {
      <router-outlet />
    } @else {
      <app-startup />
    }
    <app-toast-region />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly session = inject(Session);
}
