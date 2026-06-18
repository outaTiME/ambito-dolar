# AGENTS.md - Agent Guide for ambito-dolar

Guide for coding agents in repo. Prefer minimal targeted edits. Preserve behavior unless asked.

## Repository Layout

- Monorepo: Yarn workspaces + Lerna (`packages/*`).
- `packages/core` (`@ambito-dolar/core`): shared domain utils (rates, dates, formatting, fetch helpers).
- `packages/client` (`@ambito-dolar/client`): Expo React Native app (iOS, Android, web).
- `packages/backend` (`@ambito-dolar/backend`): SST v4 backend (Lambda handlers).
- `packages/website` (`@ambito-dolar/website`): Gatsby website.

## Runtime and Tooling

- Node: `22` (`.nvmrc`).
- Yarn: `4.x` (root `packageManager`).
- Install: `yarn install`.
- Yarn linker: `node-modules` (`.yarnrc.yml`).

### Native code (client)

- **Android use CNG**: `packages/client/android/` regen by `expo prebuild`. Build output — no hand-edit. Modify via `app.config.ts` / config plugins.
- **iOS NOT use CNG**: `packages/client/ios/` checked-in, edit manual. Ships SwiftUI widgets under `packages/client/ios/RateWidgets`. SDK upgrade: apply iOS native diffs by hand in `packages/client/ios/` (see Expo upgrade helper). Widget integration into prebuild pending.
- **iOS prebuild safe without `--clean`**: `expo prebuild --platform ios` merges, preserves `RateWidgets` + manual Podfile/pbxproj diffs. `--clean` flag DOES clobber, never use it for iOS.

### iOS post-bump workflow

Run after `app.config.ts` version/buildNumber bump, dep bumps, or SDK upgrades that need native sync:

```bash
cd packages/client/ios && pod update && cd - && yarn run client:prebuild:ios
```

- `pod update` first refreshes Pods/Podfile.lock with current Podfile constraints (catches Hermes, RN core, transitive bumps).
- `prebuild` then syncs `app.config.ts` → `Info.plist` (CFBundleShortVersionString, CFBundleVersion) + `Expo.plist` + Podfile plugin specs.
- Order tested: prebuild without `--clean` preserves all manual edits.
- For major SDK bump where Podfile constraints themselves change (RN version etc.), prefer prebuild first → `pod update` after, so pod resolution reads the SDK-updated Podfile.

## Build, Lint, Test Commands

### Root commands

```bash
yarn install
yarn test
yarn depcheck
```

### Lint commands

Default: scoped lint on touched files from repo root.
`yarn eslint <paths-or-globs>`.
Examples:
`yarn eslint "packages/<workspace>/<path>/SomeFile.js"`
`yarn eslint "packages/<workspace>/{folderA,folderB}/**/*.{js,ts,tsx}"`
Avoid broad globs like `packages/<workspace>/**/*.{js,ts,tsx}` — traverse heavy folders (nested `node_modules`, build outputs), timeout.
`yarn exec eslint` may fail in monorepo — `eslint` only at root.
Fallback: `yarn node ./node_modules/eslint/bin/eslint.js <paths>`.

Avoid `yarn g:eslint` (runs `eslint .` from `INIT_CWD`). Traverses whole packages, slow. Reserve for explicit full-package lint.

Client also has:

```bash
yarn workspace @ambito-dolar/client run lint
yarn workspace @ambito-dolar/client run check
```

If `expo lint` fails with `Couldn't find a script named "eslint"`, use scoped root command above.

### Core (`packages/core`)

```bash
yarn workspace @ambito-dolar/core test
yarn workspace @ambito-dolar/core exec ava
```

Single test (preferred):

```bash
yarn workspace @ambito-dolar/core exec ava --match="Dates should use*"
yarn workspace @ambito-dolar/core exec ava test.js --match="Rates should parse*"
```

### Client (`packages/client`)

```bash
yarn client:start
yarn client:run:ios
yarn client:run:android
yarn client:doctor
```

### Backend (`packages/backend`)

```bash
yarn infra:start
yarn infra:deploy
yarn infra:remove
```

### Website (`packages/website`)

```bash
yarn website:start
yarn website:clean
yarn workspace @ambito-dolar/website run build
yarn workspace @ambito-dolar/website run serve
```

### Testing Notes

- Auto tests only in `packages/core` (AVA). `yarn test` runs `lerna run test` → core tests. Backend no test script.
- `packages/backend/src/routes/test.js` = API endpoint, not test.
- Fast feedback: AVA with `--match`, not full repo.

## Code Style and Conventions

### Formatting

- Prettier (`.prettierrc.json`): single quotes, semicolons, 2 spaces, bracket spacing.
- EditorConfig (`.editorconfig`): LF, UTF-8, trim trailing whitespace, final newline.
- Match nearby style before broad formatting changes.
- New comments lowercase default. Keep existing uppercase comments untouched unless editing that line.
- Comments terse, ASCII-only. No arrows (`→`), em-dashes (`—`), checkmarks, special chars — use plain words. No trailing period. One short sentence per `//` line. Multi-line context: consecutive `//` lines, not long prose with semicolons.
- No label-prefix comments like `// feature flag: ...`, `// android: ...`, or `// <tag>: <description>`. Write plain sentence describing what or why.
- Keep contiguous related statements compact (declarations, guards, memoized values, returns) — no blank lines. Separate only distinct logical phases.
- Always brace `if`/`else`/`for`/`while` bodies. No inline form (e.g. `if (x) return;` must be `if (x) { return; }`).

### ESLint presets

- Root/API: `universe/node`.
- Client: `universe/native`.
- Website: `universe/web`.

### Imports

- Order by group:
  1. third-party packages,
  2. workspace/internal packages,
  3. relative imports.
- Single blank line between groups.
- Follow surrounding file conventions for extension and aliasing.

### Modules and language

- JavaScript-first (most source `.js`).
- `packages/core` use ESM (`"type": "module"`).
- Many config files CommonJS (`module.exports`). No module system conversions unless asked.

### Naming

- Variables/functions: `camelCase`.
- React components: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Existing persisted keys, analytics events, API fields may use `snake_case` — keep stable.
- File naming mixed — match neighbors, no forced renames.
- Place new code in existing file when fits. New file only when no natural home.

### Types, schemas, and validation

- Prefer runtime validation at boundaries (API input, env vars, external payloads).
- Existing patterns: `joi`, `yn`, lodash guards, `prop-types` on website.
- Preserve public response shapes and persisted storage schema.

### TypeScript discipline (client)

- `tsconfig.json` runs `strict: false`, `noImplicitAny: false`. Implicit `any` allowed.
- **Goal: drop annotations when tsc infers fine. Never force a type just to remove an `any`.** If `: any` is the only annotation tsc needs, keep `: any` — do not replace with `: View`, `: TextInput`, `<{x:number;y:number}>` or other "real" types. Real types come later when the codebase migrates fully to TS, not as a side-effect of `any` cleanup.
- **Never add code to remove an `any`.** No `= undefined` / `= false` defaults on every destructured prop just to make them optional. No fake fields like `DEVICE_WIDTH: 0` to satisfy inference. No `_theme?` / `name?` optional params on methods that ignore them. If dropping a `: any` requires +5 lines of shim, the `: any` stays — 1 char beats 5 lines of fake defaults. Real shape fixes belong in a TS migration PR, not as a side-effect of cleanup.
- Drop explicit primitive annotations (`: number`, `: string`, `: boolean`) on params/returns where tsc still passes — they're cosmetic under `noImplicitAny: false`. Default values give better inference than `name: string = ''`. `(x = 0) => ...` over `(x: number = 0): number => ...`.
- Drop `Record<...>`, `Promise<...>`, `Array<...>` annotations on params/returns when tsc infers fine — these come back during the real TS migration, not as cleanup.
- Drop `useRef<ReturnType<typeof setTimeout> | null>(null)` → `useRef(null)`. The verbose generic was inference theater.
- Drop redundant `forwardRef<any, any>` generics when callsites still type-check without them.
- Do not add cosmetic annotations. No `: any`, `: number`, `: string` on callback params that infer fine. Drop the annotation.
- `forwardRef((props: any, ref: any))` stays as-is. Adding `forwardRef<View, any>` to drop `ref: any` trades 2 anys for 1 any + 1 forced type — forbidden.
- `.line<any>()`, `useAnimatedStyle<any>` stay as-is. Replacing with `.line<{x:number;y:number}>()` or `useAnimatedStyle<{transform:...}>()` is forcing types.
- `Settings` is typed `any` at `config/settings.ts:89`. Cast is load-bearing — `updateSettings` mutates the object adding dynamic fields (`CONTENT_WIDTH`, etc.) and several methods are called with args not in their inferred signature. Never drop `Settings: any`. Never wrap consumer call sites with `(Settings as any).foo` — `Settings.foo` already returns `any`.
- Exported component prop destructures `({a, b}: any) => ...` are the codebase convention. Keep `: any` on exported components — dropping forces all destructured props required and breaks callers. Drop `: any` only on internal helpers consumed by JSX in the same file (e.g. `const ButtonBase = ({onPress, children}) => ...`).
- Single-call internal callbacks (`onHandlerStateChange`, `useAnimatedReaction` reducers, etc.) drop the `: any` — the wrapping API types the arg.
- `useSelector((state: any) => state.x)` required in files without `@ts-nocheck` (no `TypedUseSelectorHook` defined). Files with `// @ts-nocheck` at top can use `(state)` directly.
- `useState<any>()` only when consumers read fields off the state object (otherwise it narrows to `undefined` and access fails). `useState()` with no generic is fine when state holds a primitive that the setter populates.
- `useRef<any>(...)` only when ref union types defeat inference. Prefer `useRef(null)` when the ref holds a single nullable value.
- `useAnimatedStyle<any>` is required because transform array literals create union types that don't match `DefaultStyle`. Do not drop.
- `Collapsible` (class component, untyped) needs `as any` for `children` prop. RN `Text`/`TextInput` need `as any` to assign `.defaultProps`. `MaterialCommunityIcons as any` is required for `NativeTabs.Trigger.VectorIcon` family prop.
- d3 chain (`.line()`, `.x()`, `.y()`) types each `datum` as `[number, number]` by default. Either type the data shape properly or keep `.line<any>()` plus `(datum: any)` casts.
- `forwardRef` two-arg shape: drop `ref: any` and let it infer from `forwardRef<RefType, PropsType>` generic. Adding `<any, any>` generic just to remove `ref: any` is a wash (1 cast for 2). Skip.
- Keep `as const` only when consumer requires literal types (`headerTitleAlign: 'center' as const`, tuple returns destructured by callers). Verify by removing and running `yarn workspace @ambito-dolar/client exec tsc --noEmit`.
- `screenOptions={...}` on `Stack` does not need `} as any` if `getStackScreenOptions` returns literal-typed values via `as const`.
- `Linking.openURL`, `Alert.alert`, `Share.share` and other RN platform APIs do not need wrappers. Use directly.
- Drop component aliases (`const Foo = Bar as any`) when the underlying component already exports `(props: any) => JSX` — import and use the component directly. Keep aliases only for `.defaultProps`, class components, or upstream-typed components missing your props.
- Before bulk-stripping casts: drop one, run `yarn workspace @ambito-dolar/client exec tsc --noEmit`, then proceed. Revert if it fails — the cast was load-bearing. Never replace one `any` with two (e.g. dropping `(props: any, ref: any)` and adding `forwardRef<any, any>` generic is a regression).

### Error handling and logging

- API handlers follow `Shared.wrapHandler(...)` + `Shared.serviceResponse(...)`.
- Use `try/catch` or explicit `.catch(...)` for async paths.
- Log actionable context with serializable metadata (`console.info`, `console.warn`, etc.).
- No silent error swallow unless intentional fallback.

### React/React Native guidance

- Side effects in hooks. Complete dependency arrays.
- No global refactors in navigation/state for small tasks.
- Preserve behavior across iOS, Android, web when touching client code.
- For date/time and formatting, reuse `@ambito-dolar/core` helpers.

### Navigation centralization (client)

- **All `router.X` calls live in `utilities/Navigation.ts`.** Never import `router` from `expo-router` anywhere else. Screens/components only import `Stack`, `Tabs`, `Slot`, `Redirect`, `SplashScreen`, `useNavigation` (for `setOptions`), `useLocalSearchParams`, `useFocusEffect`, `usePathname` from `expo-router`.
- Existing helpers: `goToX` (navigation), `goBack` (back with `canGoBack` guard), `dismissToTop` (pop stack with guard), `clearRouteParam(name)` (param-driven flow cleanup).
- New screen route → add a `goToX` helper. Modal variants get a separate helper (e.g. `goToDonate` for settings tab, `goToDonateModal` for root modal route).
- Use `router.navigate` (not `router.push`) inside helpers — dedupes duplicate destinations, prevents double-tap stacks.
- Param clearing after consuming a deeplink/intent (e.g. `focus=true`, `popToTop=true`) → `clearRouteParam('focus')`, not `router.setParams({ focus: undefined })` inline.

## Git, commits, and releases

- Conventional commits enforced (`@commitlint/config-conventional`). Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`. No scope in subjects.
- Preserve acronym/product casing (e.g. `CloudFront`, `S3`, `iOS`).
- Focused reversible commits. Separate by type. No mixing unrelated packages. No experimental or temporary changes.
- Generic chore subjects (no per-file detail): `chore: bump build number`, `chore: bump version and build number`, `chore: bump yarn`, `chore: bump dependencies`, `docs: update AGENTS rules`.
- `chore: remove unused code` for pure removals only. Refactors/restructures stay under `refactor:`.
- Release order at end of branch: `chore: bump version and build number` (touches only `app.config.ts` version+buildNumber, `ios/mbitoDlar/Info.plist` CFBundle keys, `ios/mbitoDlar/Supporting/Expo.plist`) → `chore: bump yarn` (touches only `.yarnrc.yml` and `packageManager` field in root `package.json`) → `chore: bump dependencies` (lockfiles, manifests, `Podfile.lock`, `project.pbxproj` when tooling-driven) → `chore: publish`.
- Exception: functional commit adds/drops specific dep → nest its `package.json` hunk in that commit instead of deferring to bulk bump.
- Version bump must match conventional commits across branch: major needs `BREAKING CHANGE:`, minor needs `feat:`, patch needs `fix:` only (no `feat:`).
- Lerna: independent versioning, release from `master`.

### No hunk splitting

- Always `git add <file>` (full file). Never `git add -p` / `git add --patch` / hunk-by-hunk staging. Past incident broke files and lost code fragments mid-flow.
- Exception: when release-order file ownership forces splitting (`app.config.ts`, `Info.plist`, `Expo.plist` have version+build lines that MUST go in `chore: bump version and build number` while other hunks go in the functional commit). Only in those 3 files.
- Always backup the WT first: `git diff --binary > /tmp/wt-backup.patch`. Restore with `git apply /tmp/wt-backup.patch` if anything goes wrong.

### Major SDK upgrade commit sequence

Expo SDK major bumps follow this commit chain:

1. `feat: update to Expo SDK <N>` with `BREAKING CHANGE:` footer — code migration, native diffs, plugins, import migration forced by lib breaking changes.
2. `docs: update AGENTS rules` if rule changes accompany the upgrade.
3. `chore: bump version and build number`.
4. `chore: bump yarn` (only if Yarn version changed).
5. `chore: bump dependencies`.
6. `chore: publish` (auto, via lerna).

Example `feat` body:

```
feat: update to Expo SDK 56

BREAKING CHANGE: upgraded to React Native 0.85
```

## Analytics and tracking policy

App open source, registered as not tracking user data beyond what required to measure feature usage and surface ops problems. Default: no tracking.

- Track only coarse action names. No event properties or context that profile user (no productId, rate type, input value, timing).
- Sentry for error capture and breadcrumbs only. Not analytics channel.
- No new tracking calls without explicit user-visible reason in related issue or PR.
- When in doubt, omit call.

## Rate rollout gating

New rate in development before stores approve client release:

- Backend (`packages/backend/src/subscribers/notify.js`): add new rate type to socials `_.omit(current_rates, [...])` so socials don't publish before clients render. Mark `// TODO: remove once vX.Y.Z is released`.
- Client (`packages/client/utilities/Helper.ts`): add conditional `// ...(Platform.OS === 'web' ? [AmbitoDolar.<TYPE>] : [])` inside `.omit([...])` chain so web export hides it. Mark `// TODO: remove once vX.Y.Z is released`.
- Backend version gate (`packages/backend/src/libs/shared.js`): set `MIN_CLIENT_VERSION_FOR_<TYPE> = 'X.Y.Z'`, apply where payloads/notifications dispatched.
- Verify social caption ≤300 chars with new rate (see Notification body).

When releasing gated rate after stores approve, delete only `// TODO: ...` line and specific rate entry. Preserve `_.omit([...])` block + `// rates to exclude...` comment placeholder. Empty omit chain stays as insertion point for next gated rate rollout.

## Notification body and social caption

`getBodyMessage` (`packages/backend/src/subscribers/notify.js`) feeds push body and social caption.

- Cap 300 chars: bsky `text` graphemes, reddit `title` chars. Reddit error misleading: `NO_TEXT: title required` when title >300.
- Rate format: `LABEL VALOR ↑PCT%` / `↓PCT%`. No colon, no parens, no trailing period. Rates with no change (e.g. CRIPTO) drop arrow+pct.
- Separator `, ` between rates. Cleanest in iOS push vs ` · ` or ` | `.
- Sort by absolute pct change DESC, biggest movers first. No-change rates (e.g. CRIPTO) treated as 0, land last.
- Arrows ↑↓ over `+/-` for peripheral scan in iOS push. Unicode native in SF Pro.
- Before adding new rate to socials, simulate caption with all active + new. Must ≤300 with ≥10 headroom.
- Headroom <10: compact more (drop "de jornada" from header, shorter labels) before merge.

## Donation modal policy

- Cooldown in distinct usage days, not wall-clock. Heavy users keep modal at steady cadence; casual users and sleepers respected.
- Single escalating schedule (`getCooldownDays` in `packages/client/utilities/Donation.ts`) governs first appearance and post-dismiss cooldown.
- Post-donate re-ask (`getReAskMs`) stays date-based, tiered by lifetime donated. Donors never penalized for low usage.
- Forced opens via Developer screen bypass cooldown but do not increment dismiss counter.
- Only two state fields back this policy: `ignore_donation_days_used` (snapshot of `days_used` at last dismiss) and `ignore_donation_count` (consecutive dismisses, resets on donate). Add new fields only with strong reason.

## Agent Operating Defaults

- `CLAUDE.md` imports this via `@AGENTS.md`. If other rule files added later (`.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`), treat as high-priority and update this guide.
- No rename/move files unless task needs.
- Run most relevant lint/test command for touched code before handoff. If full validation expensive, run scoped checks and report what executed.