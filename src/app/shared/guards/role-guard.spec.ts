import { userWithRole } from '../../core/testing/dom-testing';
import { roleGuard } from './role-guard';
import { Page, guardSetup } from './guard-testing';

const setup = guardSetup([
  { path: 'login', component: Page },
  { path: 'home', component: Page },
  { path: 'users', component: Page, canActivate: [roleGuard('Admin')] },
]);

describe('roleGuard', () => {
  it('sends a BackOffice user opening an Admin-only route to /home', async () => {
    const router = setup(userWithRole('BackOffice'));

    await router.navigateByUrl('/users');

    expect(router.url).toBe('/home');
  });

  it('lets an allowed role through', async () => {
    const router = setup(userWithRole('Admin'));

    await router.navigateByUrl('/users');

    expect(router.url).toBe('/users');
  });

  it('sends nobody signed in to the login with the requested address as returnUrl', async () => {
    const router = setup(null);

    await router.navigateByUrl('/users');

    expect(router.url).toBe('/login?returnUrl=%2Fusers');
  });

  it('decides only after the session has is ready', async () => {
    let release!: () => void;
    const router = setup(
      userWithRole('BackOffice'),
      new Promise<void>((resolve) => (release = resolve)),
    );

    const navigation = router.navigateByUrl('/users');
    await Promise.resolve();
    await Promise.resolve();

    expect(router.url).toBe('/');

    release();
    await navigation;

    expect(router.url).toBe('/home');
  });
});
