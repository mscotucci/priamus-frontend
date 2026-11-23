import { TestBed } from '@angular/core/testing';
import { Gallery } from './gallery';

describe('Gallery', () => {
  afterEach(() => {
    document.documentElement.dataset['theme'] = 'light';
  });

  it('shows the wide dialog beside the standard ones', async () => {
    const fixture = TestBed.createComponent(Gallery);
    await fixture.whenStable();

    const wide = (fixture.nativeElement as HTMLElement).querySelector('.pt-dialog.pt-dialog--lg');

    expect(wide).not.toBeNull();
    expect(wide!.querySelector('.pt-title')?.textContent?.trim()).toBe('Nuova tariffa');
  });

  it('switches the theme of the document between light and dark', async () => {
    document.documentElement.dataset['theme'] = 'light';
    const fixture = TestBed.createComponent(Gallery);
    await fixture.whenStable();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector('header button')!;

    (toggle as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(toggle.textContent).toContain('Tema chiaro');

    (toggle as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
