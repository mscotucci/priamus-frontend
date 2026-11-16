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
├── openapi/v1.json         Snapshot of the backend contract
├── scripts/                tokens.mjs, api-snapshot.mjs, api-types.mjs
└── src/
    ├── styles.css          Tailwind, tokens, Tailwind theme mapping, component styles
    ├── styles/             tokens.css and theme.css (generated), components.css
    └── app/                core/, features/, shared/
```

## Prerequisites

- Node.js 24 and npm 11
- The backend running on `http://localhost:5210` (`npm start` proxies `/api` to it, see `proxy.conf.json`; `npm run api:snapshot` reads its OpenAPI document from there)

## Quick start

```bash
npm install
npm start
```

The application opens on `http://localhost:4200` and talks to the backend on `http://localhost:5210` through the proxy, so start the backend first. The design system gallery is at `/design-system`.

## Checks

```bash
npm run lint
npm test
npm run build
npm run ds:check
```

## Design system

Change a token in `design-system/tokens.json`, then run `npm run tokens`. Component styles are the `pt-` classes of `src/styles/components.css`. The repository is the only source of the design system: the browsable reference is generated from it (tokens, component styles, gallery) with `npm run ds:reference`, which writes `dist/design-system-reference.html`, and is published from there; its link is in `CLAUDE.md`. The published page is never edited by hand. `npm run ds:check` verifies the rules that can be read from the files.

## License

Proprietary. © Fixato di Scotucci Michele
