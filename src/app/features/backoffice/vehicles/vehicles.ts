import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VehiclesFacade } from './vehicles-facade';

@Component({
  selector: 'app-vehicles',
  imports: [RouterOutlet],
  providers: [VehiclesFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `<router-outlet />`,
})
export class Vehicles {}
