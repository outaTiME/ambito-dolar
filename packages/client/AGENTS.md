# Client

Rules for `packages/client`, loaded on top of the root `AGENTS.md` when working here.

## Native code

- **Both platforms CNG**: `packages/client/android/` and `packages/client/ios/` are regen by `expo prebuild`. Build output, gitignored, no hand-edit. Modify via `packages/client/app.config.ts` or a config plugin.
- **iOS widgets live in `packages/client/targets/`**, generated into the Xcode project by the `@bacons/apple-targets` plugin. Source, committed. `packages/client/targets/RateWidgets/` is the widget extension. Two `_shared/` folders, both for what has to compile into the app target as well: `packages/client/targets/_shared/` reaches every target, `packages/client/targets/RateWidgets/_shared/` only that one and the app, and the intents live there. Read `packages/client/docs/ios-widgets.md` before touching it.
- **After a version, dep or SDK bump**: `yarn run client:prebuild -p ios`, nothing else. It regenerates `packages/client/ios/` and runs `pod install`, there is nothing left in there to preserve. Xcode project settings live in `packages/client/app.config.ts` and `packages/client/targets/RateWidgets/expo-target.config.js`. Never `--no-clean`, see `packages/client/docs/ios-widgets.md`. Blank widget gallery previews after a prebuild: check `DerivedData` before the source, same doc.
- **An `Alert` carries one sentence as its title and an empty message**, under two lines because
  RN's `DialogTitle` caps it there and ellipsizes. Moving the copy to the message is not the way out,
  RN always sends a title key and an empty one still costs its band.
- **Android nav bar (edge-to-edge)**: imperative `NavigationBar.setStyle` in an effect in `packages/client/components/RootLayout.tsx`, never the `<NavigationBar />` component. Read `packages/client/docs/android-navigation-bar.md` before changing it.
- **Splash hides one task after the content lays out**, `packages/client/components/RootLayout.tsx`. The root lays out with an empty tree and a layout event only means yoga measured. On a Galaxy S9 the blank window went from ~430ms hiding on the root to ~130ms hiding one `requestAnimationFrame` after the content layout, 115-149ms over twelve cold starts. A second nested frame callback measured the same, so it is not there.

## Lint

- `expo lint` fails here, scope it from the root instead, `yarn eslint "packages/client/<path>"`.
- React Compiler rules are off on purpose (`react-hooks/{immutability,refs,set-state-in-effect,purity}`):
  the project is not on the compiler and they false positive on Reanimated `.value` and on
  intentional ref and effect patterns. Fix a real prop reassign, do not mute those rules.

## Donation modal

Read `packages/client/docs/donation-modal.md` before touching the flow, donor re-asks or the
Developer screen bypass.

## Rate updates

Everything that keeps the rates in sync is in
`packages/client/components/withRateUpdates.tsx`, contract in `docs/product-policies.md`.

- **Do not put a "no network, do not bother" check in front of `fetchRates`.** The failed attempt
  is what arms the connectivity listener, and `isConnected` is wrong in both directions.
- **`reloadWidgets()`, `reloadAllTimelines()` and `registerApplicationDownloadRates` hang off the
  `updated_at` change and not off the poll.** A reload can cost a `/fetch`, android collapses a
  burst within 10s and ios within 60s, and the last one feeds the user visible "Actualizaciones"
  counter which would then count polls.
- **Do not remove the seeding `setNow` in `useTickProvider`** to stop the tick effect firing twice
  on mount. Without it the swr cache stays empty and the effect fires on every render for a minute.
- **The `enabled` argument of `useTickProvider` has to keep mirroring what `AppContainer` renders.**
  It reads `Helper.isValid(props.rates)`, the same call, so the interval is off only while the retry
  button is on screen. Gating it on `updated_at` instead leaves a payload that carries rates without
  one showing the main screen with no tick and no button, stale for good.

## TypeScript discipline

`tsconfig`: `strict:false`, `noImplicitAny:false`. Implicit `any` is fine, and real types come with
the TS migration, never as a side effect of cleaning one up.

`yarn client:typecheck` from the repo root already tells you which casts are load bearing: drop one,
run it, put it back if it fails. What it cannot tell you is that the repair was worse than the
error, and that is the whole of this section.

- **Never add code to remove an `any`**: no fake defaults (`= undefined`/`= false`), fake fields
  (`DEVICE_WIDTH: 0`), or optional params (`_theme?`) the method ignores. Never swap one for two.
- **Never force a type in its place.** If `:any` is the only annotation tsc needs, that is the
  annotation: no `:View`, no `:TextInput`, no `<{x:number;y:number}>`.
- **`Settings` (`packages/client/config/settings.ts`) is `any`.** Dropping it is 14 typecheck errors
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
- `isModal` computed once in `withContainer` (from `useLocalSearchParams`), threaded as prop down the tree. Never re-call `useLocalSearchParams` for it in nested components.

## Navigation centralization

- **All `router.X` calls in `packages/client/utilities/Navigation.ts`.** Never import `router` from `expo-router` elsewhere. Screens/components import only `Stack`, `Tabs`, `Slot`, `Redirect`, `useNavigation` (setOptions), `useLocalSearchParams`, `useFocusEffect`, `usePathname`, plus `NativeTabs` from `expo-router/unstable-native-tabs`, `HeaderButton` from `expo-router/react-navigation` and `BottomTabBar` from `expo-router/js-tabs`.
- **`SplashScreen` comes from `expo-splash-screen`, never from `expo-router`.** The router ships its own wrapper marked `@hidden`.
- Helpers: `goToX` (nav), `goBack` (guarded), `dismissToTop` (guarded pop), `clearRouteParam(name)`.
- New route to a `goToX` helper. Modal variant = separate helper (`goToDonate` settings tab vs `goToDonateModal` root modal). Use `router.navigate` not `push` (dedupes, prevents double-tap stacks).
- Clear a consumed deeplink/intent param (`focus=true`, `popToTop=true`) via `clearRouteParam('focus')`, not inline `router.setParams({focus: undefined})`.
