import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LocationsFacade } from './locations-facade';

@Component({
  selector: 'app-locations',
  imports: [RouterOutlet],
  providers: [LocationsFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `<router-outlet />`,
})
export class Locations {}
