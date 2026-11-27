import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../../shared/components/icon/icon';
import { locationLines } from './new-trip-answers';
import { durationKey, durationMinutes } from './trip-times';
import { TripsFacade } from './trips-facade';

/** "Viaggio concluso": the trip just ended, as the server recorded it. */
@Component({
  selector: 'app-trip-ended',
  imports: [DatePipe, DecimalPipe, TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './trip-ended.html',
})
export class TripEnded {
  private readonly facade = inject(TripsFacade);

  protected readonly trip = this.facade.ended;
  /** `HH:mm` of the start and of the end; the server sends seconds too. */
  protected readonly start = computed(() => this.trip()?.start?.slice(0, 5) ?? '');
  protected readonly end = computed(() => this.trip()?.end?.slice(0, 5) ?? null);
  protected readonly duration = computed(() => {
    const end = this.end();
    return end === null ? null : durationMinutes(this.start(), end);
  });
  protected readonly hours = computed(() => Math.floor((this.duration() ?? 0) / 60));
  protected readonly minutes = computed(() => (this.duration() ?? 0) % 60);
  protected readonly durationKey = computed(() => durationKey(this.duration() ?? 0));
  /** The locations as on "Nuovo viaggio": a location alone says whether it is the pickup or the delivery. */
  protected readonly locationLines = computed(() => {
    const trip = this.trip();
    return trip === null ? [] : locationLines({ pickup: trip.pickup, delivery: trip.delivery });
  });

  protected sameRoute(): void {
    void this.facade.repeatEnded();
  }

  protected goHome(): void {
    void this.facade.goHome();
  }

  constructor() {
    if (this.trip() === null) {
      void this.facade.goHome();
    }
  }
}
