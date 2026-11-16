import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NoticeContent } from '../../../core/api/api-error';

@Component({
  selector: 'app-notice',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pt-notice pt-notice--danger', role: 'alert' },
  template: `
    @let content = notice();
    @if ('detail' in content) {
      {{ content.detail }}
    } @else {
      {{ content.key | translate }}
    }
    <ng-content />
  `,
})
export class Notice {
  readonly notice = input.required<NoticeContent>();
}
