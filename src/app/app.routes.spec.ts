import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Route, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { routes } from './app.routes';
import { userWithRole } from './core/testing/dom-testing';
import { guardSetup } from './shared/guards/guard-testing';

const tripsRoute = (): Route =>
  routes.flatMap((route) => route.children ?? []).find((route) => route.path === 'trips')!;

describe('the trips route', () => {
  const setup = guardSetup([]);

  const decide = async (role: 'Driver' | 'BackOffice' | 'Admin') => {
    setup(userWithRole(role));
    const guard = tripsRoute().canActivate![0] as CanActivateFn;
    return TestBed.runInInjectionContext(() =>
      guard({} as never, { url: '/trips' } as RouterStateSnapshot),
    );
  };

  it('refuses a Driver, sending him to his own area', async () => {
    const result = await decide('Driver');

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/driver');
  });

  it.each(['BackOffice', 'Admin'] as const)('lets a %s user through', async (role) => {
    expect(await decide(role)).toBe(true);
  });
});

const driverRoute = (): Route => routes.find((route) => route.path === 'driver')!;

describe('the driver area, which holds "I miei viaggi"', () => {
  const setup = guardSetup([]);

  // Runs every guard of the driver route, as the router does, and returns the first refusal.
  const decide = async (role: 'Driver' | 'BackOffice' | 'Admin') => {
    setup(userWithRole(role));
    for (const entry of driverRoute().canActivate!) {
      const result = await TestBed.runInInjectionContext(() =>
        (entry as CanActivateFn)({} as never, { url: '/driver/my-trips' } as RouterStateSnapshot),
      );
      if (result !== true) {
        return result;
      }
    }
    return true;
  };

  it('lets a Driver through to /driver/my-trips', async () => {
    expect(await decide('Driver')).toBe(true);
  });

  it.each(['BackOffice', 'Admin'] as const)('refuses a %s user', async (role) => {
    const result = await decide(role);

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).not.toBe('/driver');
  });
});
