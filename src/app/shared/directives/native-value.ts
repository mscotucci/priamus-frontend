import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/**
 * Writes a draft to the `value` of a native field only when it differs from the element's own.
 * A date or time field with one segment cleared reports an empty value; assigning that back
 * would wipe the segments still filled in.
 */
@Directive({ selector: 'input[appNativeValue]' })
export class NativeValue {
  readonly appNativeValue = input.required<string>();

  private readonly field = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  constructor() {
    effect(() => {
      const draft = this.appNativeValue();
      if (this.field.value !== draft) {
        this.field.value = draft;
      }
    });
  }
}
