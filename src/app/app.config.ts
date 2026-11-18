import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeIt from '@angular/common/locales/it';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { authInterceptor } from './core/auth/auth-interceptor';
import { Session } from './core/auth/session';
import { provideI18n } from './core/i18n/i18n';
import { provideTheme } from './core/layout/theme';
import { routes } from './app.routes';

registerLocaleData(localeIt);

/**
 * A navigation a page refuses (unsaved changes) puts the browser history back where it was; the
 * default would overwrite the entry the user stepped back to, and the next "Indietro" would skip it.
 */
export const historyKeptOnRefusal = withRouterConfig({ canceledNavigationResolution: 'computed' });

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, historyKeptOnRefusal),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideI18n(),
    provideTheme(),
    provideAppInitializer(() => {
      void inject(Session).start();
    }),
    { provide: LOCALE_ID, useValue: 'it' },
  ],
};
