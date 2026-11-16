import { Provider } from '@angular/core';
import {
  TranslateLoader,
  TranslationObject,
  provideTranslateLoader,
  provideTranslateService,
} from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import italian from '../../../../public/i18n/it.json';
import { LANGUAGE } from './i18n';

class ItalianFileLoader implements TranslateLoader {
  getTranslation(): Observable<TranslationObject> {
    return of(italian);
  }
}

export function provideTestI18n(): Provider[] {
  return [
    provideTranslateService({ lang: LANGUAGE, fallbackLang: LANGUAGE }),
    provideTranslateLoader(ItalianFileLoader),
  ];
}
