import { placeUnder } from './place-under';

describe('placeUnder', () => {
  let button: HTMLButtonElement;
  let menu: HTMLDivElement;
  let hidden: number;

  beforeEach(() => {
    hidden = 0;
    button = document.createElement('button');
    menu = document.createElement('div');
    menu.setAttribute('popover', '');
    document.body.append(button, menu);
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({ bottom: 100, left: 40 } as DOMRect);
    vi.spyOn(menu, 'matches').mockReturnValue(true);
    menu.hidePopover = () => {
      hidden++;
    };
  });

  afterEach(() => {
    menu.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'closed' }));
    button.remove();
    menu.remove();
  });

  const scroll = (target: EventTarget) => target.dispatchEvent(new Event('scroll'));

  it('places the menu 4 px under its button, left aligned, within the window', () => {
    placeUnder(button, menu);

    expect(menu.style.top).toBe('104px');
    expect(menu.style.left).toBe('40px');
    expect(menu.style.maxHeight).toBe('calc(100dvh - 112px)');
    expect(menu.style.maxWidth).toBe('calc(100vw - 48px)');
  });

  it('closes the menu when a container of the page scrolls', () => {
    const container = document.createElement('div');
    document.body.append(container);
    placeUnder(button, menu);

    scroll(container);
    scroll(container);

    expect(hidden).toBe(1);
    container.remove();
  });

  it('stays open when the menu itself scrolls', () => {
    const list = document.createElement('div');
    menu.append(list);
    placeUnder(button, menu);

    scroll(list);

    expect(hidden).toBe(0);
  });

  it('closes the menu when the window resizes', () => {
    placeUnder(button, menu);

    window.dispatchEvent(new Event('resize'));

    expect(hidden).toBe(1);
  });

  it('stops watching once the menu closes', () => {
    placeUnder(button, menu);
    menu.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'closed' }));

    scroll(document);

    expect(hidden).toBe(0);
  });
});
