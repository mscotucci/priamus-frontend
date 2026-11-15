# Backlog

Work deferred on purpose, with the decision that deferred it. Items leave this file when a slice picks them up or a decision drops them.

## Scaffold (2026-11-15)

- **No product screen yet.** The repository holds the tooling, the design system and its gallery. The first slice is the shell, the login and user management, which need three things from the backend first: a way to run it locally with a database, a first administrator, and an endpoint that returns the current user.
- **`core/` is empty.** Auth (login, token interceptor, refresh), API error mapping, runtime configuration, i18n and the toast arrive with the first slice that uses them. `@ngx-translate/core` is not installed yet for the same reason.
- **No `openapi/v1.json`.** `npm run api:snapshot` needs the backend running on `http://localhost:49686`; the snapshot and the generated types are added with the first API slice.
- **No development proxy.** The backend has no CORS configuration; `ng serve` needs a proxy to `/api` when the first call is made.

## Design system

- **Fonts load from Google Fonts** (`index.html`). The driver app is meant to be installed and used on the road: self-host Manrope and JetBrains Mono before it ships.
- **Driver components are missing.** The driver mockup's sources were not available; only its typefaces and ground were. Touch-sized components are designed with the first driver slice.
- **Overlay components have styles, not behaviour.** Drawer, dialog, the filter menu, the toast region and the paging control have their `pt-` classes and gallery sections, not their behaviour (focus handling, Escape, click outside, dismissal of a toast, page changes); the Angular components wrapping them arrive with the first screen that opens one.
- **The contract editor's components** (stepper, select, long form) exist only in an older mockup built on another library; they are redesigned when that screen is reached.
- **Small muted text is not a token.** Screens and the gallery size small muted text with the Tailwind utility `text-xs`, a default (12/16, equal to the `small` style today) and not a token. To be decided with the first screens: a small muted text class, or the text styles mapped into the Tailwind theme.
