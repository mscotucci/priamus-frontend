import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Session } from '../../../core/auth/session';
import { Icon } from '../../../shared/components/icon/icon';
import { TripsFacade } from './trips-facade';

@Component({
  selector: 'app-trips',
  imports: [RouterOutlet, TranslatePipe, Icon],
  providers: [TripsFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pt-driver flex min-h-screen flex-1 flex-col' },
  templateUrl: './trips.html',
})
export class Trips {
  protected readonly facade = inject(TripsFacade);
  private readonly session = inject(Session);
  protected readonly linked = computed(() => this.session.user()?.driverId != null);
}
