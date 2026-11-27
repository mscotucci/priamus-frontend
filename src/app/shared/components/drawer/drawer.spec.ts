import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../core/i18n/i18n-testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { Drawer } from './drawer';

@Component({
  imports: [Drawer],
  template: `
    <main>
      @if (showOpener()) {
        <button type="button" class="opener" (click)="open.set(true)">Apri</button>
      }
    </main>
    @if (open()) {
      <app-drawer eyebrow="Dettaglio viaggio" title="Viaggio n. 1250" (closeRequested)="close()">
        <p class="body">Corpo</p>
      </app-drawer>
    }
  `,
})
class Host {
  readonly open = signal(true);
  readonly showOpener = signal(true);
  closed = 0;
  close(): void {
    this.closed += 1;
  }
}

function render() {
  stubModalDialog();
  TestBed.configureTestingModule({ providers: [provideTestI18n()] });
  const fixture = TestBed.createComponent(Host);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const dialog = element.querySelector('dialog')!;
  return { fixture, element, dialog };
}

describe('Drawer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens as a modal with its eyebrow, its title and its content, and no foot', () => {
    const { element, dialog } = render();

    expect(dialog.open).toBe(true);
    expect(element.querySelector('.pt-drawer__head .pt-label')?.textContent).toBe(
      'Dettaglio viaggio',
    );
    expect(element.querySelector('.pt-drawer__head .pt-title')?.textContent).toBe(
      'Viaggio n. 1250',
    );
    expect(element.querySelector('.pt-drawer__body .body')?.textContent).toBe('Corpo');
    expect(element.querySelector('.pt-drawer__foot')).toBeNull();
  });

  it('is labelled by its title', () => {
    const { dialog } = render();

    const title = dialog.querySelector('.pt-title')!;
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.id).not.toBe('');
  });

  it('asks to close with its X, labelled "Chiudi"', () => {
    const { fixture, element } = render();
    const close = element.querySelector<HTMLButtonElement>('.pt-drawer__head button')!;

    close.click();

    expect(close.getAttribute('aria-label')).toBe('Chiudi');
    expect(fixture.componentInstance.closed).toBe(1);
  });

  it('asks to close on Escape and leaves the closing to the caller', () => {
    const { fixture, dialog } = render();
    const event = new Event('cancel', { cancelable: true });

    dialog.dispatchEvent(event);

    expect(fixture.componentInstance.closed).toBe(1);
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(true);
  });

  it('asks to close on a click on the backdrop, not on a click inside', () => {
    const { fixture, element, dialog } = render();

    element.querySelector<HTMLElement>('.body')!.click();
    expect(fixture.componentInstance.closed).toBe(0);

    dialog.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance.closed).toBe(1);
  });

  it('stays open when a text selection dragged out of the content ends on the backdrop', () => {
    const { fixture, element, dialog } = render();

    element.querySelector<HTMLElement>('.body')!.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(fixture.componentInstance.closed).toBe(0);
  });

  it('gives the focus back to the control that opened it', () => {
    stubModalDialog();
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.open.set(false);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const opener = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.opener',
    )!;
    opener.focus();
    opener.click();
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.pt-drawer__head button')!
      .focus();

    fixture.componentInstance.open.set(false);
    fixture.detectChanges();

    expect(document.activeElement).toBe(opener);
  });

  it('gives the focus to the main area when the control that opened it left the page', () => {
    stubModalDialog();
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.open.set(false);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const opener = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.opener',
    )!;
    opener.focus();
    opener.click();
    fixture.detectChanges();

    fixture.componentInstance.showOpener.set(false);
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();

    const main = (fixture.nativeElement as HTMLElement).querySelector('main')!;
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute('tabindex')).toBe('-1');
  });
});
