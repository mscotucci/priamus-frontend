import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UsersFacade } from './users-facade';

@Component({
  selector: 'app-users',
  imports: [RouterOutlet],
  providers: [UsersFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `<router-outlet />`,
})
export class Users {}
