# Client

Rules for `packages/client`, loaded on top of the root `AGENTS.md` when working here.

## Native code

- **Both platforms CNG**: `packages/client/android/` and `packages/client/ios/` are regen by `expo prebuild`. Build output, gitignored, no hand-edit. Modify via `packages/client/app.config.ts` or a config plugin.
- **iOS widgets live in `packages/client/targets/`**, generated into the Xcode project by the `@bacons/apple-targets` plugin. Source, committed. `packages/client/targets/RateWidgets/` is the widget extension. `packages/client/targets/RateWatch/` is the Apple Watch app, `packages/client/targets/RateWatchComplications/` its launcher complication. `packages/client/targets/_shared/` is the code they share. Read `packages/client/docs/ios-widgets.md` before touching it.
- **After a version, dep or SDK bump**: `yarn run client:prebuild -p ios`, nothing else. It regenerates `packages/client/ios/` and runs `pod install`, there is nothing left in there to preserve. Xcode project settings live in `packages/client/app.config.ts` and each `packages/client/targets/*/expo-target.config.js`. Never `--no-clean`, see `packages/client/docs/ios-widgets.md`. Build output that looks like a code bug after a prebuild or a target rename: delete `DerivedData` before touching the source, same doc.
- **A local release build uploads to the production Sentry project** when `SENTRY_AUTH_TOKEN` is in
  the environment, source maps and debug symbols on both platforms plus the R8 mapping on android.
  Set `SENTRY_DISABLE_AUTO_UPLOAD=true` for a local one.
- **An `Alert` carries one sentence as its title and an empty message**, under two lines because
  RN's `DialogTitle` caps it there and ellipsizes. Moving the copy to the message is not the way out,
  RN always sends a title key and an empty one still costs its band.
- **Android nav bar (edge-to-edge)**: imperative `NavigationBar.setStyle` in an effect in `packages/client/components/RootLayout.tsx`, never the `<NavigationBar />` component. Read `packages/client/docs/android-navigation-bar.md` before changing it.
- **Splash hides one task after the content lays out**, `packages/client/components/RootLayout.tsx`. The root lays out with an empty tree and a layout event only means yoga measured. On a Galaxy S9 the blank window went from ~430ms hiding on the root to ~130ms hiding one `requestAnimationFrame` after the content layout, 115-149ms over twelve cold starts. A second nested frame callback measured the same, so it is not there.

## Lint

- No `lint` script in the client, lint from the root, `yarn eslint "packages/client/<path>"`.
- React Compiler rules are off on purpose (`react-hooks/{immutability,refs,set-state-in-effect,purity}`):
  the project is not on the compiler and they false positive on Reanimated `.value` and on
  intentional ref and effect patterns. Fix a real prop reassign, do not mute those rules.

## Copy register

Any user facing string follows `packages/client/docs/copy-register.md`: voseo, error shapes, vocabulary.

## Store listing

Store description and the "What's New" entry follow `packages/client/docs/store-listing.md`.

## Adaptive layout

Read `packages/client/docs/adaptive-layout.md` before touching `ContentView`, `useContentLayout`,
the toast insets in `withContainer`, `ToastOverlay`, `Toast`, the donate route in
`packages/client/app/donate.tsx`, the mini chart in `RateView`, the detail chart height in
`RateDetailScreen`, `AnimatedSegmentedControl`, the Done button in
`packages/client/app/(modals)/_layout.tsx` or the orientation keys and `ScreenOrientationLock`.
iPhone Duo, resizable iPad windows and Android tablets break there without showing on a phone. Side
insets come from the `SafeAreaView` of `react-native-screens/experimental`, an experimental API:
after a `react-native-screens` bump rotate and fold the Duo once.

## Donation modal

Read `packages/client/docs/donation-modal.md` before touching the flow, donor re-asks or the
Developer screen bypass.

## Rate updates

Everything that keeps the rates in sync is in
`packages/client/components/withRateUpdates.tsx`, the interval math in
`packages/client/utilities/Polling.ts`, contract in `docs/product-policies.md`.

- **Do not put a "no network, do not bother" check in front of `fetchRates`.** The failed attempt
  is what arms the connectivity listener, and `isConnected` is wrong in both directions.
- **`reloadWidgets()`, `reloadAllTimelines()` and `registerApplicationDownloadRates` hang off the
  `updated_at` change and not off the poll.** A reload can cost a `/fetch`, android collapses a
  burst within 10s and ios within 60s, and the last one feeds the user visible "Actualizaciones"
  counter which would then count polls.
- **The foreground mark is taken on the native `AppState` event and the toast decision when the
  update lands.** A render between them let a push tap fetch and answer against the previous open's
  mark, so do not move the stamp back into `useAppState`.
- **Do not remove the seeding `setNow` in `useTickProvider`** to stop the tick effect firing twice
  on mount. Without it the swr cache stays empty and the effect fires on every render for a minute.
- **The `enabled` argument of `useTickProvider` has to keep mirroring what `AppContainer` renders.**
  It reads `Helper.isValid(props.rates)`, the same call, so the interval is off only while the retry
  button is on screen. Gating it on `updated_at` instead leaves a payload that carries rates without
  one showing the main screen with no tick and no button, stale for good.

## Rates and markets

- **The shared screens tell rates and markets apart only through `getKind`** in
  `packages/client/config/kinds.ts`. A per type display rule (unit, `decimals`, `points`, `dated`,
  `inverse`, ranges) goes in its `MARKETS` catalog, never a `type ===` in a screen.
- **The views carry no formats of their own**, every caller takes its formats from `getViewProps(type)`, the web
  social card included. Rates share `RATE_VIEW_PROPS`.
- **A value that is already a percentage moves in points, everything else in percent**, the way the
  quote panels show it. The absolute difference lives in the detail's `Variación` row.

## TypeScript discipline

`tsconfig`: `strict:false`, `strictNullChecks:true` (router 58 types demand a navigator `id`
without it), `noImplicitAny:false`. Implicit `any` is fine, and real types come with the TS
migration, never as a side effect of cleaning one up.

`yarn client:typecheck` from the repo root already tells you which casts are load bearing: drop one,
run it, put it back if it fails. What it cannot tell you is that the repair was worse than the
error, and that is the whole of this section.

- **Never add code to remove an `any`**: no fake defaults (`= undefined`/`= false`), fake fields
  the object never sets, or optional params (`_theme?`) the method ignores. Never swap one for two.
- **Never force a type in its place.** If `:any` is the only annotation tsc needs, that is the
  annotation: no `:View`, no `:TextInput`, no `<{x:number;y:number}>`.
- **`Settings` (`packages/client/config/settings.ts`) is `any`.** Dropping it is 12 typecheck errors
  and the repair that passes is the wrong one: never wrap callsites as `(Settings as any).foo`,
  `Settings.foo` already returns `any`.
- **`forwardRef((props:any, ref:any))` stays.** Adding `<any,any>` or `<View,any>` generics to kill
  `ref:any` trades one for another, and tsc accepts both.
- An exported component's `({a,b}:any)` stays, dropping it forces every prop required. Only internal
  same-file helpers lose it.

## React Native

- No global nav/state refactors for small tasks.
- Preserve iOS/Android/web behavior. Date/time + formatting via `@ambito-dolar/core` helpers.
- **Android modal bottom inset**: native-stack modals lack the bottom safe-area inset, content slips under the transparent nav bar. `FixedScrollView` pads via `isModal` prop, new scrolling modal screen must pass it.
- `isModal` computed once in `withContainer` from the navigator id (`/(modals)`, the layout path), threaded as prop down the tree. The tab check reads the parent id (`/(tabs)`), router 58 tab state has no `type` on first render. Renaming a group breaks its check, the ids are compared as literals.
- **A component that only publishes shared state takes `Helper.useSharedSetter`.**
  `useSharedState` reads `data`, swr subscribes the caller, and a hoc or a screen holding only its
  setter re-renders on every publish. An effect that only runs on the tick sits in a leaf
  (`RatesTick`, `UsageDayTick`, `GeneralNote`, `RelativeTimestamp`, `RatesTitle`), so the 60s tick
  never re-renders the hoc chain, the screen or the rate cards.

## Navigation centralization

- **All `router.X` calls in `packages/client/utilities/Navigation.ts`.** Never import `router` from `expo-router` elsewhere. Screens/components import only `Stack`, `Slot`, `Redirect`, `useNavigation` (setOptions, isFocused, getId, getParent), `useLocalSearchParams`, `useFocusEffect`, `useSegments`, `ThemeProvider`, `DarkTheme`, `DefaultTheme`, plus `NativeTabs` from `expo-router/native-tabs` and `HeaderButton` from `expo-router/react-navigation`.
- **`(tabs)` in `packages/client/components/RootLayout.tsx` has `animation: 'none'`.** The Stack
  mounts on `app/index.tsx`, at launch and again when `AppContainer` brings it back (rates cleared,
  locale reload), and its redirect runs after the first commit since router 58, so the replace would
  slide the whole app in. Static plugin `redirects` and `+native-intent` only cover the launch.
- **`SplashScreen` comes from `expo-splash-screen`, never from `expo-router`.** The router ships its own wrapper marked `@hidden`.
- Helpers: `goToX` (nav), `goBack` (guarded), `dismissToTop` (guarded pop), `clearRouteParam(name)`.
- **A new route goes into `SCREENS` in `packages/client/hooks/app/useNavigationTrackingRouter.ts`**,
  development warns `Untracked screen` otherwise.
- New route to a `goToX` helper. Modal variant = separate helper (`goToDonate` settings tab vs `goToDonateModal` root modal). Use `router.navigate` not `push` (dedupes, prevents double-tap stacks).
- Clear a consumed deeplink/intent param (`focus=true`, `popToTop=true`) via `clearRouteParam('focus')`, not inline `router.setParams({focus: undefined})`.

## Tests

- AVA in `packages/client/test.js`, run alone with `yarn workspace @ambito-dolar/client test`.
- It loads `packages/client/utilities/Polling.ts`, `packages/client/utilities/Donation.ts` and
  `packages/client/utilities/Customize.ts` in plain Node, no Metro, and Node loads the `.ts` without
  a build. They import at most lodash and `@ambito-dolar/core`, a `react-native`, Expo or `@/`
  import there breaks the test, and lodash goes in as `import _ from 'lodash'`, a namespace import
  has no `chain` under Node. What needs the store or a native module lives in a hook.
- No `"type": "module"` here, like the official Expo template. `@bacons/apple-targets` `require`s
  each `packages/client/targets/*/expo-target.config.js` and reads `.type` without unwrapping
  `.default`, so it cannot be ESM. The `test` script mutes `MODULE_TYPELESS_PACKAGE_JSON` instead.
