# AGENTS.md - Agent Guide for ambito-dolar

This guide is for coding agents operating in this repository.
Prefer minimal, targeted edits and preserve existing behavior unless explicitly asked.

## Repository Layout

- Monorepo: Yarn workspaces + Lerna (`packages/*`).
- `packages/core` (`@ambito-dolar/core`): shared domain utilities (rates, dates, formatting, fetch helpers).
- `packages/client` (`@ambito-dolar/client`): Expo React Native app (iOS, Android, web).
- `packages/backend` (`@ambito-dolar/backend`): SST v4 backend (Lambda handlers).
- `packages/website` (`@ambito-dolar/website`): Gatsby website.

## Runtime and Tooling

- Node: `22` (`.nvmrc`).
- Yarn: `4.12.0` (root `packageManager`).
- Install: `yarn install`.
- Yarn linker: `node-modules` (`.yarnrc.yml`).

## Build, Lint, Test Commands

## Root commands

```bash
yarn install
yarn test
yarn depcheck
```

## Lint commands

Important: `yarn g:eslint` runs `eslint .` from `INIT_CWD`.
Run it from the package directory you want to lint.
For large changes, prefer scoped lint on touched files from the repo root using:
`yarn eslint <paths-or-globs>`.
Examples:
`yarn eslint "packages/<workspace>/<path>/SomeFile.js"`
`yarn eslint "packages/<workspace>/{folderA,folderB}/**/*.{js,ts,tsx}"`
Avoid broad globs like `packages/<workspace>/**/*.{js,ts,tsx}` because they may traverse heavy folders (e.g. nested `node_modules`, build outputs) and cause timeouts.
`yarn exec eslint` may fail in this monorepo because `eslint` is only installed at the root.
If needed, fallback to `yarn node ./node_modules/eslint/bin/eslint.js <paths>`.
Use full-package lint only when needed.

```bash
yarn g:eslint
```

Client also has:

```bash
yarn workspace @ambito-dolar/client run lint
yarn workspace @ambito-dolar/client run check
```

If `expo lint` fails with `Couldn't find a script named "eslint"`, use the scoped root command above.

## Core (`packages/core`)

```bash
yarn workspace @ambito-dolar/core test
yarn workspace @ambito-dolar/core exec ava
```

Single test (preferred patterns):

```bash
yarn workspace @ambito-dolar/core exec ava --match="Dates should use*"
yarn workspace @ambito-dolar/core exec ava test.js --match="Rates should parse*"
```

## Client (`packages/client`)

```bash
yarn client:start
yarn client:run:ios
yarn client:run:android
yarn client:doctor
```

## Backend (`packages/backend`)

```bash
yarn infra:start
yarn infra:deploy
yarn infra:remove
```

Note: there is no dedicated package-level test script in `packages/backend/package.json`.

## Website (`packages/website`)

```bash
yarn website:start
yarn website:clean
yarn workspace @ambito-dolar/website run build
yarn workspace @ambito-dolar/website run serve
```

## Testing Notes

- Automated tests currently live in `packages/core` (AVA).
- `yarn test` runs `lerna run test`, which currently resolves to core tests.
- `packages/backend/src/routes/test.js` is an API endpoint, not a test file.
- If you need fast feedback, run AVA with `--match` rather than full repo tests.

## Code Style and Conventions

## Formatting

- Prettier (`.prettierrc.json`): single quotes, semicolons, 2 spaces, bracket spacing.
- EditorConfig (`.editorconfig`): LF, UTF-8, trim trailing whitespace, final newline.
- Keep file style consistent with nearby code before applying broad formatting changes.
- Write new comments in lowercase by default; keep existing uppercase comments untouched unless you are already editing that line.
- Inside short/medium function bodies, keep contiguous statements compact (declarations, guards, and immediate returns) without extra blank lines.
- Do not insert blank lines between sequential declarations, memoized values, or closely related assignments unless they form clearly separate logical phases.
- In render methods/components, avoid visual padding blank lines between local style objects and immediate conditionals; keep the block dense and consistent with surrounding code.

## ESLint presets

- Root/API: `universe/node`.
- Client: `universe/native`.
- Website: `universe/web`.

## Imports

- Order imports by group:
  1. third-party packages,
  2. workspace/internal packages,
  3. relative imports.
- Keep a single blank line between groups.
- Follow surrounding file conventions for extension usage and aliasing.

## Modules and language

- Project is JavaScript-first (most source is `.js`).
- `packages/core` uses ESM (`"type": "module"`).
- Many config files use CommonJS (`module.exports`); do not convert module systems unless requested.

## Naming

- Variables/functions: `camelCase`.
- React components: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Existing persisted keys, analytics event names, and API fields may use `snake_case`; keep them stable.
- File naming style is mixed; match neighboring files instead of forcing renames.

## Types, schemas, and validation

- Prefer runtime validation at boundaries (API input, env vars, external payloads).
- Existing patterns include `joi`, `yn`, lodash guards, and `prop-types` on website.
- Preserve public response shapes and persisted storage schema.

## Error handling and logging

- API handlers should follow `Shared.wrapHandler(...)` + `Shared.serviceResponse(...)` patterns.
- Use `try/catch` or explicit `.catch(...)` for async paths.
- Log actionable context with serializable metadata (`console.info`, `console.warn`, etc.).
- Do not silently swallow errors unless there is an intentional fallback path.

## React/React Native guidance

- Keep side effects inside hooks and include complete dependency arrays.
- Avoid unnecessary global refactors in navigation/state for small tasks.
- Preserve behavior across iOS, Android, and web when touching client code.
- For date/time and formatting behavior, reuse `@ambito-dolar/core` helpers.

## Git, commits, and releases

- Conventional commits are enforced (`@commitlint/config-conventional`).
- Use commit types like `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.
- Keep commits focused and reversible; avoid mixing unrelated package changes.
- Lerna is configured with independent versioning and release flow from `master`.

## Agent rule files

Checked in this repository:

- `CLAUDE.md`: present (imports this file via `@AGENTS.md`).
- `.cursor/rules/`: not present.
- `.cursorrules`: not present.
- `.github/copilot-instructions.md`: not present.

If any of these are added later, treat them as high-priority agent instructions and update this guide.

## Agent Operating Defaults

- Prefer smallest safe change that solves the user request.
- Do not rename/move files unless needed for the task.
- Run the most relevant lint/test command for touched code before handoff.
- If full validation is expensive, run scoped checks and clearly report what was executed.
