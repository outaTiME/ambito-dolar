# AGENTS.md - Agent Guide for ambito-dolar

Guide for coding agents. Minimal targeted edits. Preserve behavior unless asked.

## Repository Layout

- Monorepo: Yarn workspaces + Lerna (`packages/*`).
- `packages/core` (`@ambito-dolar/core`): shared domain utils (rates, dates, formatting, fetch helpers). ESM (`"type": "module"`).
- `packages/client` (`@ambito-dolar/client`): Expo React Native app (iOS, Android, web).
- `packages/backend` (`@ambito-dolar/backend`): SST v4 backend (Lambda handlers).
- `packages/website` (`@ambito-dolar/website`): Astro website (static landing).

## Runtime and Tooling

- Node `22` (`.nvmrc`). Yarn `4.x` (root `packageManager`). Install: `yarn install`. Linker: `node-modules` (`.yarnrc.yml`).

### Native code (client)

- **Android CNG**: `packages/client/android/` regen by `expo prebuild`. Build output, no hand-edit. Modify via `app.config.ts` / config plugins.
- **iOS NOT CNG**: `packages/client/ios/` checked-in, edit manual. Ships SwiftUI widgets under `packages/client/ios/RateWidgets`. SDK upgrade: apply iOS native diffs by hand (see Expo upgrade helper). Widget prebuild integration pending.
- **iOS prebuild safe without `--clean`**: `expo prebuild --platform ios` merges, preserves `RateWidgets` + manual Podfile/pbxproj diffs. `--clean` clobbers, never use for iOS.
- **Android nav bar (edge-to-edge)**: framework does not set button appearance. Use `expo-navigation-bar` — `<NavigationBar style="auto" />` in `RootLayout` + plugin `['expo-navigation-bar', { enforceContrast: true }]` for os scrim behind 3-button nav.

### iOS post-bump workflow

After `app.config.ts` version/build bump, dep bumps, or SDK sync:

```bash
cd packages/client/ios && pod update && cd - && yarn run client:prebuild:ios
```

- `pod update` first: refreshes Pods/Podfile.lock with current Podfile constraints (Hermes, RN core, transitive bumps).
- `prebuild` then: syncs `app.config.ts` to `Info.plist` (CFBundle keys) + `Expo.plist` + Podfile plugin specs. Without `--clean` preserves manual edits.
- Major SDK bump (Podfile constraints themselves change, RN version etc.): prebuild first then `pod update` after, so pod resolution reads the SDK-updated Podfile.

## Build, Lint, Test

### Commands

```bash
yarn install / yarn test / yarn depcheck                          # root
yarn client:start / client:run:ios / client:run:android / client:doctor
yarn infra:start / infra:deploy / infra:remove                    # backend
yarn website:start / website:clean                                # website
yarn workspace @ambito-dolar/website run build|preview
```

### Lint

- From repo root: `yarn eslint packages` lints all fast (~6s; generated dirs ignored in config). Or scope: `yarn eslint "packages/<ws>/<path>"`.
- `eslint` only at root; `yarn exec eslint` may fail. Fallback: `yarn node ./node_modules/eslint/bin/eslint.js <paths>`.
- Client also: `yarn workspace @ambito-dolar/client run lint|check`. If `expo lint` fails "Couldn't find a script named eslint", use scoped root cmd.

### Core tests (AVA)

```bash
yarn test                                                        # root, via lerna
yarn workspace @ambito-dolar/core exec ava
yarn workspace @ambito-dolar/core exec ava --match="Dates should use*"
```

- Auto tests only in `packages/core`. `yarn test` runs `lerna run test` to core. Backend no test script.
- Core `test` script is `eslint . && ava`, so `yarn workspace @ambito-dolar/core test` dies with `command not found: eslint` (same root-only eslint caveat). Go through root `yarn test` or `exec ava`.
- `packages/backend/src/routes/test.js` = API endpoint, not a test.
- Fast feedback: AVA `--match`, not full repo.

## Code Style

### Formatting

- Prettier (`.prettierrc.json`): single quotes, semicolons, 2 spaces, bracket spacing. `.astro` via `prettier-plugin-astro` (plugin + `*.astro` parser override).
- EditorConfig (`.editorconfig`): LF, UTF-8, trim trailing whitespace, final newline.
- Match nearby style before broad reformat.
- Comments: lowercase default, keep existing uppercase unless editing that line. Terse, ASCII-only, no arrows/em-dash/checkmarks/special chars. No trailing period. One sentence per `//`. Multi-line: consecutive `//`, not prose-with-semicolons.
- No label-prefix comments (`// feature flag:`, `// android:`, `// <tag>:`). Plain sentence describing what or why.
- Contiguous related statements compact, no blank lines within decls/guards/memo/returns. Blank line only between distinct logical phases.
- Always brace `if/else/for/while`. No inline (`if (x) { return; }`, not `if (x) return;`).

### ESLint presets

- Flat config `eslint.config.js` (ESLint 9). Base `universe/node`. Client `universe/native`. Website `.astro` via `eslint-plugin-astro`.
- Client override: React Compiler rules off (`react-hooks/{immutability,refs,set-state-in-effect,purity}`) — project not on compiler, they false-positive on Reanimated `.value` + intentional ref/effect patterns. Fix real prop reassigns, do not mute those.
- Ignores `web-build`/`android` (generated, gitignored; flat config ignores neither by default).

### Imports

- Groups, single blank line between: 1) third-party, 2) workspace/internal, 3) relative.
- Follow the file's extension/alias conventions.

### Naming and modules

- `camelCase` vars/fns, `PascalCase` components, `UPPER_SNAKE_CASE` constants.
- Persisted keys, analytics events, API fields may be `snake_case`, keep stable.
- File naming mixed, match neighbors, no forced renames. New code in existing file when it fits, new file only when no natural home.
- JS-first (`.js`). Many config files CommonJS. No module-system conversions unless asked.

### Validation

- Runtime validation at boundaries (API input, env vars, external payloads). Patterns: `joi`, `yn`, lodash guards.
- Preserve public response shapes + persisted storage schema.

### TypeScript discipline (client)

`tsconfig`: `strict:false`, `noImplicitAny:false`. Implicit `any` OK.

Core principle:

- Drop annotations tsc infers fine. Never force a type just to remove an `any` — if `:any` is the only annotation tsc needs, keep it (no `:View`, `:TextInput`, `<{x:number;y:number}>`). Real types come in the TS migration, not as any-cleanup side-effect.
- Never add code to remove an `any`: no fake defaults (`= undefined`/`= false`), fake fields (`DEVICE_WIDTH: 0`), or optional params (`_theme?`) methods ignore. 1 char `:any` beats 5 lines of shim.

Drop (tsc infers fine):

- Primitive annotations (`:number/:string/:boolean`), `Record/Promise/Array<>` on params/returns. Default values beat `name:string=''`.
- `useRef<ReturnType<typeof setTimeout>|null>(null)` to `useRef(null)`. Cosmetic callback param annotations.

Keep (load-bearing):

- `Settings:any` (`config/settings.ts`) — `updateSettings` mutates dynamic fields (`CONTENT_WIDTH` etc.), methods called with args outside inferred sig. Never drop. Never wrap callsites `(Settings as any).foo`, `Settings.foo` already returns `any`.
- Exported component `({a,b}:any)` — dropping forces all props required, breaks callers. Drop `:any` only on internal same-file helpers (`const ButtonBase = ({onPress,children}) => ...`).
- `useSelector((state:any) => state.x)` required unless file has `// @ts-nocheck`.
- `useState<any>()` only if consumers read fields off state (else narrows to undefined). `useRef<any>` only if union defeats inference, else `useRef(null)`.
- `useAnimatedStyle<any>`, `.line<any>()` + `(datum:any)` — transform array literals / d3 datum create union types that don't match. Don't drop.
- `as any` for: `Collapsible` children (untyped class), `Text`/`TextInput` `.defaultProps`, `MaterialCommunityIcons` for `NativeTabs.Trigger.VectorIcon`.
- Single-call internal callbacks (`onHandlerStateChange`, `useAnimatedReaction` reducers) drop `:any`, the wrapping API types the arg.

forwardRef:

- `forwardRef((props:any, ref:any))` stays. Don't add `<any,any>`/`<View,any>` generics to kill `ref:any`, 2-for-1 wash. Drop existing redundant `<any,any>` only if callsites still typecheck.

Direct use, no wrappers:

- RN platform APIs (`Linking.openURL`, `Alert.alert`, `Share.share`).
- Drop component aliases (`const Foo = Bar as any`) when underlying exports `(props:any)=>JSX`; keep alias only for `.defaultProps`/class/upstream-typed.
- `Stack screenOptions` no `} as any` if `getStackScreenOptions` returns literals via `as const`.

Verify before stripping: drop one cast, run `yarn workspace @ambito-dolar/client exec tsc --noEmit`, revert if fails (cast was load-bearing). Never swap 1 `any` for 2. `as const` keep only if consumer needs literal (verify by removing + tsc).

### Error handling and logging

- API handlers: `Shared.wrapHandler(...)` + `Shared.serviceResponse(...)`.
- `try/catch` or `.catch(...)` on async. Log actionable serializable metadata (`console.info/warn`). No silent swallow unless intentional fallback.

### React Native

- Side effects in hooks, complete dep arrays. No global nav/state refactors for small tasks.
- Preserve iOS/Android/web behavior. Date/time + formatting via `@ambito-dolar/core` helpers.
- **Android modal bottom inset**: native-stack modals lack the bottom safe-area inset, content slips under the transparent nav bar. `FixedScrollView` pads via `isModal` prop, new scrolling modal screen must pass it.
- `isModal` computed once in `withContainer` (from `useLocalSearchParams`), threaded as prop down the tree. Never re-call `useLocalSearchParams` for it in nested components.

### Navigation centralization (client)

- **All `router.X` calls in `utilities/Navigation.ts`.** Never import `router` from `expo-router` elsewhere. Screens/components import only `Stack`, `Tabs`, `Slot`, `Redirect`, `SplashScreen`, `useNavigation` (setOptions), `useLocalSearchParams`, `useFocusEffect`, `usePathname`.
- Helpers: `goToX` (nav), `goBack` (guarded), `dismissToTop` (guarded pop), `clearRouteParam(name)`.
- New route to a `goToX` helper. Modal variant = separate helper (`goToDonate` settings tab vs `goToDonateModal` root modal). Use `router.navigate` not `push` (dedupes, prevents double-tap stacks).
- Clear a consumed deeplink/intent param (`focus=true`, `popToTop=true`) via `clearRouteParam('focus')`, not inline `router.setParams({focus: undefined})`.

## Git, commits, and releases

- **Commit and push directly to `master` by default.** Only branch or open a PR when the user explicitly asks. Never branch on your own from the generic harness default "if on the default branch, branch first" — that default does NOT apply here.
- Conventional commits (`@commitlint/config-conventional`). Types: `feat/fix/refactor/chore/docs/test`. No scope in subjects.
- Subject only, no body (body reserved for `BREAKING CHANGE:` footer). Preserve acronym/product casing (`CloudFront`, `S3`, `iOS`).
- Subject names the real problem/effect, not the mechanism: `fix: unreadable android navigation bar in light mode`, not `fix: theme android navigation bar`.
- Preventive fix: `fix: prevent <effect>` (`fix: prevent expo-server-sdk v6 bundle break in notification lambdas`, `fix: externalize puppeteer-core to prevent social lambda crash`). Present tense (`X breaks`) only when the break actually happened.
- `chore: remove unused code` = pure removals only; refactors/restructures stay `refactor:`.
- Generic chore subjects (no per-file detail): `chore: bump build number` / `bump version and build number` / `bump yarn` / `bump dependencies`. `docs: update AGENTS rules`.
- Focused reversible commits, separate by type. No mixing unrelated packages. No experimental or temporary changes.
- Semver alignment across branch: major needs `BREAKING CHANGE:`, minor needs `feat:`, patch needs `fix:` only (no `feat:`).
- Lerna independent versioning, release from `master`.

### Release order (branch tail)

`chore: bump version and build number` (only `app.config.ts` version+buildNumber, `ios/mbitoDlar/Info.plist` CFBundle keys, `ios/mbitoDlar/Supporting/Expo.plist`) → `chore: bump yarn` (only `.yarnrc.yml` + `packageManager` field in root `package.json`) → `chore: bump dependencies` (lockfiles, manifests, `Podfile.lock`, `project.pbxproj` when tooling-driven) → `chore: publish`.

- Single-dep functional change may own its whole `package.json` if the file has no other pending bumps. Manifest mixing many bumps (SDK upgrade) → whole file to the dominant commit, no hunk split.
- Yarn bump colliding with dep bumps in the same `package.json` (no `.yarnrc.yml` change) → `packageManager` field rides in `chore: bump dependencies`, no separate `chore: bump yarn`.

### No hunk splitting

- Always `git add <file>` (full file). Never `git add -p`/`--patch`, past incident broke files and lost fragments.
- Exception (only `app.config.ts`/`Info.plist`/`Expo.plist`): version+build lines MUST go to `chore: bump version and build number` while other hunks go to the functional commit.
- Backup WT first: `git diff --binary > /tmp/wt-backup.patch`. Restore: `git apply /tmp/wt-backup.patch`.

### Major SDK upgrade sequence

1. `feat: update to Expo SDK <N>` + `BREAKING CHANGE:` footer (`BREAKING CHANGE: upgraded to React Native 0.85`) — code migration, native diffs, plugins, forced import migration.
2. `docs: update AGENTS rules` if rules change with the upgrade.
3. `chore: bump version and build number`.
4. `chore: bump yarn` (only if Yarn changed).
5. `chore: bump dependencies`.
6. `chore: publish` (auto, via lerna).

## Analytics and tracking policy

Open source, registered as not tracking user data beyond feature usage + ops problems. Default: no tracking.

- Coarse action names only. No properties/context that profile user (no productId, rate type, input value, timing).
- Sentry = error capture + breadcrumbs only, not an analytics channel.
- No new tracking without explicit user-visible reason in issue/PR. When in doubt, omit.

## Rate rollout gating

New rate in development before stores approve client release:

- Backend `subscribers/notify.js`: add rate type to socials `_.omit(current_rates, [...])` so socials don't publish before clients render. Mark `// TODO: remove once vX.Y.Z is released`.
- Client `utilities/Helper.ts`: add `// ...(Platform.OS === 'web' ? [AmbitoDolar.<TYPE>] : [])` in `.omit([...])` chain so web export hides it. Same TODO.
- Version gate `libs/shared.js`: `MIN_CLIENT_VERSION_FOR_<TYPE> = 'X.Y.Z'`, apply where payloads/notifications dispatched.
- Verify social caption ≤300 chars with new rate.

Release after approval: delete only the `// TODO:` line + that rate entry. Preserve `_.omit([...])` block + `// rates to exclude...` comment placeholder as insertion point for next gated rate.

## Notification body and social caption

`getBodyMessage` (`subscribers/notify.js`) feeds push body + social caption.

- Cap 300 chars: bsky `text` graphemes, reddit `title` chars. Reddit error misleading: `NO_TEXT: title required` when title >300.
- Format: `LABEL VALOR ↑PCT%` / `↓PCT%`. No colon, no parens, no trailing period. No-change rates (CRIPTO) drop arrow+pct.
- Separator `, ` (cleanest in iOS push vs ` · ` or ` | `). Sort by absolute pct DESC, biggest movers first, no-change rates land last.
- Arrows ↑↓ over `+/-` for peripheral scan (SF Pro native). Before adding a rate: simulate caption with all active + new, must ≤300 with ≥10 headroom. Headroom <10 → compact (drop "de jornada", shorter labels) before merge.

## Android widgets

`react-native-android-widget`. Widget tree in `packages/client/widgets/`, declared in the plugin block of `app.config.ts`.

- **Entry point**: `main` is `./index.js`, NOT `expo-router/entry`. `registerWidgetTaskHandler` + `registerWidgetConfigurationScreen` must run at bundle eval, expo-router loads routes lazily so `app/_layout` never runs headless. Do not revert `main` on an SDK bump.
- **Numeral delimiters**: `getWidgetProps` sets them from `expo-localization`. `AppContainer` does it for the app but never mounts in the headless task or the config activity, and without it those paths format with the core `es` defaults (`1.520,49` vs `1,520.49`).
- **Widget components are NOT React components.** `buildWidgetTree` calls them as plain functions (`jsxTree.type(jsxTree.props)`), outside the renderer. No hooks, no state, no context, no `Helper.useTheme`, and never wrap them in an HOC (`Sentry.wrap`, `compose`) — the wrapper's own hooks throw `Invalid hook call`. Pure function of props, everything precomputed in `getWidgetProps`. Applies to `renderWidget` and to `WidgetPreview` alike. If React Compiler is ever enabled, widget files need `'use no memo';` at the top.
- **One component for every widget**, `widgets/WidgetCard.tsx`. `rows` switches it to the list layout, otherwise it lays out title / detail / gap / small / big / date. The difference between widgets lives in the props builders of `widgets/index.tsx` (`WIDGETS`), never in a second component. Sizes are the ios ones scaled by 0.8235 (`RateWidgets.swift` 26/20/16/14/11 to 21.4/16.5/13.2/11.5/9).
- **`buildWidgetTree` flattens children only one level** (`Array.isArray(children) ? children : [children]`). A `.map()` has to be the only child of its parent, mixing it with siblings nests arrays and breaks the tree.
- **Widget order in the picker follows the labels, not the declaration.** `WIDGET_NAMES` and the `app.config.ts` entries follow the ios bundle order (`RateWidgets.swift`, Rate then List then Spread) and drive our own code and the in app preview, but the Pixel launcher sorts by label and hoists the last one alphabetically into the wide hero row. Measured twice: two different declaration orders gave the same picker, and renaming the labels to `Zzz`/`Aaa`/`Mmm` without touching the declaration reordered it. Labels have to match `.configurationDisplayName(...)`, so the picker order is not ours to pick, do not reshuffle the entries chasing it.
- **Layout from `widgetInfo`**: card is a square of `min(width, height)`, cells are not square. Never `match_parent` on the card, and keep the `|| DEFAULT_WIDGET_SIZE` fallback, some launchers report 0.
- **Redraw triggers**: `WIDGET_ADDED`/`WIDGET_UPDATE`/`WIDGET_RESIZED` (headless, hits `/fetch`), `reloadWidgets` from `AppContainer` (store data, foreground only), config save. `updatePeriodMillis` floor is 30 min, Android ignores anything lower. `adb shell am broadcast APPWIDGET_UPDATE` is a protected broadcast, does NOT work to force a redraw.
- **`previewImage`**: regenerate from a live device with `node scripts/widget-preview.js assets/widgets/android-rate-2x2.png [--device serial]`, ImageOptim after, `expo prebuild` last (script overwrites, prebuild copies to `res/drawable`). Library has no `previewLayout` support so the PNG is used on every API level. The script segments cards on both axes, so the source can be the home screen or the in app preview (`screens/RateWidgetPreviewScreen.tsx`, every widget with its defaults, at about the size a 2x2 cell reports).
- **Retired rate types**: a type dropped from `getAvailableRateTypes` stops coming from `/fetch`, and a widget configured with it would render nothing forever. `getWidgetProps` filters the config against the payload and falls back to `empty` when fewer than `min` survive, same as the ios `compactMap`. `min` is per widget, the Spread needs both sides.
- Android cannot re-render a widget on system theme change (upstream #36, no `onUpdate` callback). Widgets are forced dark like iOS. Adaptive theming needs `renderWidget({light, dark})`, dual bitmaps, not a repaint.

### Config screen

`ConfigurationScreen` (`widgets/ConfigurationScreen.tsx`, registered via `registerWidgetConfigurationScreen`) runs inside `RNWidgetConfigurationActivity`, a **separate React root**. Not the app. `widgets/index.tsx` keeps the logic (props builders, task handler) so the headless task never pulls in the screen.

- Library contract, upstream issue #74: "a small separate app with one screen, stores/context will need to be provided again". Isolation is by design, not a gap. Do not fight it.
- No router, no redux store, no app providers. Screen mounts its own `GestureHandlerRootView` + `SafeAreaProvider` + styled-components `ThemeProvider` + RN `StatusBar`.
- Never mount `<NavigationBar>` (`expo-navigation-bar`) here. `style` is a no-op with the plugin `enforceContrast: true`, it mutates module level state shared with the app, and its unmount reset rejects with `The current activity is no longer available` once the activity is gone.
- Never reuse components pulling react-navigation context. `HeaderButton` crashes `Couldn't find a theme`. Plain `Pressable` + `MaterialIcons`/`Text` instead.
- No store: rates come from `Settings.API_URL + '/fetch'`, one call per save. Per-widget config in AsyncStorage key `<widgetName>:<widgetId>:config`, cleaned on `WIDGET_DELETED`.
- Bottom inset: use `FixedScrollView isModal`, activity is not the app and misses the app chrome.
- Activity generated with no `android:configChanges`. Live system theme switch while open does not repaint, fixed on reopen. Do NOT patch the manifest, tried and reverted: trades content staleness for nav bar staleness and pushes the activity away from the isolation contract.
- Activity sets `RESULT_CANCELED` on create, so system back drops a freshly added widget. Confirm control must be affirmative (`Listo`), never an X or a back arrow. `setResult('ok')` is what keeps the widget.

#### Rate picker sheet

`SlotsSection` renders N ordered rows over one option list, each opening `PickerSheet`, a Material `ModalBottomSheet` (`@expo/ui/jetpack-compose`) hosting our own `CardView` rows. Every widget uses it: one rate slot for Rate, two for Spread, three for List, plus a one slot `Mostrar` section wherever ios has the `valueType` parameter (all but Spread). No widget gets its own config layout.

Stored config is `{ rateTypes: [...], value }` for every widget, the widget entry defaults filled in by `getConfig` (`widgets/index.tsx`), the one place every surface reads a config through. Picking a rate another slot already holds swaps them, so a widget never shows the same rate twice.

- **`Host` needs an explicit width.** It sits inside the content container, so `left: 0, right: 0` resolves against `CONTENT_WIDTH`, not the screen, and the sheet renders narrow and pushed left. Use `useWindowDimensions().width`.
- **`RNHostView` needs `matchContents` + `fillMaxWidth()`.** Without the modifier the host measures the rn content unconstrained and the card collapses to a third of the sheet.
- **The sheet inherits no app chrome.** Its own `GestureHandlerRootView` (separate native window, the `RectButton` rows are dead without it), its own `ThemeProvider`, and `ContentView` around the card, whose margin pairs with the `CardView` one to make up `PADDING`. Skipping `ContentView` leaves half the app margin.
- **The sheet grows with its content and has no cap of its own**, so on short devices it runs off both screen edges and the last rows are unreachable. The list caps itself with `ScrollView maxHeight: height * 0.75`.
- **Visibility follows mounting**, there is no `visible` prop. Unmounting on select skips the exit animation, so await `ref.hide()` (resolves after the animation) and apply the change in `then`.

## Copy register and widget picker text

- **Voseo everywhere.** App I18n is rioplatense voseo (`Elegí`, `verificá`, `Tenés`). No tuteo (`Elige`, `verifica`, `Tienes`). Applies to iOS Swift strings too.
- **iOS is the base for meaning, not for format.** New Android widget copy derives verb + noun from the iOS `.description(...)`, never invented fresh.
- iOS `.description(...)` (`ios/RateWidgets/RateWidgets.swift`): full sentence, trailing period. Apple style.
- Android `description` (`app.config.ts` widget entry): imperative, **no trailing period**, 4-8 words. Android picker style, matches system widgets (Battery `See battery info for your devices`, Chrome `Quickly start a search in Chrome`, Clock `Choose cities in the Clock app`).
- Android drops the iOS filler, keeps the verb: iOS `Consultá las cotizaciones a lo largo del día.` → Android `Consultá las cotizaciones del día`.
- `label` (Android) and `.configurationDisplayName(...)` (iOS) identical string.
- Config section titles come from the iOS intent parameter display names (`ios/RateWidgets/Base.lproj/RateWidgets.intentdefinition`, read with `plutil -convert xml1`): Rate `Cotización` + `Mostrar`, list `Cotizaciones` + `Mostrar`, Spread `Cotizaciones`. Singular when the widget takes one rate, plural when it takes several.
- Android description shorter than the current one is always safe, no hard length cap but picker truncates.

## Donation modal policy

- Cooldown in distinct usage days, not wall-clock. Heavy users steady cadence, casual users + sleepers respected.
- Single escalating schedule `getCooldownDays` (`utilities/Donation.ts`) governs first appearance + post-dismiss cooldown.
- Post-donate re-ask `getReAskMs` date-based, tiered by lifetime donated. Donors never penalized for low usage.
- Forced opens via Developer screen bypass cooldown but don't increment dismiss counter.
- Only two state fields: `ignore_donation_days_used` (snapshot of `days_used` at last dismiss), `ignore_donation_count` (consecutive dismisses, resets on donate). New fields only with strong reason.

## Agent Operating Defaults

- `CLAUDE.md` imports this via `@AGENTS.md`. New rule files (`.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`) → treat high-priority, update this guide.
- No rename/move files unless task needs. Run the most relevant scoped lint/test for touched code before handoff, report what ran.
