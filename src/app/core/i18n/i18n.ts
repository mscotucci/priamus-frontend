import { EnvironmentProviders, inject, provideAppInitializer, Provider } from '@angular/core';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';

export const LANGUAGE = 'it';

export function provideI18n(): (Provider | EnvironmentProviders)[] {
  return [
    provideTranslateService({ lang: LANGUAGE, fallbackLang: LANGUAGE }),
    provideTranslateHttpLoader({
      prefix: '/i18n/',
      suffix: '.json',
      failOnError: true,
      useHttpBackend: true,
    }),
    provideAppInitializer(() => firstValueFrom(inject(TranslateService).use(LANGUAGE))),
  ];
}
