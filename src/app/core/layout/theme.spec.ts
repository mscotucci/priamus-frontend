import { EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTheme } from './theme';

type Listener = (event: { matches: boolean }) => void;

function stubMatchMedia(dark: boolean) {
  const listeners: Listener[] = [];
  window.matchMedia = vi.fn(() => ({
    matches: dark,
    addEventListener: (_: string, listener: Listener) => listeners.push(listener),
  })) as unknown as typeof window.matchMedia;
  return (matches: boolean) => listeners.forEach((listener) => listener({ matches }));
}

function startTheme() {
  TestBed.configureTestingModule({ providers: [provideTheme()] });
  TestBed.inject(EnvironmentInjector);
}

describe('provideTheme', () => {
  afterEach(() => document.documentElement.removeAttribute('data-theme'));

  it('sets the dark theme when the system prefers dark', () => {
    stubMatchMedia(true);
    startTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('sets the light theme when the system prefers light', () => {
    stubMatchMedia(false);
    startTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('follows the system preference when it changes', () => {
    const change = stubMatchMedia(false);
    startTheme();

    change(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    change(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
