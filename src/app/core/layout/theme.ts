import { DOCUMENT } from '@angular/common';
import { EnvironmentProviders, inject, provideEnvironmentInitializer } from '@angular/core';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Sets `data-theme` on the root element from the operating system's preference and follows its changes. */
export function provideTheme(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const doc = inject(DOCUMENT);
    const query = doc.defaultView!.matchMedia(DARK_QUERY);
    const apply = (dark: boolean) =>
      doc.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    apply(query.matches);
    query.addEventListener('change', (event) => apply(event.matches));
  });
}
