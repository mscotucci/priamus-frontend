import { ComponentFixture, TestBed } from '@angular/core/testing';

/**
 * Lets pending promises and timers run, then renders. `whenStable` would wait for the list
 * request the facade makes after a write. Without a fixture only the pending work runs.
 */
export async function settle(fixture?: ComponentFixture<unknown>): Promise<void> {
  fixture?.detectChanges();
  await new Promise<void>((resolve) => setTimeout(resolve));
  TestBed.tick();
  fixture?.detectChanges();
}

/** Clicks the dialog's action button at `index`, then settles. */
export async function press(fixture: ComponentFixture<unknown>, index: number): Promise<void> {
  const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
    '.pt-dialog__actions button',
  );
  buttons[index].click();
  await settle(fixture);
}
