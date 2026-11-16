import { TestBed } from '@angular/core/testing';
import { Toast } from './toast';
import { ToastRegion } from './toast-region';

function render() {
  const toast = TestBed.inject(Toast);
  const fixture = TestBed.createComponent(ToastRegion);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const shown = () => {
    fixture.detectChanges();
    return element.querySelector('.pt-toast')?.textContent?.trim() ?? null;
  };
  return { toast, element, shown };
}

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the text, announced politely, and removes it after 4 seconds', () => {
    const { toast, element, shown } = render();
    expect(shown()).toBeNull();

    toast.success('Utente a.rossetti disabilitato');

    expect(shown()).toBe('Utente a.rossetti disabilitato');
    expect(element.querySelector('[aria-live="polite"][role="status"]')).not.toBeNull();

    vi.advanceTimersByTime(3999);
    expect(shown()).toBe('Utente a.rossetti disabilitato');

    vi.advanceTimersByTime(1);
    expect(shown()).toBeNull();
  });

  it('has no close button', () => {
    const { toast, element, shown } = render();

    toast.success('Fatto');
    shown();

    expect(element.querySelector('button')).toBeNull();
  });

  it('replaces the showing toast, which gets its own 4 seconds', () => {
    const { toast, shown } = render();

    toast.success('Primo');
    vi.advanceTimersByTime(3000);
    toast.success('Secondo');

    expect(shown()).toBe('Secondo');

    vi.advanceTimersByTime(3999);
    expect(shown()).toBe('Secondo');

    vi.advanceTimersByTime(1);
    expect(shown()).toBeNull();
  });
});
