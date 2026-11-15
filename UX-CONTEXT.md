# UX context — Priamus Trips frontend

Reusable UX conventions. Single-screen details live in the mockups, behaviour in the slice `SPEC.md`. The conventions marked "to confirm" are a starting point taken from the mockups and are settled at the grilling of the first slice that meets them.

## Style stack

- Angular (latest stable), standalone, zoneless, signals-first.
- Tailwind CSS 4 for layout only. Everything visual comes from the project's design system: tokens, `pt-` component classes, guidelines. No UI component library.
- Behaviour comes from native HTML (`<dialog>`, `popover`, `<details>`, `<input type="date">`) wrapped in dumb components under `shared/components`. Angular CDK enters only when a concrete case needs it.
- Light and dark themes, both complete; the theme is `data-theme` on the root element.
- Every colour is a token. No Tailwind palette colour and no hard-coded colour, in the app or in mockups.
- Icons: line icons on a 24px grid, stroke 1.8, as SVG through one shared icon component; no icon font, no emoji.
- The page ground is `bg`; content sits on `surface` cards with a 1px `border`. No shadows except under a floating menu.
- A label above a value is small, uppercase and muted (`pt-label`); the page title is large and in sentence case.

## Two areas

- **Back-office** (secretariat, desktop first): dense tables, filters, drawers. Navigation is a column on the left; the current user and "Esci" sit at its bottom.
- **Driver app** (phone and tablet first, used in the cab): one task per screen, large touch targets (no control under 44px), no table. It never shows prices, rates or totals.
- Every page of both areas works at phone width (375 px) without the page scrolling horizontally: wide tables scroll inside their own container.

## Lists and detail (back-office)

- A list page carries, top to bottom: title and main action, the figures of the current selection (stat cards), saved views, filter chips, the table, its total.
- Filters apply as soon as a value is picked and drive the table, the figures and the total together. A searchable list queries the API, never filters on the client.
- Lists that can grow are paged by the server.
- A row with an open anomaly is highlighted and sorts to the top, with the action that resolves it in the row.
- Opening a row shows its detail in a drawer over the list, which keeps its state (to confirm).
- Rich entities (customer, contract, vehicle, driver) are edited on their own page; a single decision or a one-field fix in a dialog (to confirm).
- Destructive actions ask for confirmation in a dialog. An action the user may not perform is not rendered, never shown disabled.

## Feedback

- Loading a list: the page title stays, a loading indicator replaces the table.
- A list that fails to load: an alert with "Riprova" replaces the table.
- A create, edit or delete that succeeds: a toast that dismisses itself. Loading never shows a toast.
- While saving, the form's buttons are disabled and the primary one shows progress.

## Errors and validation

- Forms validate before submit with the frontend's own Italian messages under each field.
- Server field errors (400 with `errors`) appear under the matching field.
- Domain errors (`errorCode`) appear as an alert at the top of the form or list, with the backend `detail`; the form stays open with the entered values.
- Failures without a usable body show a generic Italian message.

## Language

- No user-facing text is hard-coded: every label and message goes through the translation file. Italian (`it`) is the only language delivered; no language switcher.
- Translation keys are lowercase, dot-separated, grouped by feature (`common.actions.save`, `identity.users.list.title`), in one `it.json`.
- Dates and numbers follow Italian conventions through locale-aware formatting (`24/04/2026`, `1.248,50 €`); never formatted by hand.
- Texts owned by the backend (error messages) are shown as received; user-entered data are never translated.
- Code and identifiers are English and use the terms of the backend glossary (`Trip`, `Driver`, `Contract`, `Rate`).
