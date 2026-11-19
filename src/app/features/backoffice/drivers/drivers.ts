import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DriversFacade } from './drivers-facade';

@Component({
  selector: 'app-drivers',
  imports: [RouterOutlet],
  providers: [DriversFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `<router-outlet />`,
})
export class Drivers {}
