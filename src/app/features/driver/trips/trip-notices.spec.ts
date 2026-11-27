import { ElementRef, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { stubScrollIntoView } from '../../../core/testing/dom-testing';
import { bringNoticeIntoView, outcomeNotice } from './trip-notices';
import type { ActOutcome } from './trips-facade';

describe('trip-notices', () => {
  describe('outcomeNotice', () => {
    it.each([
      [
        'a rule is the text of the server',
        { kind: 'rule', detail: 'Hai già un viaggio.', errorCode: 'x' },
        { detail: 'Hai già un viaggio.' },
      ],
      [
        'no answer from the server is the shared connection text',
        { kind: 'notReached' },
        { key: 'driver.notReached' },
      ],
      [
        'a failure is the text of the act',
        { kind: 'failed' },
        { key: 'driver.test.failed' },
      ],
      [
        'a stale answer is the text of the act',
        { kind: 'stale' },
        { key: 'driver.test.failed' },
      ],
      ['a done act tells nothing', { kind: 'done', trip: null }, null],
      ['an ignored act tells nothing', { kind: 'ignored' }, null],
    ] as [string, ActOutcome, unknown][])('%s', (_name, outcome, notice) => {
      expect(outcomeNotice(outcome, 'driver.test.failed')).toEqual(notice);
    });
  });

  describe('bringNoticeIntoView', () => {
    const hostWith = (html: string) => {
      const element = document.createElement('div');
      element.innerHTML = html;
      return new ElementRef(element);
    };

    it('scrolls the notice at the top of main into view after the next render', () => {
      const scrolled: Element[] = [];
      stubScrollIntoView((target) => scrolled.push(target));
      const host = hostWith('<main><app-notice></app-notice><p>x</p></main>');

      bringNoticeIntoView(host, TestBed.inject(Injector));
      expect(scrolled).toEqual([]);
      TestBed.tick();

      expect(scrolled).toEqual([host.nativeElement.querySelector('app-notice')]);
    });

    it('scrolls nothing when the page shows no notice', () => {
      const scrolled: Element[] = [];
      stubScrollIntoView((target) => scrolled.push(target));

      bringNoticeIntoView(hostWith('<main><p>x</p></main>'), TestBed.inject(Injector));
      TestBed.tick();

      expect(scrolled).toEqual([]);
    });
  });
});
