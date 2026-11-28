import { DecimalPipe, formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../../shared/components/icon/icon';
import { Notice } from '../../../shared/components/notice/notice';
import { dayKind, durationKey, durationMinutes, placesOf } from './trip-times';
import { MyTrips, Trip } from './trips-api';
import { TripsFacade } from './trips-facade';

/** The trips of one day, with the title that says which day it is. */
interface DayGroup {
  day: string;
  title: { key: string; params: { date: string } };
  trips: MyTrips['trips'];
}

/** "I miei viaggi": the driver's own ended trips of the last seven days, grouped by the day they started. */
@Component({
  selector: 'app-my-trips-page',
  imports: [RouterLink, DecimalPipe, TranslatePipe, Icon, Notice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './my-trips-page.html',
})
export class MyTripsPage {
  protected readonly facade = inject(TripsFacade);
  private readonly locale = inject(LOCALE_ID);

  protected readonly places = placesOf;

  /** The days, newest first as the server sends the trips; the titles come from the server's today. */
  protected readonly groups = computed<DayGroup[]>(() => {
    const read = this.facade.myTrips();
    const groups: DayGroup[] = [];
    for (const item of read?.trips ?? []) {
      const day = item.trip.day ?? '';
      let group = groups.find((g) => g.day === day);
      if (!group) {
        group = { day, title: this.titleOf(day, read!.today), trips: [] };
        groups.push(group);
      }
      group.trips.push(item);
    }
    return groups;
  });

  constructor() {
    this.facade.needMyTrips();
  }

  /** `HH:mm` of a time the server sends with seconds. */
  protected clock(time: string | null): string {
    return (time ?? '').slice(0, 5);
  }

  /** The text key and parameters of the duration of an ended trip, in words. */
  protected duration(trip: Trip): { key: string; params: { hours: number; minutes: number } } {
    const minutes = durationMinutes(this.clock(trip.start), this.clock(trip.end));
    return {
      key: durationKey(minutes),
      params: { hours: Math.floor(minutes / 60), minutes: minutes % 60 },
    };
  }

  private titleOf(day: string, today: string): DayGroup['title'] {
    const kind = dayKind(day, today);
    const [year, month, date] = day.split('-').map(Number);
    const text = formatDate(new Date(year, month - 1, date), 'EEEE d MMMM', this.locale);
    return {
      key: `driver.myTrips.day.${kind}`,
      params: { date: kind === 'other' ? text.charAt(0).toUpperCase() + text.slice(1) : text },
    };
  }
}
