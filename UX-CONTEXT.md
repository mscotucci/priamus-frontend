# UX context — Priamus Trips frontend

Reusable UX conventions. Single-screen details live in the mockups, behaviour in the slice `SPEC.md`. The conventions marked "to confirm" are a starting point taken from the mockups and are settled at the grilling of the first slice that meets them.

## Reference mockups

- The mockups of May 2026 in `E:\Priamus` are binding for layout and look: `Layout Shell _standalone_.html` (shell: sidebar, top bar, drawer under 900px) and `Pannello Segreteria _standalone_.html` (list page). A new screen starts from them; a screen they do not show (login, users) is drawn in their style, and every departure is put to Michele as a question.
- They are JavaScript bundles: open them through a local HTTP server, not as files.

## Style stack

- Angular (latest stable), standalone, zoneless, signals-first.
- Tailwind CSS 4 for layout only. Everything visual comes from the project's design system: tokens, `pt-` component classes, guidelines. No UI component library.
- Behaviour comes from native HTML (`<dialog>`, `popover`, `<details>`, `<input type="date">`) wrapped in dumb components under `shared/components`. Angular CDK enters only when a concrete case needs it.
- Light and dark themes, both complete; the theme is `data-theme` on the root element.
- Every colour is a token. No Tailwind palette colour and no hard-coded colour, in the app or in mockups.
- Icons: line icons on a 24px grid, stroke 1.8, as SVG through one shared icon component; no icon font, no emoji.
- The page ground is `bg`; content sits on `surface` cards with a 1px `border`. No shadows except under a floating menu.
- A label above a value is small, uppercase and muted (`pt-label`); the page title is large and in sentence case.
- Above the page title the top bar shows the breadcrumb (`pt-breadcrumb`): the levels above the page, from the section, in sentence case and separated by "›"; a level that is a page is a link in the primary colour, the section is plain text; the page itself is the title, never a level. It departs from the reference mockups, whose uppercase eyebrow read as part of the title (decided by Michele 2026-11-18).

## Design system grammar

- A component is a base class plus size and colour modifiers (`pt-btn pt-btn--sm pt-btn--primary`); states come from HTML and ARIA attributes.
- Sizes are `sm` (30px), `md` (36px, default) and `lg` (44px, touch), the same on every control; colours are `primary`, `danger`, `warn`, `success`, `info` and the neutral default.
- Three modifiers are the grammar's only exceptions, taken from the reference mockups: `pt-pill--purple` (the pill of a flat-rate price), `pt-stat--highlight` (the one stat card that stands out, in the primary colour) and `pt-row--anomaly` (a table row with an open anomaly).
- A component enters the catalogue when a reference mockup or an approved screen uses it.
- A focused field shows one ring flush with its border, never an inner and an outer one; buttons and links show the detached ring only for the keyboard.
- The open list of a select is the design system's menu, through the browser's customisable native select.

## Two areas

- **Back-office** (secretariat, desktop first): dense tables, filters, drawers. Navigation is a column on the left; the current user and "Esci" sit at its bottom.
- **Driver app** (phone and tablet first, used in the cab): one task per screen, large touch targets (no control under 44px), no table. It never shows prices, rates or totals.
- Every page of both areas works at phone width (375 px) without the page scrolling horizontally: wide tables scroll inside their own container.

## Lists and detail (back-office)

- A list page carries, top to bottom: title and main action, the figures of the current selection (stat cards), saved views, filter chips, the table, its total.
- Filters apply as soon as a value is picked and drive the table, the figures and the total together. A searchable list queries the API, never filters on the client.
- Lists that can grow are paged by the server.
- A column that has a filter is not sorted: its header is plain text, with no sort control.
- In a filter row the search field and the filter chips have the same height.
- A row's action buttons keep their short visible label ("Modifica") and are described by the element that names the row, its name alone (`aria-describedby` to its id), so a screen reader tells one row's "Modifica" from another's.
- A row with an open anomaly is highlighted and sorts to the top, with the action that resolves it in the row.
- Opening a row shows its detail in a drawer over the list, which keeps its state (to confirm).
- Rich entities (contract) are edited on their own page; a vehicle, four fields, is edited in a dialog (decided 2026-11-16), and so is a driver, four fields (decided 2026-11-19); a customer's own data are edited in a dialog, and its page, when contracts arrive, exists to hold its contracts (decided 2026-11-18); a single decision or a short form of a few fields in a dialog over the list, which keeps its state. A dialog with typed values closes with its cancel button or Escape, not by clicking outside.
- A configuration made of choices (a contract) is a guided page, as in the reference mockup `contratto_progressive_v5.html`: one numbered question card per question (`pt-question`), the next appearing when the previous is answered, an answered one showing its answer boxed like a selected choice card (`pt-question__answer`), with "Modifica" (decided 2026-11-19: the small pill of the mockup did not read as the answer); a question reopened with "Modifica" also offers "Annulla modifica", which closes it on the answer it had (decided 2026-11-19); the answers are choice cards (`pt-choice`: radio or checkbox, title, hint). Changing an answer clears only the answers that no longer apply (decided 2026-11-18). With the keyboard, the arrows move the selection of a single-choice question without confirming it; Space or Enter confirms, as a click does (decided 2026-11-18). A question whose choice opens fields to fill (the minimum) is confirmed only by its "Conferma": there the arrows, Space, Enter and a click all just select (decided 2026-11-19). Esc in a reopened question does what "Annulla modifica" does; on a "Modifica" the up and down arrows move the focus to the "Modifica" of the question before or after, and Enter reopens it (decided 2026-11-20). The keys are told with `pt-kbd` keys in `pt-keys` lines, never beside an action so the cards do not crowd: the page's own keys once under the introduction ("Da un «Modifica»: ↑ ↓ passa a un'altra domanda · Invio modifica"); a question's keys under its actions, only while it is open (`app-contract-keys`): "↑ ↓ scegli · Invio o Spazio conferma" on a single choice, "↑ ↓ scegli · Tab vai ai campi, poi «Conferma»" on a question that opens fields, plus "Esc annulla la modifica" once reopened (decided 2026-11-20).
- A page that edits an entity guards against leaving with unsaved changes: a dialog "Uscire senza salvare?" for in-app navigation, the browser's own prompt for reload or close. Not after a save, not after a deliberate discard, not on session expiry (decided 2026-11-18). "Esci" on such a page asks with the same dialog before the session is closed (decided 2026-11-18). Dialogs need no guard: they close only through their cancel button or Escape.
- Destructive actions ask for confirmation in a dialog. An action the user may not perform is not rendered, never shown disabled.

- System settings live on the administrator's page "Impostazioni" (navigation group "Sistema"): one card per setting, each with its own "Salva" (decided 2026-11-20).

## Feedback

- A result computed from values the user is editing (the simulation of a contract) is removed as soon as one of those values changes, and the user computes it again: a result that no longer matches the page is never shown (decided 2026-11-20).
- Loading a list: the page title stays, a loading indicator replaces the table — when the list opens and when its search, filters, sorting or page change. When the same list is read again after a write, the table stays (so the focus stays where it was) and a small indicator shows at the end of the filter row until the new rows arrive. A button that is saving changes its label and is disabled, without an indicator; a row action that runs at once (enable) is marked `aria-disabled` instead, so it keeps the focus.
- A list that fails to load: an alert with "Riprova" replaces the table.
- A create, edit or delete that succeeds: a toast at the bottom right that dismisses itself after 4 seconds, one at a time. Loading never shows a toast, and neither does an error: errors are notices in the page.
- A reversible, non-destructive row action (enable) runs at once without confirmation; its failure shows as a notice above the table.
- While saving, the form's buttons are disabled and the primary one shows progress.

## Errors and validation

- In a form every input and select has the same height, and a button beside a field is as tall as the field.
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
