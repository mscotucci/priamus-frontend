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
import { provideRouter } from '@angular/router';
import { authInterceptor } from './core/auth/auth-interceptor';
import { Session } from './core/auth/session';
import { provideI18n } from './core/i18n/i18n';
import { provideTheme } from './core/layout/theme';
import { routes } from './app.routes';

registerLocaleData(localeIt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideI18n(),
    provideTheme(),
    provideAppInitializer(() => {
      void inject(Session).start();
    }),
    { provide: LOCALE_ID, useValue: 'it' },
  ],
};
