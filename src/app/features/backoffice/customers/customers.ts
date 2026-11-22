import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LocationsFacade } from '../locations/locations-facade';
import { CustomersFacade } from './customers-facade';

@Component({
  selector: 'app-customers',
  imports: [RouterOutlet],
  providers: [CustomersFacade, LocationsFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `<router-outlet />`,
})
export class Customers {}
