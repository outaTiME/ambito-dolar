# iOS widgets

Read before touching `packages/client/targets/`, `expo-target.config.js`, or the widget Swift.
`packages/client/ios/` is generated and gitignored; nothing in it is a source of truth.

## Layout

```
packages/client/targets/
  _shared/LaunchAppIntent.swift        app target + widget target
  RateWidgets/
    expo-target.config.js              everything the pbxproj used to hold by hand
    Info.plist                         hand managed, the plugin never rewrites it
    RateWidgets.swift                  views, providers, @main WidgetBundle
    _shared/Intents.swift              AppEntity, AppEnum, the 3 WidgetConfigurationIntent
    _shared/Helper.swift               the rate list, mirrored by Format.kt on android
    FiraGO-Regular.otf                 symlink, see below
    Assets.xcassets/                   symbolset committed, colorsets generated
```

`@bacons/apple-targets` links the folder as a `PBXFileSystemSynchronizedRootGroup`: Xcode globs it
at build time, so **any file dropped in becomes part of the target** and Swift-only edits do not
need a prebuild. Adding, renaming or removing a file in a `_shared/` does.

The intents live in `packages/client/targets/RateWidgets/_shared/` and not next to the views, so the **main app target
compiles them too**. The plugin README asks for that, and the hand written project did the same by
putting `RateWidgets.intentdefinition` in the Sources phase of all three targets. The app target is
16.4 against the extension's 17.0, which is why the intents carry `@available` annotations.

## Traps

**The font is a symlink**, pointing at the same `packages/client/assets/fonts/FiraGO-Regular.otf` that
`expo-font` puts in the app. Never turn it into a copy. Measured on device: an extension only loads
fonts from its own bundle, so the file in the target folder, `UIAppFonts` in the target `Info.plist`
and `Font.custom("FiraGO-Regular", ...)` are all three required, and dropping either of the first
two falls back to the system font silently. It survives EAS, measured by simulating the upload: the
symlink and its target both go, and `packages/client/assets/` ships with it.

**`Assets.xcassets` is compiled whole, but only part of it is source.** Xcode globs the folder, so
anything in it lands in `Assets.car`. `AppWidgetIcon.symbolset` is the hand made one and is
committed; WidgetKit picks it up by name, which is why it needs no entry in the target config and
must not be declared in `images:` or the SVG ends up in the folder twice. The two colorsets are
plugin output, rewritten on every prebuild, and are ignored by both git and EAS. What differs is who points at them:
the symbol is referenced by name, the colors only through the build settings below.

**`colors:` owns both the colorset and the build setting, and you cannot keep one without the
other.** For every name in `colors:` the plugin writes `packages/client/targets/RateWidgets/Assets.xcassets/<name>.colorset/Contents.json`
into the source tree on each prebuild, and `with-xcode-changes.js` sets
`ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME` / `ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME`
only while the matching entry exists, removing it otherwise. So the trick that keeps
`AppWidgetIcon.symbolset` hand written, leaving it out of `images:`, has no equivalent here: drop
`$accent` and the colorset survives but the gallery button goes black. Both measured.

That is what freezes `$accent` to a literal where the hand written project pointed `AccentColor` at
the system `linkColor`. `with-ios-colorset.js` always emits `color-space: display-p3` and
`custom-color-from-css.js` quantises through `@react-native/normalize-colors`, so the config takes
sRGB hex and renders it as p3: `#007AFF` has to be written as `#3478F6` and `#0A84FF` as `#3B82F7`,
or the tone comes out visibly off. Measured, not documented: the conversion lands within the 8 bit
rounding, about 0.2 levels of 255, of what a device renders for `systemBlue`, and Apple documents
`linkColor` and `systemBlue` as separate semantic colors without publishing components for either.
A colorset can reference a system color
(`{"platform":"ios","reference":"linkColor"}`) and that was tried: the next prebuild overwrote it.
Doing it properly would take a config plugin of our own running after `apple-targets`. Not worth it
for a difference that only shows under increased contrast.

**Never prebuild iOS without `--clean`.** It is the SDK 57 default anyway. Upstream issues 201 and
202 report `--no-clean` crashing the plugin and duplicating targets; not reproduced here, and not
worth reproducing.

**Deployment target is 17.0**, above the app's 16.4, because `AppIntentConfiguration` requires it.
Deliberate. It costs widgets on iOS 16.4 to 16.7 only, the app itself needs 16.4.

**The extension reports `CFBundleDevelopmentRegion = en`** where the hand written project said
`es-419`, and it cannot be fixed from the target `Info.plist`: `GENERATE_INFOPLIST_FILE` makes Xcode
synthesise it from the project level `developmentRegion`, which no Expo option exposes. Measured
twice. Nothing resolves against it, every string is a Swift literal, and the store listing kept
reporting Spanish with the app bundle still at `es-419`. Localizing the widget one day means a
config plugin.

**No `icon` in the target config**, so the extension inherits the project level
`ASSETCATALOG_COMPILER_APPICON_NAME`. Fine with a plain PNG app icon, revisit before moving to an
Xcode 26 `.icon` bundle. Upstream issue 159.

**The rate parameters have to be non optional.** `[RateType]?` is what Xcode's own converter emits
and with it the editor opens on three "Seleccionar" rows, while the widget renders fine off the
provider fallback. Dropping the `?` and handing the parameter its own query is what fixes it:

```swift
@Parameter(title: "Cotizaciones", size: [...], query: ListRateTypesQuery())
var rateTypes: [RateType]
```

Apple states the rule plainly in `widgetkit/making-a-configurable-widget`: "If your widget includes
nonoptional parameters, you must supply a default value... A second option is to use a query type
that implements `defaultResult()`." `DefaultValue` is an associated type, one per query, which is
why Lista and Brechas each need their own `EntityQuery` to keep their own defaults. Per parameter
queries exist for collections, `AppIntents.swiftinterface` line 11216.

Only the collections actually needed this: the single rate parameter opened on Oficial while it was
still `RateType?`. Why they differ was never established. It is non optional too, for symmetry, and
that is the one gap here: its upgrade path was never re-tested from an App Store build, the
collections were. If a widget ever comes back from an update having lost its rate, look here first.

**The non optional warning is deliberate, do not silence it by adding `?`.** The metadata processor
prints, twice per parameter:

```
Encountered a non-optional type for parameter: rateTypes. Conformance to the following AppIntent
protocols requires all parameter types to be optional: ... AppIntents.WidgetConfigurationIntent
```

Making the parameter optional to quiet it is exactly what breaks the defaults. The risk it points
at is real but was measured and does not happen: a widget configured under the SiriKit build keeps
its rates after updating onto the non optional parameter, tested on device with four widgets, two
hand configured and two on defaults. Re-test that whenever Xcode or the deployment target moves.

**`placeholder(in:)` is synchronous and must stay off the network.** Apple documents it as
returning a `TimelineEntry` immediately, and `AppIntentTimelineProvider` makes only `snapshot` and
`timeline` async. So `getRates()` is `async` and awaited from those two, never blocked on a
`DispatchSemaphore`, which is what Apple asks of anything running from a task. `placeholder` reads
`storedRates()` and nothing else.

Returning no rates there is not an option: WidgetKit paints the placeholder as the widget content
until the first timeline lands, so an empty one shows "Cotizaciones no disponibles" right after an
install. `placeholderEntry` falls back to synthesised values, and they are **equal and non zero on
purpose**: `SpreadWidgetEntryView` divides one price by the other, so a pair of zeros gives NaN.
If revisited, the check is to install and look at the widgets before opening the app.

## Widget configuration

Configuration is App Intents, not the SiriKit `.intentdefinition` it used to be. What holds it
together, all of it load bearing:

- `CustomIntentMigratedAppIntent` + `static let intentClassName` on each intent. This is what keeps
  the configuration of widgets already placed by users when they update. Verified on device.
- `static let isDiscoverable = false`. AppIntents flips the SiriKit default: without this the three
  configuration intents show up in the Shortcuts app as actions named in English.
- All three queries are `EntityStringQuery`, so `entities(matching:)` backs the search field in
  every rate picker. It does not decide whether a picker opens compact or full screen; what does is
  not known.
- `entities(for:)` resolves in the order asked for. The list widget lets the user drag its rates
  around and that order is the configuration.
- `@Parameter(size: [...])` replaces `INIntentParameterArraySizes`. All eight families are listed
  exactly as the `.intentdefinition` had them even though only two are supported, for schema parity.
- The three rate parameters are **non optional**, and the collections each carry their own query.
  See the trap above, this is the whole reason a fresh widget opens on its defaults.

A rate retired from `Helper.getRateTypes()` no longer resolves, so `entities(for:)` drops it from
the selection. The provider only substitutes defaults when that leaves the selection empty,
otherwise the remaining rates stay. It already rendered nothing before, since `lookupRateValues`
filters unknown types.

### The blank rows on the first open of a migrated widget

A widget carried over from the SiriKit build shows its collection rows empty the first time its
configuration sheet opens, right count and drag handles but no labels. Close and reopen and they
are there for good. Once per placed widget, only on widgets that existed before the update, never
on one added new, and the widget itself renders the right rates throughout. The stored
configuration is intact: the rates the user picked survive the update.

Accepted, and not the same defect as the "Seleccionar" one, which was ours and is fixed above.
There is no evidence it is a bug in iOS either. On the open that paints blank the query does answer,
measured with `os_log` on device: three identifiers in, three entities out, three display
representations handed over, three empty rows drawn. Closing the sheet untouched leaves the widget
unchanged, so nothing was written over the stored configuration.

Tested on device and fallen, do not re-run:

| Candidate | How it fell |
|---|---|
| Lazy migration that never consults the query | `entities(for:)` is called on the first pass |
| `compactMap` dropping legacy identifiers | `asked=3 -> got=3`, nothing was dropped |
| `AppIntentTimelineProvider.recommendations()` | returned two visibly different entries, the gallery showed neither |
| `static var parameterSummary { Summary() }` | lands in the metadata as `actionConfiguration`, no change |
| A custom `init()` on the intent assigning the rates | no change |
| `DisplayRepresentation` built without string interpolation | no change |
| Moving the intents into `_shared/` so the app target compiles them | the app metadata did gain the entity and query, no change |
| Clean uninstall plus device reboot, to rule out a stale `appintentsd` index | no change |

## Rollback

The plugin only runs at prebuild, never at runtime. If it breaks: `expo prebuild -p ios`, commit
the generated `packages/client/ios/`, drop `@bacons/apple-targets` from `app.config.ts` and un-ignore
`packages/client/ios/`. The Xcode project becomes hand maintained again, as it was before 2026-08.
