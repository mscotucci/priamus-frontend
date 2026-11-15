import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';

async function render(inputs: Record<string, string>) {
  const fixture = TestBed.createComponent(Icon);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).querySelector('svg')!;
}

describe('Icon', () => {
  it('points the use element at the named symbol of the sprite', async () => {
    const svg = await render({ name: 'user-plus' });

    expect(svg.querySelector('use')!.getAttribute('href')).toBe('icons.svg#user-plus');
  });

  it('adds the size modifier for a size other than the default', async () => {
    const svg = await render({ name: 'truck', size: 'lg' });

    expect(svg.getAttribute('class')).toBe('pt-icon pt-icon--lg');
  });

  it('adds no size modifier by default', async () => {
    const svg = await render({ name: 'truck' });

    expect(svg.getAttribute('class')).toBe('pt-icon');
  });

  it('hides the svg from assistive technology', async () => {
    const svg = await render({ name: 'search' });

    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
