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
- **Icons are not in the repository.** The set drawn in the mockups is described in the design system; the shared icon component and its SVGs arrive with the shell.
- **Overlay components are styles only.** Drawer, dialog and the filter menu have their `pt-` classes, not their behaviour (focus handling, Escape, click outside); the Angular components wrapping them arrive with the first screen that opens one.
- **The contract editor's components** (stepper, select, long form) exist only in an older mockup built on another library; they are redesigned when that screen is reached.
- **Tokens live in two places**: `design-system/tokens.json` here and the published reference. A change goes to both; nothing checks it.
