import { TestBed } from '@angular/core/testing';
import { LeaveConfirmation } from './leave-confirmation';

describe('LeaveConfirmation', () => {
  const service = () => TestBed.inject(LeaveConfirmation);

  it('confirms at once when no page is registered', async () => {
    expect(await service().confirm()).toBe(true);
  });

  it('delegates to the registered page and returns its answer', async () => {
    const confirmLeave = vi.fn(() => Promise.resolve(false));
    service().register({ confirmLeave });

    expect(await service().confirm()).toBe(false);
    expect(confirmLeave).toHaveBeenCalledTimes(1);
  });

  it('confirms at once again after the page unregisters', async () => {
    const confirmLeave = vi.fn(() => Promise.resolve(false));
    const unregister = service().register({ confirmLeave });
    unregister();

    expect(await service().confirm()).toBe(true);
    expect(confirmLeave).not.toHaveBeenCalled();
  });

  it('a stale unregister does not remove the page that replaced it', async () => {
    const first = service().register({ confirmLeave: () => Promise.resolve(true) });
    const second = { confirmLeave: vi.fn(() => Promise.resolve(false)) };
    service().register(second);
    first();

    expect(await service().confirm()).toBe(false);
  });
});
