import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsFacade } from './settings-facade';

@Component({
  selector: 'app-settings',
  imports: [RouterOutlet],
  providers: [SettingsFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `<router-outlet />`,
})
export class Settings {}
