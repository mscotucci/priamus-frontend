import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { stubModalDialog } from '../../../core/testing/dom-testing';
import { Dialog } from './dialog';

@Component({
  imports: [Dialog],
  template: `
    <app-dialog
      icon="user-plus"
      tone="primary"
      title="Nuovo utente"
      line="Segreteria"
      [busy]="busy()"
      (closeRequested)="closed = closed + 1"
    >
      <p class="body">Corpo</p>
      <button actions type="button" class="action">Annulla</button>
    </app-dialog>
  `,
})
class Host {
  readonly busy = signal(false);
  closed = 0;
}

@Component({
  imports: [Dialog],
  template: `<app-dialog icon="truck" tone="primary" title="Modifica mezzo" code="CZ334KL" />`,
})
class HostWithCode {}

function render() {
  stubModalDialog();
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
  const cancel = () => {
    const event = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(event);
    return event;
  };
  return { fixture, dialog, cancel };
}

describe('Dialog', () => {
  it('opens as a modal and shows the head, the body and the actions', () => {
    const { dialog } = render();

    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('.pt-tile--primary svg')).not.toBeNull();
    expect(dialog.querySelector('.pt-title')?.textContent?.trim()).toBe('Nuovo utente');
    expect(dialog.querySelector('.pt-dialog__head .pt-muted')?.textContent).toBe('Segreteria');
    expect(dialog.querySelector('.body')?.textContent).toBe('Corpo');
    expect(dialog.querySelector('.pt-dialog__actions .action')).not.toBeNull();
  });

  it('is labelled by its title', () => {
    const { dialog } = render();

    const title = dialog.querySelector('.pt-title')!;
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.id).not.toBe('');
  });

  it('has no code in the title unless one is given', () => {
    const { dialog } = render();

    expect(dialog.querySelector('.pt-title .pt-mono')).toBeNull();
  });

  it('shows a given code after the title, in mono and inside the label', () => {
    stubModalDialog();
    const fixture = TestBed.createComponent(HostWithCode);
    fixture.detectChanges();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;

    const title = dialog.querySelector('.pt-title')!;
    expect(title.textContent?.replace(/\s+/g, ' ').trim()).toBe('Modifica mezzo CZ334KL');
    expect(title.querySelector('.pt-mono')?.textContent).toBe('CZ334KL');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
  });

  it('emits the close request on Escape and leaves the closing to the caller', () => {
    const { fixture, dialog, cancel } = render();

    const event = cancel();

    expect(fixture.componentInstance.closed).toBe(1);
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(true);
  });

  it('does nothing when the backdrop is clicked', () => {
    const { fixture, dialog } = render();

    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.closed).toBe(0);
    expect(dialog.open).toBe(true);
  });

  it('ignores Escape while busy', () => {
    const { fixture, dialog, cancel } = render();
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();

    const event = cancel();

    expect(fixture.componentInstance.closed).toBe(0);
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(true);
  });

  describe('focus', () => {
    @Component({
      imports: [Dialog],
      template: `
        <button type="button" class="opener" (click)="open.set(true)">Apri</button>
        @if (open()) {
          <app-dialog icon="user-x" tone="danger" title="Disabilitare?">
            <button actions type="button" class="inside">Annulla</button>
          </app-dialog>
        }
      `,
    })
    class OpenerHost {
      readonly open = signal(false);
    }

    function renderFromOpener() {
      stubModalDialog();
      const fixture = TestBed.createComponent(OpenerHost);
      fixture.autoDetectChanges();
      document.body.appendChild(fixture.nativeElement);
      const opener = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '.opener',
      )!;
      opener.focus();
      opener.click();
      fixture.detectChanges();
      return { fixture, opener };
    }

    it('gives the focus back to the control that opened it when it is removed', () => {
      const { fixture, opener } = renderFromOpener();
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.inside')!.focus();

      fixture.componentInstance.open.set(false);
      fixture.detectChanges();

      expect(document.activeElement).toBe(opener);
      fixture.nativeElement.remove();
    });

    it('leaves the focus alone when the opener is no longer on the page', () => {
      const { fixture, opener } = renderFromOpener();
      opener.remove();

      expect(() => {
        fixture.componentInstance.open.set(false);
        fixture.detectChanges();
      }).not.toThrow();
      expect(document.activeElement).not.toBe(opener);
      fixture.nativeElement.remove();
    });
  });

  describe('when the browser closes the native dialog by itself', () => {
    // jsdom may not fire the event that a browser fires after close()
    async function closeNatively(dialog: HTMLDialogElement) {
      let fired = false;
      dialog.addEventListener('close', () => (fired = true));
      dialog.close();
      await new Promise((resolve) => setTimeout(resolve));
      if (!fired) {
        dialog.dispatchEvent(new Event('close'));
      }
    }

    it('opens it again while busy, and emits nothing', async () => {
      const { fixture, dialog } = render();
      fixture.componentInstance.busy.set(true);
      fixture.detectChanges();

      await closeNatively(dialog);

      expect(dialog.open).toBe(true);
      expect(fixture.componentInstance.closed).toBe(0);
    });

    it('emits the close request once when not busy', async () => {
      const { fixture, dialog } = render();

      await closeNatively(dialog);

      expect(fixture.componentInstance.closed).toBe(1);
    });

    it('does nothing when the component is destroyed', async () => {
      const { fixture, dialog } = render();
      fixture.componentInstance.busy.set(true);
      fixture.detectChanges();

      fixture.destroy();
      await new Promise((resolve) => setTimeout(resolve));
      dialog.dispatchEvent(new Event('close'));

      expect(dialog.open).toBe(false);
      expect(fixture.componentInstance.closed).toBe(0);
    });
  });
});
