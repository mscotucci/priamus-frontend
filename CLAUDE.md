# Priamus Trips frontend — instructions for Claude Code

## Core rules
- Think before coding: when a requirement is unclear, read the code; never guess silently, record assumptions.
- Simplicity first: the minimum code that solves the problem; no speculative abstractions or configurability.
- Surgical changes: touch only what the task needs; match the surrounding style; clean up only your own orphans.

## Read first
- `UX-CONTEXT.md` — reusable UX conventions, binding for every screen.
- The design system: tokens in `design-system/tokens.json`, component styles in `src/styles/components.css`, browsable reference with guidelines at https://claude.ai/artifact/SsxkRmu2wTZLahDdhgLfz4.
- Backend rules and domain terms (read, never copy): `D:\Priamus\priamus-trips-backend\docs\context.md` and `docs\glossary.md`.

## Checks
- `npm run lint` — ESLint, 0 errors and 0 warnings.
- `npm test` — `ng test --watch=false` (Vitest), all green.
- `npm run build` — production build, 0 errors.

## Conventions
- Stack: latest stable Angular, standalone, zoneless, signals-first; Tailwind CSS 4 for layout; the project's own design system for everything visual. No UI component library (no daisyUI, no Material).
- One application, two areas: the back-office (`features/backoffice/...`, desktop first) and the driver app (`features/driver/...`, phone and tablet first), each with its own layout, sharing `core/` and `shared/`.
- Layout of `src/app`: `core/` (config, i18n, api, auth, startup, layout, toast), `features/<area>/<feature>/` (pages, `*-api.ts`, `*-facade.ts`, `*.routes.ts`), `shared/components/<name>/`, `shared/guards/`. Create a folder only with its first file.
- Naming: no `.component`/`.service` suffixes (`user-list.ts`, class `UserList`); hyphen suffix for guards, interceptors, pipes (`role-guard.ts`); `*.routes.ts`, `*.model.ts`, `*.spec.ts`. Selector prefix `app-`.
- Idioms: `ChangeDetectionStrategy.OnPush`, `input()`/`output()`/`model()`, `inject()`, `@if`/`@for`, signals for state; reads through `httpResource`/`resource`, writes through `HttpClient`. No NgModules, no `BehaviorSubject` state, no constructor injection.
- Design system: a colour, radius, font or shadow never comes from a Tailwind default or a literal. Tokens live in `design-system/tokens.json`; `npm run tokens` regenerates `src/styles/tokens.css` and `src/styles/theme.css` (never edit those two by hand). A component's look is its `pt-` classes in `src/styles/components.css`; a screen lays components out with Tailwind utilities and does not restyle them. A missing component is added to the design system first, in the artifact and here together.
- Data boundary: no driver screen shows prices, rates or totals. The API does not send them to drivers; the frontend must not derive them either.
- Texts: no user-facing string in templates or code; every text is a lowercase dot-separated key in `public/i18n/it.json` used through the translate pipe. Code, comments, tests and docs are in English. The one exception is the developer gallery at `/design-system`.
- Auth: the application issues its own tokens (login with user name and password, refresh token rotation). Only `core/auth/` talks to the auth endpoints and holds tokens.
- Errors: `ApiError` has `kind` `domain` (body has `errorCode`, show backend `detail`, already in Italian), `validation` (body has `errors`), `generic` (show `errors.generic`). No `errorCode` to text dictionary.
- Types of the API come from the committed snapshot `openapi/v1.json`: `npm run api:snapshot` (backend running), then `npm run api:types`. Never hand-write a request or response type.
- Facade: one class per feature, provided by the feature's parent route component, never by route `providers` and never `providedIn: 'root'`; pages inject the facade only, never the API service, `HttpClient`, `Router` or toast.
- Tests: Vitest with `TestBed` and `provideHttpClientTesting()`; one `*.spec.ts` beside each unit with behaviour.
- `AC-n` ids appear only in test descriptions, never in production code or comments.
- `.plans/` is never committed.
