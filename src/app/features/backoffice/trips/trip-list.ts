import { DatePipe, NgTemplateOutlet, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  computed,
  inject,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Topbar } from '../../../core/layout/topbar';
import { FilterMenu, FilterOption } from '../../../shared/components/filter-menu/filter-menu';
import { Icon } from '../../../shared/components/icon/icon';
import { Notice } from '../../../shared/components/notice/notice';
import { Paging } from '../../../shared/components/paging/paging';
import { PeriodMenu } from '../../../shared/components/period-menu/period-menu';
import { SearchFilterMenu } from '../../../shared/components/search-filter-menu/search-filter-menu';
import { isoDay, monthName, toDate } from '../../../shared/dates/day';
import {
  formatAmount,
  formatDuration,
  formatKilograms,
  formatKilometres,
} from '../customers/contract-labels';
import { PAGE_SIZE, SortColumn, TripListItem, TripMode, TripView } from './backoffice-trips-api';
import { BackofficeTripsFacade } from './backoffice-trips-facade';
import { TripDrawer } from './trip-drawer';

const SEARCH_DELAY_MS = 300;

/** The key of the unit a mode is priced in, as the contract forms write it. */
const PRICING_KEY: Record<TripMode, string> = {
  StartAndEnd: 'byhour',
  Weight: 'byweight',
  Distance: 'bydistance',
  StartOnly: 'bytrip',
};

@Component({
  selector: 'app-trip-list',
  imports: [
    Topbar,
    DatePipe,
    NgTemplateOutlet,
    TranslatePipe,
    Icon,
    Paging,
    Notice,
    FilterMenu,
    SearchFilterMenu,
    PeriodMenu,
    TripDrawer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  templateUrl: './trip-list.html',
})
export class TripList {
  protected readonly facade = inject(BackofficeTripsFacade);
  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LOCALE_ID);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly pageSize = PAGE_SIZE;
  protected readonly today = isoDay(new Date());
  protected readonly views: { view: TripView; key: string }[] = [
    { view: 'Ended', key: 'trips.list.view.ended' },
    { view: 'InProgress', key: 'trips.list.view.inprogress' },
    { view: 'Planned', key: 'trips.list.view.planned' },
  ];
  protected readonly modes: FilterOption<TripMode>[] = [
    { value: 'StartAndEnd', labelKey: 'customers.contracts.pricing.byhour' },
    { value: 'Weight', labelKey: 'customers.contracts.pricing.byweight' },
    { value: 'Distance', labelKey: 'customers.contracts.pricing.bydistance' },
    { value: 'StartOnly', labelKey: 'customers.contracts.pricing.bytrip' },
  ];

  protected readonly ended = computed(() => this.facade.view() === 'Ended');
  protected readonly figures = computed(() => (this.ended() ? this.facade.figures() : null));

  /** "Novembre 2026" for a whole calendar month, otherwise "dd/MM/yyyy – dd/MM/yyyy". */
  protected readonly periodText = computed(() => {
    const { from, to } = this.facade.period();
    const first = toDate(from);
    const last = toDate(to);
    const wholeMonth =
      first.getDate() === 1 &&
      first.getFullYear() === last.getFullYear() &&
      first.getMonth() === last.getMonth() &&
      new Date(last.getFullYear(), last.getMonth() + 1, 0).getDate() === last.getDate();
    if (wholeMonth) {
      return monthName(first, this.locale);
    }
    const day = (date: Date) => formatDate(date, 'dd/MM/yyyy', this.locale);
    return `${day(first)} – ${day(last)}`;
  });

  protected readonly totalText = computed(() =>
    this.translate.instant(
      this.facade.total() === 1 ? 'trips.list.total.one' : 'trips.list.total.other',
      { count: this.facade.total() },
    ),
  );

  protected readonly count = computed(() =>
    this.translate.instant(
      this.facade.total() === 1 ? 'trips.list.count.one' : 'trips.list.count.other',
      { count: this.facade.total() },
    ),
  );

  protected readonly line = computed(() => {
    if (!this.facade.loaded()) {
      return undefined;
    }
    return this.ended()
      ? this.translate.instant('trips.list.line', {
          period: this.periodText(),
          count: this.count(),
        })
      : this.count();
  });

  constructor() {
    this.facade.loadList();
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected searchFor(text: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.facade.setSearch(text), SEARCH_DELAY_MS);
  }

  protected sortBy(column: SortColumn): void {
    const inverted = this.facade.sortDirection() === 'Ascending' ? 'Descending' : 'Ascending';
    this.facade.setSort(column, this.facade.sortColumn() === column ? inverted : 'Ascending');
  }

  /** "M. Di Lauro": the initial and the surname. */
  protected driverName(trip: TripListItem): string {
    return `${trip.driver.firstName.charAt(0)}. ${trip.driver.lastName}`;
  }

  /** "Pickup → Delivery", the one that is there, or null when the trip names no place. */
  protected places(trip: TripListItem): string | null {
    const names = [trip.pickup, trip.delivery].flatMap((place) => (place ? [place.name] : []));
    return names.length === 0 ? null : names.join(' → ');
  }

  /** "5 h 30 min", "3.520 kg", "120 km" or "1 viaggio", by how the trip is measured. */
  protected quantity(trip: TripListItem): string {
    switch (trip.measureKind) {
      case 'StartAndEnd':
        return formatDuration(trip.quantity ?? 0, this.translate);
      case 'Weight':
        return formatKilograms(trip.quantity ?? 0, this.translate);
      case 'Distance':
        return formatKilometres(trip.quantity ?? 0, this.translate);
      default:
        return this.translate.instant('trips.list.unit.trip');
    }
  }

  /** "120,00 €/ton": the unit price with the unit of the trip's mode. */
  protected rate(trip: TripListItem): string {
    const unit = this.translate.instant(
      `contracts.form.unit.price.${PRICING_KEY[trip.measureKind ?? 'StartOnly']}`,
    );
    return `${formatAmount(trip.unitPrice ?? 0)} ${unit}`;
  }

  protected amount(value: number): string {
    return `${formatAmount(value)} €`;
  }

  protected expiry(days: number): string {
    return this.translate.instant(
      days <= 0
        ? 'trips.list.expiry.today'
        : days === 1
          ? 'trips.list.expiry.one'
          : 'trips.list.expiry.other',
      { count: days },
    );
  }
}
