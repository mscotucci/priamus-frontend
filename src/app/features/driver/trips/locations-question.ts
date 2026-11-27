import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../../shared/components/icon/icon';
import { LocationsAnswer, TripLocation, TripQuestions } from './new-trip-answers';
import { TripsFacade } from './trips-facade';

const SEARCH_DELAY_MS = 300;

type Side = 'pickup' | 'delivery';

interface Group {
  side: Side;
  /** Whether the list is introduced by its "Partenza" / "Consegna" label. */
  labelled: boolean;
  places: TripLocation[];
}

const NONE: LocationsAnswer = { pickup: null, delivery: null };

function distinct(places: (TripLocation | null)[]): TripLocation[] {
  const seen = new Map<string, TripLocation>();
  for (const place of places) {
    if (place !== null && !seen.has(place.id)) {
      seen.set(place.id, place);
    }
  }
  return [...seen.values()];
}

/**
 * The body of question 3, by what the contract asks. Both: the pickup, then the delivery paired
 * with it, closing on the delivery. One side: that side among the contract's places, then the
 * optional other side among all active locations, closed by "Continua". None: both sides
 * optional, closed by "Continua" or "Salta". No location is typed: only the searches.
 */
@Component({
  selector: 'app-locations-question',
  imports: [TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3' },
  templateUrl: './locations-question.html',
})
export class LocationsQuestion {
  protected readonly facade = inject(TripsFacade);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('search');

  /** What the contract asks and the places it offers. */
  readonly questions = input.required<TripQuestions>();
  /** The locations already answered, shown selected. */
  readonly locations = input.required<LocationsAnswer | null>();
  readonly answered = output<LocationsAnswer>();

  /** What the driver chose here; null while nothing was touched. */
  private readonly picked = signal<LocationsAnswer | null>(null);
  /** The side whose optional list is open; undefined until the driver opens or closes one. */
  private readonly listed = signal<Side | null | undefined>(undefined);

  protected readonly asked = computed(() => this.questions().locationsAsked);

  /** The place the server proposes, kept only when the contract still offers it. */
  private readonly proposal = computed<LocationsAnswer>(() => {
    const { locationsAsked, places, lastPlace } = this.questions();
    const pickup = lastPlace?.pickup ?? null;
    const delivery = lastPlace?.delivery ?? null;
    switch (locationsAsked) {
      case 'Both':
        return places.some((p) => p.pickup?.id === pickup?.id && p.delivery?.id === delivery?.id)
          ? { pickup, delivery }
          : NONE;
      case 'Pickup':
        return places.some((p) => p.pickup?.id === pickup?.id) ? { pickup, delivery: null } : NONE;
      case 'Delivery':
        return places.some((p) => p.delivery?.id === delivery?.id)
          ? { pickup: null, delivery }
          : NONE;
      case 'None':
        return NONE;
    }
  });

  /** What is selected: what the driver chose, else the answer, else the proposal. */
  protected readonly draft = computed(() => this.picked() ?? this.locations() ?? this.proposal());

  /** The side the contract requires alone, or null on a pair and when nothing is required. */
  protected readonly required = computed<Side | null>(() =>
    this.asked() === 'Pickup' ? 'pickup' : this.asked() === 'Delivery' ? 'delivery' : null,
  );
  /** The sides the driver may add among all the active locations. */
  protected readonly optional = computed<Side[]>(() => {
    switch (this.asked()) {
      case 'Pickup':
        return ['delivery'];
      case 'Delivery':
        return ['pickup'];
      case 'None':
        return ['pickup', 'delivery'];
      case 'Both':
        return [];
    }
  });

  /** The lists of places the contract offers, in the order they are asked. */
  protected readonly groups = computed<Group[]>(() => {
    const { places } = this.questions();
    const pickup = this.draft().pickup;
    switch (this.asked()) {
      case 'Both':
        return [
          { side: 'pickup', labelled: true, places: distinct(places.map((p) => p.pickup)) },
          ...(pickup === null
            ? []
            : [
                {
                  side: 'delivery' as const,
                  labelled: true,
                  places: distinct(
                    places.filter((p) => p.pickup?.id === pickup.id).map((p) => p.delivery),
                  ),
                },
              ]),
        ];
      case 'Pickup':
        return [{ side: 'pickup', labelled: false, places: distinct(places.map((p) => p.pickup)) }];
      case 'Delivery':
        return [
          { side: 'delivery', labelled: false, places: distinct(places.map((p) => p.delivery)) },
        ];
      case 'None':
        return [];
    }
  });
  /** The required side is chosen: "Continua" is offered. */
  protected readonly requiredChosen = computed(() => {
    const side = this.required();
    return side !== null && this.draft()[side] !== null;
  });
  protected readonly anyChosen = computed(
    () => this.draft().pickup !== null || this.draft().delivery !== null,
  );
  /** The open optional list: the one the driver opened, else the one already holding a choice. */
  protected readonly list = computed<Side | null>(() => {
    const listed = this.listed();
    if (listed !== undefined) {
      return listed;
    }
    return this.optional().find((side) => this.draft()[side] !== null) ?? null;
  });

  constructor() {
    effect(() => {
      if (this.list() !== null) {
        untracked(() => {
          clearTimeout(this.searchTimer);
          this.facade.askLocations();
          const field = this.searchField();
          if (field) {
            field.nativeElement.value = '';
          }
        });
      }
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected searchFor(text: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.facade.searchLocations(text), SEARCH_DELAY_MS);
  }

  /** A place of the contract; on a pair a delivery closes the question. */
  protected pickPlace(side: Side, place: TripLocation): void {
    const draft = this.draft();
    if (this.asked() !== 'Both') {
      this.picked.set({ ...draft, [side]: place });
    } else if (side === 'pickup') {
      const paired = this.questions().places.some(
        (p) => p.pickup?.id === place.id && p.delivery?.id === draft.delivery?.id,
      );
      this.picked.set({ pickup: place, delivery: paired ? draft.delivery : null });
    } else if (draft.pickup !== null) {
      this.picked.set({ pickup: draft.pickup, delivery: place });
      this.answered.emit({ pickup: draft.pickup, delivery: place });
    }
  }

  /** An optional place; a tap on the one selected takes it back. */
  protected pickOptional(side: Side, place: TripLocation): void {
    const draft = this.draft();
    this.picked.set({ ...draft, [side]: draft[side]?.id === place.id ? null : place });
  }

  protected toggleList(side: Side): void {
    this.listed.set(this.list() === side ? null : side);
  }

  protected continue(): void {
    this.answered.emit(this.draft());
  }

  protected skip(): void {
    this.answered.emit(NONE);
  }
}
