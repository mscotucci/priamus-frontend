import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  ApiError,
  NoticeContent,
  fieldErrors,
  isStale,
  noticeOf,
} from '../../../core/api/api-error';
import { Topbar } from '../../../core/layout/topbar';
import { Notice } from '../../../shared/components/notice/notice';
import { NativeValue } from '../../../shared/directives/native-value';
import { SettingsFacade } from './settings-facade';

@Component({
  selector: 'app-settings-page',
  imports: [Topbar, TranslatePipe, Notice, NativeValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './settings-page.html',
})
export class SettingsPage {
  protected readonly facade = inject(SettingsFacade);

  // the drafts start from the saved band and are set again whenever the band is read again
  protected readonly start = linkedSignal(() => this.facade.band()?.start ?? '');
  protected readonly end = linkedSignal(() => this.facade.band()?.end ?? '');
  private readonly submitted = signal(false);
  private readonly refusal = signal<ApiError | null>(null);
  protected readonly notice = signal<NoticeContent | null>(null);

  protected readonly endEqualsStart = computed(
    () => this.submitted() && this.start() !== '' && this.start() === this.end(),
  );
  protected readonly startErrors = computed(() => this.errorsOf('start'));
  protected readonly endErrors = computed(() => this.errorsOf('end'));

  private errorsOf(field: string): string[] {
    const refusal = this.refusal();
    return refusal === null ? [] : fieldErrors(refusal, field);
  }

  protected edit(field: 'start' | 'end', value: string): void {
    (field === 'start' ? this.start : this.end).set(value);
    this.submitted.set(false);
  }

  protected async save(): Promise<void> {
    this.refusal.set(null);
    this.notice.set(null);
    this.submitted.set(true);
    if (this.start() !== '' && this.start() === this.end()) {
      return;
    }
    const outcome = await this.facade.saveNightBand(this.start(), this.end());
    if (outcome === 'saved' || outcome === 'ignored') {
      return;
    }
    if (isStale(outcome)) {
      this.notice.set({ key: 'settings.nightBand.stale' });
    } else if (outcome.kind === 'validation') {
      this.refusal.set(outcome);
    } else {
      this.notice.set(noticeOf(outcome));
    }
  }
}
