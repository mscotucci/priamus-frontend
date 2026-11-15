import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('App routes', () => {
  it('opens the design system gallery from the root', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });

    const harness = await RouterTestingHarness.create('/');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Design system');
  });
});
