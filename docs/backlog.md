# Backlog

Work deferred on purpose, with the decision that deferred it. Items leave this file when a slice picks them up or a decision drops them.

## Design system

- **Fonts load from Google Fonts** (`index.html`). The driver app is meant to be installed and used on the road: self-host Manrope and JetBrains Mono before it ships.
- **Driver components are missing.** The driver mockup's sources were not available; only its typefaces and ground were. Touch-sized components are designed with the first driver slice.
- **The contract editor's components** (stepper, select, long form) exist only in an older mockup built on another library; they are redesigned when that screen is reached.
- **Small muted text is not a token.** Screens and the gallery size small muted text with the Tailwind utility `text-xs`, a default (12/16, equal to the `small` style today) and not a token. To be decided with the first screens: a small muted text class, or the text styles mapped into the Tailwind theme.
- **The sort button of a column header has no design-system class.** In `src/app/features/backoffice/users/user-list.html` it is laid out with Tailwind utilities. A `pt-` class for a sortable header, with its focus style and direction mark, belongs to the design system, with the gallery and the generated reference.
- **The table footer rule for the pager has no effect.** `.pt-table tfoot td:has(.pt-paging) { text-align: right }` in `src/styles/components.css` no longer applies: the pager sits in the flex host of `app-paging` (`src/app/shared/components/paging/paging.ts`), inside one footer cell. Decide whether the design system's table footer should own that layout or the rule should go.
