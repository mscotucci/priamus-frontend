import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackofficeTripsFacade } from './backoffice-trips-facade';

@Component({
  selector: 'app-backoffice-trips',
  imports: [RouterOutlet],
  providers: [BackofficeTripsFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `<router-outlet />`,
})
export class BackofficeTrips {}
