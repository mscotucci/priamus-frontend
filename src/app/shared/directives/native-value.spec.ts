import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NativeValue } from './native-value';

@Component({
  imports: [NativeValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input
    type="time"
    [appNativeValue]="draft()"
    (input)="draft.set($any($event.target).value)"
  />`,
})
class Host {
  readonly draft = signal('22:00');
}

describe('NativeValue', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const assignments: string[] = [];
    const prototype = Object.getPrototypeOf(input) as object;
    const original = Object.getOwnPropertyDescriptor(prototype, 'value')!;
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => original.get!.call(input) as string,
      set: (value: string) => {
        assignments.push(value);
        original.set!.call(input, value);
      },
    });
    return { fixture, host: fixture.componentInstance, input, assignments };
  }

  it('writes the draft on first render', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input').value).toBe('22:00');
  });

  it('writes the draft when it changes to a value different from the element value', () => {
    const { fixture, host, input, assignments } = render();

    host.draft.set('06:30');
    fixture.detectChanges();

    expect(input.value).toBe('06:30');
    expect(assignments).toEqual(['06:30']);
  });

  it('does not assign when the element value already equals the draft', () => {
    const { fixture, host, input, assignments } = render();

    input.value = '21:15';
    assignments.length = 0;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.draft()).toBe('21:15');
    expect(assignments).toEqual([]);
  });
});
