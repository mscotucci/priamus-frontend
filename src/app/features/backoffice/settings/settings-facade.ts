import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ApiError, isStale, toApiError } from '../../../core/api/api-error';
import { Toast } from '../../../core/toast/toast';
import { NightBand, SettingsApi } from './settings-api';

export type SaveOutcome = 'saved' | 'ignored' | ApiError;

@Injectable()
export class SettingsFacade {
  private readonly api = inject(SettingsApi);
  private readonly toast = inject(Toast);
  private readonly translate = inject(TranslateService);

  private readonly bandResource = httpResource<NightBand>(() => this.api.nightBand());

  readonly band = computed<NightBand | null>(() =>
    this.bandResource.hasValue() ? this.bandResource.value() : null,
  );
  /** The band is read for the first time: nothing current to show. */
  readonly loading = computed(
    () =>
      this.bandResource.status() === 'loading' ||
      (this.bandResource.status() === 'reloading' && !this.bandResource.hasValue()),
  );
  readonly failed = computed(() => this.bandResource.status() === 'error');

  private readonly savingState = signal(false);
  readonly saving = this.savingState.asReadonly();

  reload(): void {
    this.bandResource.reload();
  }

  /** Saves the band, sending the version it was read at; a stale version reads the band again. */
  async saveNightBand(start: string, end: string): Promise<SaveOutcome> {
    const band = this.band();
    if (band === null || this.savingState()) {
      return 'ignored';
    }
    if (start === band.start && end === band.end) {
      this.toast.success(this.translate.instant('settings.nightBand.done'));
      return 'saved';
    }
    this.savingState.set(true);
    try {
      try {
        await firstValueFrom(this.api.updateNightBand({ start, end, version: band.version }));
      } catch (error) {
        const apiError = toApiError(error);
        if (isStale(apiError)) {
          this.reload();
        }
        return apiError;
      }
      this.toast.success(this.translate.instant('settings.nightBand.done'));
      this.reload();
      return 'saved';
    } finally {
      this.savingState.set(false);
    }
  }
}
