# Client

Rules for `packages/client`, loaded on top of the root `AGENTS.md` when working here.

## Native code

- **Both platforms CNG**: `packages/client/android/` and `packages/client/ios/` are regen by `expo prebuild`. Build output, gitignored, no hand-edit. Modify via `packages/client/app.config.ts` or a config plugin.
- **iOS widgets live in `packages/client/targets/`**, generated into the Xcode project by the `@bacons/apple-targets` plugin. Source, committed. `packages/client/targets/RateWidgets/` is the widget extension. Two `_shared/` folders, both for what has to compile into the app target as well: `packages/client/targets/_shared/` reaches every target, `packages/client/targets/RateWidgets/_shared/` only that one and the app, and the intents live there. Read `packages/client/docs/ios-widgets.md` before touching it.
- **After a version, dep or SDK bump**: `yarn run client:prebuild -p ios`, nothing else. It regenerates `packages/client/ios/` and runs `pod install`, there is nothing left in there to preserve. What used to be hand-edited in the Xcode project now lives in `packages/client/app.config.ts` and in `packages/client/targets/RateWidgets/expo-target.config.js`. Never `--no-clean`, see `packages/client/docs/ios-widgets.md`.
- **An `Alert` carries one sentence as its title and an empty message**, under two lines because
  RN's `DialogTitle` caps it there and ellipsizes. Moving the copy to the message is not the way out,
  RN always sends a title key and an empty one still costs its band.
- **Android nav bar (edge-to-edge)**: framework does not set button appearance. Use `expo-navigation-bar` — `<NavigationBar style="auto" />` in `RootLayout` + plugin `['expo-navigation-bar', { enforceContrast: true }]` for os scrim behind 3-button nav.

## Lint

- `expo lint` fails here, scope it from the root instead, `yarn eslint "packages/client/<path>"`.
- React Compiler rules are off on purpose (`react-hooks/{immutability,refs,set-state-in-effect,purity}`):
  the project is not on the compiler and they false positive on Reanimated `.value` and on
  intentional ref and effect patterns. Fix a real prop reassign, do not mute those rules.

## Charts

The metro alias `victory-native` to `victory` in `packages/client/metro.config.js` is not optional.
`victory-native` is native only and on web it renders `react-native-svg` primitives that react-dom
rejects, so the rate detail breaks there. Verified by removing it. The alias resolves the package
instead of joining a path, because it is hoisted and does not sit under the client.

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

`tsconfig`: `strict:false`, `noImplicitAny:false`. Implicit `any` OK.

Core principle:

- Drop annotations tsc infers fine. Never force a type just to remove an `any` — if `:any` is the only annotation tsc needs, keep it (no `:View`, `:TextInput`, `<{x:number;y:number}>`). Real types come in the TS migration, not as any-cleanup side-effect.
- Never add code to remove an `any`: no fake defaults (`= undefined`/`= false`), fake fields (`DEVICE_WIDTH: 0`), or optional params (`_theme?`) methods ignore. 1 char `:any` beats 5 lines of shim.

Drop (tsc infers fine):

- Primitive annotations (`:number/:string/:boolean`), `Record/Promise/Array<>` on params/returns. Default values beat `name:string=''`.
- `useRef<ReturnType<typeof setTimeout>|null>(null)` to `useRef(null)`. Cosmetic callback param annotations.

Keep (load-bearing):

- `Settings:any` (`packages/client/config/settings.ts`) — `updateSettings` mutates dynamic fields (`CONTENT_WIDTH` etc.), methods called with args outside inferred sig. Never drop. Never wrap callsites `(Settings as any).foo`, `Settings.foo` already returns `any`.
- Exported component `({a,b}:any)` — dropping forces all props required, breaks callers. Drop `:any` only on internal same-file helpers (`const ButtonBase = ({onPress,children}) => ...`).
- `useSelector((state:any) => state.x)` required unless file has `// @ts-nocheck`.
- `useState<any>()` only if consumers read fields off state (else narrows to undefined). `useRef<any>` only if union defeats inference, else `useRef(null)`.
- `useAnimatedStyle<any>`, `.line<any>()` + `(datum:any)` — transform array literals / d3 datum create union types that don't match. Don't drop.
- `as any` for `Collapsible` children (untyped class).
- Single-call internal callbacks (`onHandlerStateChange`, `useAnimatedReaction` reducers) drop `:any`, the wrapping API types the arg.

forwardRef:

- `forwardRef((props:any, ref:any))` stays. Don't add `<any,any>`/`<View,any>` generics to kill `ref:any`, 2-for-1 wash. Drop existing redundant `<any,any>` only if callsites still typecheck.

Direct use, no wrappers:

- RN platform APIs (`Linking.openURL`, `Alert.alert`, `Share.share`).
- Drop component aliases (`const Foo = Bar as any`) when underlying exports `(props:any)=>JSX`; keep alias only for `.defaultProps`/class/upstream-typed.
- `Stack screenOptions` no `} as any` if `getStackScreenOptions` returns literals via `as const`.

Verify before stripping: drop one cast, run `yarn client:typecheck` from the repo root, revert if fails (cast was load-bearing). Never swap 1 `any` for 2. `as const` keep only if consumer needs literal (verify by removing + tsc).

## React Native

- Side effects in hooks, complete dep arrays. No global nav/state refactors for small tasks.
- Preserve iOS/Android/web behavior. Date/time + formatting via `@ambito-dolar/core` helpers.
- **Android modal bottom inset**: native-stack modals lack the bottom safe-area inset, content slips under the transparent nav bar. `FixedScrollView` pads via `isModal` prop, new scrolling modal screen must pass it.
- `isModal` computed once in `withContainer` (from `useLocalSearchParams`), threaded as prop down the tree. Never re-call `useLocalSearchParams` for it in nested components.

## Navigation centralization

- **All `router.X` calls in `packages/client/utilities/Navigation.ts`.** Never import `router` from `expo-router` elsewhere. Screens/components import only `Stack`, `Tabs`, `Slot`, `Redirect`, `useNavigation` (setOptions), `useLocalSearchParams`, `useFocusEffect`, `usePathname`, plus `NativeTabs` from `expo-router/unstable-native-tabs`, `HeaderButton` from `expo-router/react-navigation` and `BottomTabBar` from `expo-router/js-tabs`.
- **`SplashScreen` comes from `expo-splash-screen`, never from `expo-router`.** The router re-exports it and the re-export is marked `@hidden`, so it resolves, it type checks and it is not the public api. Both `RootLayout` files already import it right.
- Helpers: `goToX` (nav), `goBack` (guarded), `dismissToTop` (guarded pop), `clearRouteParam(name)`.
- New route to a `goToX` helper. Modal variant = separate helper (`goToDonate` settings tab vs `goToDonateModal` root modal). Use `router.navigate` not `push` (dedupes, prevents double-tap stacks).
- Clear a consumed deeplink/intent param (`focus=true`, `popToTop=true`) via `clearRouteParam('focus')`, not inline `router.setParams({focus: undefined})`.
