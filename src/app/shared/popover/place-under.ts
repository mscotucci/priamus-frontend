/** The open menus already watching the page's scroll. */
const watching = new WeakSet<HTMLElement>();

/**
 * Places a popover menu just under its button, left aligned, no taller than the window below it (the menu
 * scrolls inside, see `.pt-menu`) and no wider than the window on its right, with an 8 px margin (a long item
 * wraps, see `.pt-menu__item`). A popover sits in the top layer, fixed to the
 * window: when the page or any container scrolls, or the window resizes, the menu closes, as a native select
 * does, instead of staying put away from its button or following it over the top bar. Scrolling inside the
 * menu itself leaves it open.
 */
export function placeUnder(button: HTMLElement, menu: HTMLElement): void {
  const box = button.getBoundingClientRect();
  menu.style.top = `${box.bottom + 4}px`;
  menu.style.left = `${box.left}px`;
  menu.style.maxHeight = `calc(100dvh - ${box.bottom + 12}px)`;
  menu.style.maxWidth = `calc(100vw - ${box.left + 8}px)`;
  if (watching.has(menu)) {
    return;
  }
  const stop = () => {
    document.removeEventListener('scroll', close, true);
    window.removeEventListener('resize', close);
    menu.removeEventListener('toggle', onToggle);
    watching.delete(menu);
  };
  const close = (event: Event) => {
    if (event.target instanceof Node && menu.contains(event.target)) {
      return;
    }
    stop();
    if (menu.isConnected && menu.matches(':popover-open')) {
      menu.hidePopover();
    }
  };
  const onToggle = (event: Event) => {
    if ((event as ToggleEvent).newState === 'closed') {
      stop();
    }
  };
  document.addEventListener('scroll', close, { capture: true, passive: true });
  window.addEventListener('resize', close);
  menu.addEventListener('toggle', onToggle);
  watching.add(menu);
}
