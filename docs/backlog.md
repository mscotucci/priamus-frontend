# Backlog

Work deferred on purpose, with the decision that deferred it. Items leave this file when a slice picks them up or a decision drops them.

## Contract page

- **Unit prices asked for a tiered overage.** With the minimum rule "Scaglione con eccesso" a trip costs M + overage × Y (plus the night call fee at night): the day and night prices of question 6 are never used, yet the page asks for them. Decided at the grilling of the pricing engine on 2026-11-20 to leave the page as it is in that slice; to decide how the questions change (hide the prices, or reorder rate and minimum).

## Lists (back office)

- **List state in the URL, for every list.** View, period, filters, search, sort and page live only while the page is open: leaving a list and coming back starts again from its defaults (the trip list from "Conclusi" on the current month). Raised by Michele on 2026-11-27 at the grilling of the back-office trip list, where the filters are many; deferred to a later implementation, for all lists together.

## Design system

- **Fonts load from Google Fonts** (`index.html`). The driver app is meant to be installed and used on the road: self-host Manrope and JetBrains Mono before it ships.
- **Driver components are missing.** The driver mockup's sources were not available; three screenshots of it arrived on 2026-11-23. The components are designed in the driver-trip slice, from the prototype `driver-prototype.css` of its plan folder; this item leaves when that slice is built.
- **Favourite trips.** A star that pins a trip of "Ripeti un viaggio" on the driver home. Asked by Michele on 2026-11-23 at the grilling of the driver trip; deferred: "Mostra tutti" covers the trip done rarely, and favourites are decided after the app is seen in use.
- **"Parto" / "Arrivato".** The driver taps at departure and at arrival and the app writes the times. Idea of 2026-11-23; it needs the trip under way as a state, so it is for after the December demo.
- **The contract editor's components** (stepper, select, long form) exist only in an older mockup built on another library; they are redesigned when that screen is reached.
- **Small muted text is not a token.** Screens and the gallery size small muted text with the Tailwind utility `text-xs`, a default (12/16, equal to the `small` style today) and not a token. To be decided with the first screens: a small muted text class, or the text styles mapped into the Tailwind theme.
- **The sort button of a column header has no design-system class.** In `src/app/features/backoffice/users/user-list.html` it is laid out with Tailwind utilities. A `pt-` class for a sortable header, with its focus style and direction mark, belongs to the design system, with the gallery and the generated reference.
- **The table footer rule for the pager has no effect.** `.pt-table tfoot td:has(.pt-paging) { text-align: right }` in `src/styles/components.css` no longer applies: the pager sits in the flex host of `app-paging` (`src/app/shared/components/paging/paging.ts`), inside one footer cell. Decide whether the design system's table footer should own that layout or the rule should go.
