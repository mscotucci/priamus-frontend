import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../../shared/components/icon/icon';
import { Topbar } from '../../../core/layout/topbar';

@Component({
  selector: 'app-home',
  imports: [Topbar, TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <app-topbar [section]="'brand.name' | translate" [title]="'home.title' | translate" />
    <main class="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <div class="pt-tile pt-tile--lg pt-tile--primary"><app-icon name="truck" size="lg" /></div>
      <p class="pt-title">{{ 'home.empty' | translate }}</p>
    </main>
  `,
})
export class Home {}
