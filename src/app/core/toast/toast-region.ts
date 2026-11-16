import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '../../shared/components/icon/icon';
import { Toast } from './toast';

@Component({
  selector: 'app-toast-region',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pt-toast-region" role="status" aria-live="polite">
      @if (toast.current(); as text) {
        <div class="pt-toast"><app-icon name="check" />{{ text }}</div>
      }
    </div>
  `,
})
export class ToastRegion {
  protected readonly toast = inject(Toast);
}
