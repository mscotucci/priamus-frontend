import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CustomersFacade } from './customers-facade';

@Component({
  selector: 'app-customers',
  imports: [RouterOutlet],
  providers: [CustomersFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `<router-outlet />`,
})
export class Customers {}
