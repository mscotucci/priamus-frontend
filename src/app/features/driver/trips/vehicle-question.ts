import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../../shared/components/icon/icon';
import { TripVehicle } from './new-trip-answers';
import { TripsFacade } from './trips-facade';

const SEARCH_DELAY_MS = 300;

/**
 * The body of question 1: the leading vehicle, then, for a tractor, the trailer in the same
 * question. A standalone vehicle, a trailer or "Senza rimorchio" answers at once.
 */
@Component({
  selector: 'app-vehicle-question',
  imports: [TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3' },
  templateUrl: './vehicle-question.html',
})
export class VehicleQuestion {
  protected readonly facade = inject(TripsFacade);
  private readonly destroyRef = inject(DestroyRef);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('search');

  /** The tractor waiting for its trailer; null while the leading vehicle is being chosen. */
  readonly tractor = input.required<TripVehicle | null>();
  /** The vehicle and trailer already answered, shown selected. */
  readonly vehicle = input.required<TripVehicle | null>();
  readonly trailer = input.required<TripVehicle | null>();
  readonly tractorChosen = output<TripVehicle>();
  /** "Cambia" on the tractor waiting for its trailer: the leading vehicle is chosen again. */
  readonly changeLeading = output<void>();
  readonly answered = output<{ vehicle: TripVehicle; trailer: TripVehicle | null }>();

  constructor() {
    effect(() => {
      this.facade.askVehicles(this.tractor() === null ? 'Leading' : 'Trailer');
      const field = this.searchField();
      if (field) {
        field.nativeElement.value = '';
      }
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected searchFor(text: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.facade.searchVehicles(text), SEARCH_DELAY_MS);
  }

  protected pickLeading(vehicle: TripVehicle): void {
    clearTimeout(this.searchTimer);
    if (vehicle.kind === 'Tractor') {
      this.tractorChosen.emit(vehicle);
    } else {
      this.answered.emit({ vehicle, trailer: null });
    }
  }

  protected pickTrailer(trailer: TripVehicle | null): void {
    clearTimeout(this.searchTimer);
    const tractor = this.tractor();
    if (tractor !== null) {
      this.answered.emit({ vehicle: tractor, trailer });
    }
  }

  /** "Senza rimorchio" shows selected only when the answered tractor has no trailer. */
  protected withoutTrailerSelected(): boolean {
    const tractor = this.tractor();
    return tractor !== null && this.vehicle()?.id === tractor.id && this.trailer() === null;
  }
}
