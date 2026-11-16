import { userWithRole } from '../../core/testing/dom-testing';
import { authGuard } from './auth-guard';
import { Page, guardSetup } from './guard-testing';

const admin = userWithRole('Admin');

const setup = guardSetup([
  { path: 'login', component: Page },
  { path: 'secret', component: Page, canActivate: [authGuard] },
]);

describe('authGuard', () => {
  it('sends nobody signed in to the login with the requested address as returnUrl', async () => {
    const router = setup(null);

    await router.navigateByUrl('/secret?x=1');

    expect(router.url).toBe('/login?returnUrl=%2Fsecret%3Fx%3D1');
  });

  it('lets a signed-in user through', async () => {
    const router = setup(admin);

    await router.navigateByUrl('/secret');

    expect(router.url).toBe('/secret');
  });

  it('shows no guarded page before the session has is ready', async () => {
    let release!: () => void;
    const router = setup(admin, new Promise<void>((resolve) => (release = resolve)));

    const navigation = router.navigateByUrl('/secret');
    await Promise.resolve();
    await Promise.resolve();

    expect(router.url).toBe('/');

    release();
    await navigation;

    expect(router.url).toBe('/secret');
  });
});
