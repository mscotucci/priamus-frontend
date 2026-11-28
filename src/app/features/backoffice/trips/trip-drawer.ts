import { DatePipe, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Drawer } from '../../../shared/components/drawer/drawer';
import { Icon } from '../../../shared/components/icon/icon';
import { Notice } from '../../../shared/components/notice/notice';
import { calculationLines } from '../customers/calculation-lines';
import { formatAmount } from '../customers/contract-labels';
import type { PricingMode } from '../customers/contracts-api';
import type { TripMode } from './backoffice-trips-api';
import { BackofficeTripsFacade } from './backoffice-trips-facade';
import { TripAttachment } from './trip-attachment';

/** How the contract forms name the way each trip was measured. */
const PRICING_MODE: Record<TripMode, PricingMode> = {
  StartAndEnd: 'ByHour',
  Weight: 'ByWeight',
  Distance: 'ByDistance',
  StartOnly: 'ByTrip',
};

const TITLE_KEY = {
  Ended: 'trips.drawer.title.ended',
  InProgress: 'trips.drawer.title.inprogress',
  Planned: 'trips.drawer.title.planned',
} as const;

/** The read-only detail of the trip the list opened. */
@Component({
  selector: 'app-trip-drawer',
  imports: [DatePipe, TranslatePipe, Drawer, Icon, Notice, TripAttachment],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trip-drawer.html',
})
export class TripDrawer {
  protected readonly facade = inject(BackofficeTripsFacade);
  private readonly translate = inject(TranslateService);
  private readonly locale = inject(LOCALE_ID);

  protected readonly trip = this.facade.trip;
  /** The trip whose file could not be opened, for the notice of the documents section. */
  protected readonly openFailedFor = signal<string | null>(null);

  protected readonly title = computed(() => {
    const trip = this.trip();
    return this.translate.instant(
      trip === null ? 'trips.drawer.title.pending' : TITLE_KEY[trip.state],
      { number: trip?.number },
    );
  });

  /**
   * The documents section: what the contract requires and what is attached, in the response order.
   * A planned trip has none; a document that is not required shows only when it has files.
   */
  protected readonly documents = computed(() => {
    const trip = this.trip();
    if (trip === null || trip.state === 'Planned') {
      return null;
    }
    return trip.documents
      .filter((entry) => entry.required || entry.attachments.length > 0)
      .map((entry) => ({
        document: entry.document,
        nameKey: `driver.documents.name.${entry.document.toLowerCase()}`,
        required: entry.required,
        photos: entry.attachments.filter((file) => file.fileKind === 'Jpeg'),
        pdfs: entry.attachments.filter((file) => file.fileKind === 'Pdf'),
        missing: entry.attachments.length === 0,
      }));
  });

  /** "Scade domani, 28/11, se l'autista non lo inizia." for a planned trip. */
  protected readonly expiry = computed(() => {
    const trip = this.trip();
    if (trip === null || trip.expiresOn === null || trip.daysToExpiry === null) {
      return null;
    }
    const days = trip.daysToExpiry;
    return this.translate.instant(
      days <= 0
        ? 'trips.drawer.expires.today'
        : days === 1
          ? 'trips.drawer.expires.tomorrow'
          : 'trips.drawer.expires.other',
      { date: formatDate(trip.expiresOn, 'dd/MM', this.locale) },
    );
  });

  /** The calculation the ended trip was saved with, in the words of "Prova la configurazione". */
  protected readonly calculation = computed(() => {
    const trip = this.trip();
    const saved = trip?.calculation;
    if (!trip || !saved || trip.start === null || trip.measureKind === null) {
      return null;
    }
    const mode = PRICING_MODE[trip.measureKind];
    return {
      mode,
      day: trip.day,
      lines: calculationLines(
        {
          mode,
          start: this.time(trip.start),
          nightBand: { start: this.time(saved.nightBandStart), end: this.time(saved.nightBandEnd) },
          isNight: saved.isNight,
          nightSurcharge: saved.nightSurcharge,
          rateSource: saved.rateSource,
          rateVehiclePlate: saved.rateVehicle?.licensePlate ?? null,
          ratePickup: saved.ratePickup,
          rateDelivery: saved.rateDelivery,
          quantity: saved.quantity,
          unitPrice: saved.unitPrice,
          baseAmount: saved.baseAmount,
          minimumKind: saved.minimumKind,
          minimumAmount: saved.minimumAmount,
          minimumThreshold: saved.minimumThreshold,
          minimumOveragePrice: saved.minimumOveragePrice,
          minimumApplied: saved.minimumApplied,
          amountAfterMinimum: saved.amountAfterMinimum,
          nightCallFee: saved.appliedNightCallFee,
          total: saved.total,
        },
        this.translate,
      ),
      total: `${formatAmount(saved.total)} ${this.translate.instant('contracts.form.unit.euro')}`,
    };
  });

  constructor() {
    // another trip, or none: what an earlier trip failed to open is forgotten
    effect(() => {
      this.facade.openTripId();
      untracked(() => this.openFailedFor.set(null));
    });
    // a trip that is gone since the list was read: the list is read again
    effect(() => {
      if (this.facade.tripMissing()) {
        untracked(() => this.facade.reload());
      }
    });
  }

  protected time(value: string): string {
    return value.slice(0, 5);
  }
}
