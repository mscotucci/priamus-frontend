# Priamus Trips — Frontend

Frontend of **Priamus Trips**: one Angular application with two areas, the back-office for the secretariat and the driver app. It talks to the backend only through its OpenAPI contract.

## Repository structure

```
priamus-trips-frontend/
├── CLAUDE.md               Instructions for Claude Code
├── UX-CONTEXT.md           UX conventions, binding for every screen
├── design-system/
│   └── tokens.json         The design tokens (colours per theme, type, spacing, radii, shadow)
├── docs/backlog.md         Work deferred on purpose
├── openapi/v1.json         Snapshot of the backend contract (added with the first API slice)
├── scripts/                tokens.mjs, api-snapshot.mjs, api-types.mjs
└── src/
    ├── styles.css          Tailwind, tokens, Tailwind theme mapping, component styles
    ├── styles/             tokens.css and theme.css (generated), components.css
    └── app/                core/, features/, shared/
```

## Prerequisites

- Node.js 24 and npm 11

## Quick start

```bash
npm install
npm start
```

The application opens on `http://localhost:4200`. Until the first product screen exists, the root shows the design system gallery (`/design-system`).

## Checks

```bash
npm run lint
npm test
npm run build
```

## Design system

Change a token in `design-system/tokens.json`, then run `npm run tokens`. Component styles are the `pt-` classes of `src/styles/components.css`. The browsable reference, with guidelines per component, is published separately; its link is in `CLAUDE.md`.

## License

Proprietary. © Fixato di Scotucci Michele
