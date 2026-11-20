import { ChoiceKeys } from './choice-keys';

describe('ChoiceKeys', () => {
  const key = (value: string) => new KeyboardEvent('keydown', { key: value, cancelable: true });

  it('ignores the click an arrow key fires, once', () => {
    const keys = new ChoiceKeys();
    keys.down(key('ArrowDown'));

    expect(keys.ignoreClick()).toBe(true);
    expect(keys.ignoreClick()).toBe(false);
  });

  it('does not ignore the click after a key that is not an arrow', () => {
    const keys = new ChoiceKeys();
    keys.down(key('a'));

    expect(keys.ignoreClick()).toBe(false);
  });

  it.each([
    ['confirm', (keys: ChoiceKeys, event: KeyboardEvent) => keys.confirm(event)],
    ['keyup', (keys: ChoiceKeys, event: KeyboardEvent) => keys.up(event)],
    ['reset', (keys: ChoiceKeys) => keys.reset()],
  ])('%s leaves no click to ignore', (_, release) => {
    const keys = new ChoiceKeys();
    keys.down(key('ArrowUp'));
    release(keys, key('Enter'));

    expect(keys.ignoreClick()).toBe(false);
  });

  it('prevents the default of Enter on confirm and of Space on keyup', () => {
    const keys = new ChoiceKeys();
    const enter = key('Enter');
    const space = key(' ');
    keys.confirm(enter);
    keys.up(space);

    expect(enter.defaultPrevented).toBe(true);
    expect(space.defaultPrevented).toBe(true);
  });
});
