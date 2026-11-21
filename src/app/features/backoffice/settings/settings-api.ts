import { HttpClient, HttpResourceRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '../../../core/api/generated/api-types';

type Schemas = components['schemas'];

export type NightBand = Schemas['NightBandDto'];
export type UpdateNightBandRequest = Schemas['UpdateNightBandRequest'];

const URL = '/api/registry/night-band';

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly http = inject(HttpClient);

  nightBand(): HttpResourceRequest {
    return { url: URL };
  }

  updateNightBand(request: UpdateNightBandRequest): Observable<void> {
    return this.http.put<void>(URL, request);
  }
}
