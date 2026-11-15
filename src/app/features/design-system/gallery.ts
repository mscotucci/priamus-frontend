import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

/**
 * Developer page that renders the design system's components with the real tokens and styles,
 * in both themes. It is the one page allowed to hard-code its texts: it is not part of the product.
 */
@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gallery {
  private readonly root = inject(DOCUMENT).documentElement;

  protected readonly dark = signal(this.root.dataset['theme'] === 'dark');

  protected toggleTheme(): void {
    this.dark.update((dark) => !dark);
    this.root.dataset['theme'] = this.dark() ? 'dark' : 'light';
  }
}
