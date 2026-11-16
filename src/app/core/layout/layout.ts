import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../shared/components/icon/icon';
import { Session } from '../auth/session';
import { initials } from './initials';
import { navFor } from './nav';

@Component({
  selector: 'app-layout',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './layout.html',
})
export class Layout {
  private readonly session = inject(Session);
  private readonly drawer = viewChild.required<ElementRef<HTMLDialogElement>>('drawer');

  private signingOut = false;

  protected readonly user = this.session.user;
  protected readonly groups = computed(() => {
    const user = this.user();
    return user === null ? [] : navFor(user.role);
  });
  protected readonly initials = computed(() => initials(this.user()?.username ?? ''));
  protected readonly roleKey = computed(() => `role.${(this.user()?.role ?? '').toLowerCase()}`);

  constructor() {
    // a click that lands on the dialog itself, not on its content, is a click on the backdrop
    afterNextRender(() => {
      const dialog = this.drawer().nativeElement;
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) {
          this.closeDrawer();
        }
      });
    });
  }

  openDrawer(): void {
    const dialog = this.drawer().nativeElement;
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  protected closeDrawer(): void {
    const dialog = this.drawer().nativeElement;
    if (dialog.open) {
      dialog.close();
    }
  }

  protected async signOut(): Promise<void> {
    if (this.signingOut) {
      return;
    }
    this.signingOut = true;
    this.closeDrawer();
    try {
      await this.session.signOut();
    } finally {
      this.signingOut = false;
    }
  }
}
