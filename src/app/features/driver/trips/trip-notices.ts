import { ElementRef, Injector, afterNextRender } from '@angular/core';
import { NoticeContent } from '../../../core/api/api-error';
import { ActOutcome } from './trips-facade';

/** After the next render, scrolls the notice at the top of the page's `main` into the middle of the screen. */
export function bringNoticeIntoView(host: ElementRef<HTMLElement>, injector: Injector): void {
  afterNextRender(
    {
      read: () =>
        host.nativeElement.querySelector('main > app-notice')?.scrollIntoView({ block: 'center' }),
    },
    { injector },
  );
}

/**
 * What an act that did not finish tells the driver: the server's text for a rule, the shared text when
 * the server could not be reached, `failedKey` for a failure or a stale answer; null for an act that is
 * done or ignored.
 */
export function outcomeNotice(outcome: ActOutcome, failedKey: string): NoticeContent | null {
  switch (outcome.kind) {
    case 'rule':
      return { detail: outcome.detail };
    case 'notReached':
      return { key: 'driver.notReached' };
    case 'failed':
    case 'stale':
      return { key: failedKey };
    default:
      return null;
  }
}
