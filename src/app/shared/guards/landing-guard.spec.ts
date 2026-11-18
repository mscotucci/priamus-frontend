import { CurrentUser } from '../../core/auth/auth-api';
import { userWithRole } from '../../core/testing/dom-testing';
import { landingGuard } from './landing-guard';
import { Page, guardSetup } from './guard-testing';

const setup = guardSetup([
  { path: 'login', component: Page },
  { path: 'users', component: Page },
  { path: 'customers', component: Page },
  { path: '', pathMatch: 'full', canActivate: [landingGuard], children: [] },
]);

describe('landingGuard', () => {
  it.each<[CurrentUser['role'], string]>([
    ['Admin', '/users'],
    ['BackOffice', '/customers'],
  ])('sends a signed-in %s from the root to %s', async (role, landing) => {
    const router = setup(userWithRole(role));

    await router.navigateByUrl('/');

    expect(router.url).toBe(landing);
  });

  it('ends a signed-in Driver, who has no landing page, on the login from the root', async () => {
    const router = setup(userWithRole('Driver'));

    await router.navigateByUrl('/');

    expect(router.url).toBe('/login');
  });

  it('sends nobody signed in from the root to the login with the root as returnUrl', async () => {
    const router = setup(null);

    await router.navigateByUrl('/');

    expect(router.url).toBe('/login?returnUrl=%2F');
  });

  it('does not leave the root before the session is ready', async () => {
    let release!: () => void;
    const router = setup(
      userWithRole('Admin'),
      new Promise<void>((resolve) => (release = resolve)),
    );

    const navigation = router.navigateByUrl('/');
    await Promise.resolve();
    await Promise.resolve();

    expect(router.url).toBe('/');

    release();
    await navigation;

    expect(router.url).toBe('/users');
  });
});
