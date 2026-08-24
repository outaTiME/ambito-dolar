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
- **`eslint` and `prettier` run from the repo root only.** `packages/client` sets `installConfig.hoistingLimits: workspaces`, so its `.bin` holds `tsc` and nothing else. Calling them anywhere else, including after a `cd` into a workspace inside the same command, answers `Couldn't find a script named "eslint"`. Mirror case: `tsc` needs the client, `yarn workspace @ambito-dolar/client exec tsc --noEmit`.
- Fallback if the root call itself fails: `yarn node ./node_modules/eslint/bin/eslint.js <paths>`.
- Client also: `yarn workspace @ambito-dolar/client run lint|check`. `expo lint` fails with the same message, use the scoped root cmd.

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

Native, in the local expo module `packages/client/modules/widgets/`. RemoteViews and XML layouts, no react-native and no Compose. Android stays CNG: `packages/client/android/` is generated, only the module is checked in, and autolinking merges its manifest and its `res/` into the app, so no config plugin is needed.

- **Three providers over one base.** `WidgetProvider` holds the machinery: `goAsync`, the executor, the fetch, the empty state, the deep link, the android 15 preview, the cleanup on delete. `RateWidget`, `ListWidget` and `SpreadWidget` only declare their defaults, label, empty text, layout and how they fill the slots. A fourth widget is one file that size.
- **Two layouts, not three.** `widget_card.xml` is the six slots every ios systemSmall card lays out, title / detail / gap / small / big / date, and serves the rate and the spread: what changes is which value lands on which slot and which one carries the change color. `widget_list.xml` is the three rate one. `Content.Card` and `Content.Rows` pick between them.
- **The card is square** through an ImageView with `adjustViewBounds` over a 1:1 shape drawable. Never `match_parent` on the card. Sizing the card from what the launcher reports is unreliable, measured on two phones: a Moto Edge 30 Ultra cropped 16dp and a Galaxy S9 scaled to 78%.
- **One role, one size, every widget, in `Sizes.kt`.** The ios point sizes of `RateWidgets.swift` scaled by a single factor, `1.05`, which is the one the card was measured at against the iphone: glyph height over card width, a ratio independent of screen and density. Title 20, detail 14, change 14, value 26, row name 14, row value 16, row change 11, and the two ios keeps identical on every widget, date 11 and empty 14. dp and not sp on purpose, so the system font scale does not move them, which is what `sizeCategory large` does on ios. A new widget picks its roles from there and adds none: the drift that put the same date at 12.1 on the card and 12.7 on the list came from tuning each layout on its own.
- **One role, one color, every widget.** `widget_foreground` for the names, titles and values, `widget_secondary` for the subtitles and for the date, and the change color only on the percentage. Checked slot by slot against `RateWidgets.swift`, where it is `fgColor`, `fgSecondaryColor` and `changeColor`. The fixed roles live in `views()`; which slot carries the change color is the one thing each widget declares, because ios colors the small one on the rate and the big one on the spread. The date is `#8E8E93` on all three, verified on the render and not only in the source: a date that looks lighter on one widget is antialiasing at a smaller size or the launcher scaling that widget down, never a different color.
- **The box is the one a TextView reserves by default**, top to bottom of the font and not just ascent to descent, which `setIncludePad` keeps. The list lines used to turn that padding off because Roboto reserved room ios does not, and once the text is drawn with FiraGO the two boxes are within two pixels, so there is no exception left to carry.
- **Gated to api 26** with `android:enabled="@bool/widget_supported"` plus a `values-v26` override, because `Resources.getFont` is api 26 and the text is drawn with it. Below that the launcher never lists the widgets.
- **Custom font: `android:fontFamily` does NOT work here.** The launcher inflates the RemoteViews in its own process and resolves only system typefaces, so the font falls back without a word or a log line. Measured on four devices: it holds on One UI and fails on the pixel launcher, on motorola and on the emulator, which is why it looked fine on the one phone it was checked on. Not a format problem either, a `.ttf` fails the same as the `.otf`.
- **The text is drawn on our side and travels as a bitmap**, which is what every widget with its own font does. `TextBitmap.of()` is the single routine every slot goes through, so a fourth widget writes no render code. Only the glyphs are pixels: the card, its corners and the whole layout stay real views, which is why nothing here needs the widget size the launcher reports badly, unlike the library this replaced. Around 325 KB of bitmaps per list redraw against a 1 MB binder ceiling, and an `ALPHA_8` mask would cut that to a quarter if it ever gets close.
- The font file is not duplicated, a Copy task in the module `build.gradle` brings it from `assets/fonts/` at build time, the same way the ios pbxproj references it once for two targets. It is referenced from exactly one place now, `TextBitmap`, and `Resources.getFont` is api 26, so the gate still holds.
- **Redraw triggers**: `APPWIDGET_UPDATE`, `MY_PACKAGE_REPLACED`, `LOCALE_CHANGED` and `TIMEZONE_CHANGED`, all through `goAsync` and all hitting `/fetch`, plus `reloadWidgets()` from `AppContainer` and the config save. The last two are there because the separators come from the locale and the time from the zone, both read at render time, so without them a change leaves the widget wrong for up to half an hour. `updatePeriodMillis` is 0: it is an alarm and fires with no network, which is why those redraws died in milliseconds on a doze wake. The periodic one is a WorkManager `PeriodicWorkRequest`, 30 min with 10 min flex behind a network constraint, which is what google points a widget that needs the network at. Ours was a `JobScheduler` first and it hand rolled unique work, the reboot, the constraint, cancelling and a version stamp: three of the bugs found in review were in exactly those, so the library owns them now. `adb shell am broadcast APPWIDGET_UPDATE` is protected and does NOT force a redraw, call `provider.refresh(context)`.
- **An app update re-inflates every widget from `initialLayout`**, which is why `MY_PACKAGE_REPLACED` is handled: without it they sit there up to half an hour. Measured at 2 to 6 seconds. That initial state is the bare card and not the unavailable text, because in those seconds the rates are loading, not missing.
- **The endpoint is not hardcoded.** The module `build.gradle` emits `widget_api_url` from the same `API_URL` the app reads, falling back to production, so a host change does not leave the widgets talking to the old one. A plain gradle build with no environment gets the fallback.
- **One `/fetch` for a burst.** `RatesApi` caches the payload 60s and a failure for 10, long enough to absorb the burst of three providers behind a service that is down and short enough not to sit on the failure once the network is back, so a burst behind a service that is down does not retry at eight seconds a piece past the ten the receiver gets. ios has the same 60s window in `getRates()`, on disk instead of in memory because each reload there can be a separate extension invocation while the three android providers share the app process, and the same four second timeout with a bounded wait so a stalled call does not hold the extension until the system kills it. It collapses the timeline, snapshot and placeholder of the three widgets into one request, and the preview keeps showing real rates because what it serves is the payload, not a sample.
- **Neither side stores what it cannot use.** Android requires the parse to yield at least one known rate before replacing the persisted payload, and ios requires a 2xx plus at least one known rate, because an error body is valid json too and taking it would blank the widgets and leave that body as the fallback for the next failure.
- **A failed fetch leaves the widget as it was**: `render` returns early on null and never calls `updateAppWidget`, so the launcher keeps the last views it got. ios does the same through a `UserDefaults` fallback in `getRates()`.
- **Nothing is cached across a locale change.** The `DecimalFormat` is built per call and not held in a lazy, which would freeze the separators of whatever locale was set the first time a widget drew.
- **A `/fetch` schema change goes to ios first**, see the sync section below. The timestamp is the one already guarded there, because `ISO8601DateFormatter` with its default options rejects fractional seconds and the backend growing milliseconds is one deploy away.
- **Unknown rate types are dropped at parse time.** The service still sends `qatar` and `ahorro`, retired and commented out in `Helper.swift`, and without the filter the widget titles a rate with its raw id. `Format.isKnown` is the same check as the ios `Helper.getRateTypes().contains`.
- **Retired rate types**: survivors keep their order and compact to the top, the blank slots pad the bottom, same as the ios `compactMap`. The spread needs both sides or it goes empty, the list only goes empty when none of the three survives.
- **Widget order in the picker follows the labels, not the declaration.** The launcher sorts alphabetically. Measured twice: two declaration orders gave the same picker, and renaming the labels to `Zzz`/`Aaa`/`Mmm` reordered it. Labels have to match `.configurationDisplayName(...)`, so the order is not ours to pick.
- **`previewImage`**: regenerate from a live device with `node scripts/widget-preview.js assets/widgets/android-rate-2x2.png [--device serial]`, ImageOptim after, `expo prebuild` last. The module `build.gradle` copies the three pngs into `drawable-nodpi`. From android 15 `setWidgetPreview` replaces them at runtime with the real rates, capped at two calls per hour per provider.
- Android cannot re-render a widget on a system theme change, so they are forced dark like ios.
- **Logs**: `adb logcat -s AmbitoWidgets` prints nothing on One UI even with the lines in the
  buffer, measured on a galaxy s9: 0 against 324 for the same log. Use `adb logcat AmbitoWidgets:I
  *:S`, which is the timeline. One line per redraw with its trigger and how many widgets it drew, one per call to the service with its duration, plus the cache hits.

### Both platforms or neither

The widgets are written twice, once in Swift and once in Kotlin, so these move together. Touching
one side alone is the bug that gets shipped.

- **A rate added or retired**: `ios/RateWidgets/Utils/Helper.swift` `getRateTypes()` and
  `Format.kt` `RATE_TYPES`. Both mirror `getAvailableRateTypes()` in `packages/core`, which is
  the order the app itself lists rates in, and the one the picker and the defaults read here.
  Retired ones stay commented on both. `getRateTitle` in the same core file is a third copy of
  the labels that also has to agree.
- **A rate label**: the `display` of the ios entry and the second half of the kotlin pair.
- **A font size**: `RateWidgets.swift` carries the point sizes and `Sizes.kt` the same numbers
  times 1.05. Measured against real captures, that factor puts android inside the spread ios
  already has between an iPhone Air and a 15 Pro Max, so change the role and not the factor.
- **A default**: ios in `Helper.swift`, `getDefaultRateType`, `getDefaultRateTypes` and
  `getDefaultSpreadRateTypes`, plus the intent; android in each provider's `defaultRates`.
- **A /fetch schema change**: ios first, always. `lookupRateValues` reads the array by index and
  forces its casts, so a short array or a moved field kills the extension, while android drops
  the rate and keeps the rest.

### A new widget

- **iOS**: a `struct X: Widget` with its `kind`, added to the `RateWidgets` bundle, plus its
  parameters in `RateWidgets.intentdefinition`. One file, one target.
- **Android**: a `WidgetProvider` subclass, one line in `Widgets.ALL`, a `<receiver>`, an
  `res/xml/widget_x_info.xml`, label and description in `strings.xml`, the preview png in
  `assets/widgets/` and its line in the module `build.gradle`. Four of those are static
  registrations android demands and cannot be factored away. Reusing `widget_card.xml` or
  `widget_list.xml` costs nothing more; a new shape needs a `Content` subtype and a branch in
  `views()`.
- The config screen takes a new widget with no changes as long as it picks rates and, optionally,
  buy/average/sell. Anything else is a change there.

### What the widgets take from the app

They are a complement, they do not change the app. Every touch point runs one way, the module reading from the app side, and each one fails differently if the app moves.

- **The font**, `assets/fonts/FiraGO-Regular.otf`. A Copy task in the module `build.gradle` brings it in at build time. Renaming or moving it breaks the build at aapt, which is loud and fine.
- **The endpoint**, `API_URL`. The module emits it into the `widget_api_url` resource at build time, with production as the fallback. This one fails silently, the widgets would keep talking to the fallback.
- **The deep link**, the `ambito-dolar` scheme and the `/rates[/type]` route, hardcoded in `WidgetProvider.openApp`. Changing the scheme in `app.config.ts` leaves the tap doing nothing, also silently.
- **The theme.** `Theme.Widget.Config` and the app `AppTheme` share the `Theme.AppCompat.DayNight.NoActionBar` parent and neither defines `colorAccent`, so the config screen already follows the app. Defining the brand accent on the app theme moves the widget screen with it, which is the point.

Going the other way there is a single line: `AppContainer` calls `reloadWidgets()` next to the ios `WidgetKit.reloadAllTimelines()`. Unlike the ios one it costs a `/fetch`, because the payload the app holds and the one the service returns are not the same shape.

Module resources are all prefixed `widget_`, plus `Theme.Widget.Config`. Keep it, everything merges into one namespace with the app.

### Config screen

`WidgetConfigActivity` serves every widget and reads which one it is from the id the launcher passes (`getAppWidgetInfo(...).provider`). Sections with their chosen values, each row opening a picker.

- **Every piece is framework.** The section title is the `PreferenceCategory` recipe (`TextAppearance.AppCompat.Body2`, 14sp medium, accent, 16dp margin over 8dp padding), the value row copies the appcompat picker item (`?attr/listPreferredItemHeightSmall`, `?android:attr/textAppearanceMedium`, `?attr/textColorAlertDialogListItem`), and the picker is `setSingleChoiceItems`, which is what `ListPreference` opens by itself. Nothing is drawn by hand.
- **Appcompat `AlertDialog`, never the platform one.** On one ui the platform one becomes a full width bottom sheet that also tints the status bar.
- **Never a Material3 theme here.** The exposed dropdown and the segmented button need it and it paints `statusBarColor` and `navigationBarColor`. Tried and reverted, twice.
- **Only `Listo` persists.** Picking writes to memory, so backing out of a widget being reconfigured leaves it as it was, which is what the canceled result promises. The activity sets `RESULT_CANCELED` on create, so system back drops a freshly added widget: the confirm control must be affirmative, never an X or a back arrow.
- Rows update in place after a pick, the dialog is never rebuilt under the user. It is held in a field and dismissed in `onDestroy`, and the pending selection survives a rotation through `onSaveInstanceState`.
- Per widget config in SharedPreferences `ambito_widgets`, keys `rate_<id>`, `rate1_<id>`, `rate2_<id>` and `value_<id>`, cleaned on delete. Slot zero keeps the plain key so a config written before the second slot existed still reads back.
- Picking a rate another slot holds swaps them, so a widget never shows the same rate twice.
- Defaults belong to each widget and mirror the ios ones: rate `oficial`, list `oficial, bna, informal`, spread `informal, bna`.

## Copy register and widget picker text

- **Voseo everywhere.** App I18n is rioplatense voseo (`Elegí`, `verificá`, `Tenés`). No tuteo (`Elige`, `verifica`, `Tienes`). Applies to iOS Swift strings too.
- **iOS is the base for meaning, not for format.** New Android widget copy derives verb + noun from the iOS `.description(...)`, never invented fresh.
- iOS `.description(...)` (`ios/RateWidgets/RateWidgets.swift`): full sentence, trailing period. Apple style.
- Android `description` (`modules/widgets/android/src/main/res/values/strings.xml`): imperative, **no trailing period**, 4-8 words. Android picker style, matches system widgets (Battery `See battery info for your devices`, Chrome `Quickly start a search in Chrome`, Clock `Choose cities in the Clock app`).
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
