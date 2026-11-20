/** The keyboard handling of a group of radio choices where an arrow key selects without confirming. */
export class ChoiceKeys {
  /** Set while an arrow key moves a radio selection: it suppresses the click that key fires. */
  private arrowMoved = false;

  /** An arrow key moves a radio selection without confirming it: the click it fires is ignored. */
  down(event: KeyboardEvent): void {
    if (event.key.startsWith('Arrow')) {
      this.arrowMoved = true;
    }
  }

  /** Space and Enter confirm the focused choice, as a click does: the template then picks it. */
  confirm(event: Event): void {
    event.preventDefault();
    this.arrowMoved = false;
  }

  up(event: KeyboardEvent): void {
    this.arrowMoved = false;
    if (event.key === ' ') {
      event.preventDefault();
    }
  }

  /** True when the click being handled was fired by an arrow key: it is to be ignored. */
  ignoreClick(): boolean {
    const moved = this.arrowMoved;
    this.arrowMoved = false;
    return moved;
  }

  /** A choice that an arrow key picks too: nothing is left to ignore. */
  reset(): void {
    this.arrowMoved = false;
  }
}
