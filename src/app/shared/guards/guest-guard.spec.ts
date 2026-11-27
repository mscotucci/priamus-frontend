import { CurrentUser } from '../../core/auth/auth-api';
import { userWithRole } from '../../core/testing/dom-testing';
import { guestGuard } from './guest-guard';
import { Page, guardSetup } from './guard-testing';

const setup = guardSetup([
  { path: 'login', component: Page, canActivate: [guestGuard] },
  { path: 'users', component: Page },
  { path: 'customers', component: Page },
  { path: 'driver', component: Page },
]);

describe('guestGuard', () => {
  it.each<[CurrentUser['role'], string]>([
    ['Admin', '/users'],
    ['BackOffice', '/customers'],
    ['Driver', '/driver'],
  ])('sends a signed-in %s opening the login to %s', async (role, landing) => {
    const router = setup(userWithRole(role));

    await router.navigateByUrl('/login');

    expect(router.url).toBe(landing);
  });

  it('lets a signed-in user of an unexpected role, whose landing page is the login itself, open the login', async () => {
    const router = setup({ ...userWithRole('Admin'), role: 'Unknown' as CurrentUser['role'] });

    await router.navigateByUrl('/login');

    expect(router.url).toBe('/login');
  });

  it('lets nobody signed in open the login', async () => {
    const router = setup(null);

    await router.navigateByUrl('/login');

    expect(router.url).toBe('/login');
  });

  it('decides only after the session has is ready', async () => {
    let release!: () => void;
    const router = setup(
      userWithRole('Admin'),
      new Promise<void>((resolve) => (release = resolve)),
    );

    const navigation = router.navigateByUrl('/login');
    await Promise.resolve();
    await Promise.resolve();

    expect(router.url).toBe('/');

    release();
    await navigation;

    expect(router.url).toBe('/users');
  });
});
