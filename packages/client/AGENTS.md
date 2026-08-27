# Client

Rules for `packages/client`, loaded on top of the root `AGENTS.md` when working here.

## Native code

- **Android CNG**: `packages/client/android/` regen by `expo prebuild`. Build output, no hand-edit. Modify via `app.config.ts` / config plugins.
- **iOS NOT CNG**: `packages/client/ios/` checked-in, edit manual. Ships SwiftUI widgets under `packages/client/ios/RateWidgets`. The widgets are written twice, once here and once as the android module under `packages/client/modules/widgets/`, so a rate, a label, a font size or a `/fetch` schema change moves on both sides: read `packages/client/docs/android-widgets.md` first. SDK upgrade: apply iOS native diffs by hand (see Expo upgrade helper). Widget prebuild integration pending.
- **iOS prebuild safe without `--clean`**: `expo prebuild --platform ios` merges, preserves `RateWidgets` + manual Podfile/pbxproj diffs. `--clean` clobbers, never use for iOS.
- **Android nav bar (edge-to-edge)**: framework does not set button appearance. Use `expo-navigation-bar` — `<NavigationBar style="auto" />` in `RootLayout` + plugin `['expo-navigation-bar', { enforceContrast: true }]` for os scrim behind 3-button nav.

## iOS post-bump workflow

After `app.config.ts` version/build bump, dep bumps, or SDK sync:

```bash
cd packages/client/ios && pod update && cd - && yarn run client:prebuild:ios
```

- `pod update` first: refreshes Pods/Podfile.lock with current Podfile constraints (Hermes, RN core, transitive bumps).
- `prebuild` then: syncs `app.config.ts` to `Info.plist` (CFBundle keys) + `Expo.plist` + Podfile plugin specs. Without `--clean` preserves manual edits.
- Major SDK bump (Podfile constraints themselves change, RN version etc.): prebuild first then `pod update` after, so pod resolution reads the SDK-updated Podfile.

## Lint

- `expo lint` fails here with `Couldn't find a script named "eslint"`: eslint only resolves from the
  repo root, so scope it from there, `yarn eslint "packages/client/<path>"`. `tsc` is the mirror
  case and only resolves here, `yarn workspace @ambito-dolar/client exec tsc --noEmit`.
- React Compiler rules are off on purpose (`react-hooks/{immutability,refs,set-state-in-effect,purity}`):
  the project is not on the compiler and they false positive on Reanimated `.value` and on
  intentional ref and effect patterns. Fix a real prop reassign, do not mute those rules.

## Donation modal

Cooldown counted in distinct usage days and not wall clock, one escalating schedule, and only two
persisted fields. New fields need a strong reason. Read `docs/product-policies.md` at the repo root before touching
the flow, the re-ask of a donor and the Developer screen bypass are there too.

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
- `as any` for: `Collapsible` children (untyped class), `Text`/`TextInput` `.defaultProps`, `MaterialCommunityIcons` for `NativeTabs.Trigger.VectorIcon`.
- Single-call internal callbacks (`onHandlerStateChange`, `useAnimatedReaction` reducers) drop `:any`, the wrapping API types the arg.

forwardRef:

- `forwardRef((props:any, ref:any))` stays. Don't add `<any,any>`/`<View,any>` generics to kill `ref:any`, 2-for-1 wash. Drop existing redundant `<any,any>` only if callsites still typecheck.

Direct use, no wrappers:

- RN platform APIs (`Linking.openURL`, `Alert.alert`, `Share.share`).
- Drop component aliases (`const Foo = Bar as any`) when underlying exports `(props:any)=>JSX`; keep alias only for `.defaultProps`/class/upstream-typed.
- `Stack screenOptions` no `} as any` if `getStackScreenOptions` returns literals via `as const`.

Verify before stripping: drop one cast, run `yarn workspace @ambito-dolar/client exec tsc --noEmit`, revert if fails (cast was load-bearing). Never swap 1 `any` for 2. `as const` keep only if consumer needs literal (verify by removing + tsc).

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
