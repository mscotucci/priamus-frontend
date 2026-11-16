import { Injectable, signal } from '@angular/core';

const DURATION_MS = 4000;

/** Shows one success message at a time; the text arrives already translated. */
@Injectable({ providedIn: 'root' })
export class Toast {
  private readonly text = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly current = this.text.asReadonly();

  success(text: string): void {
    clearTimeout(this.timer);
    this.text.set(text);
    this.timer = setTimeout(() => this.text.set(null), DURATION_MS);
  }
}
