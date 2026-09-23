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

The intents live in `packages/client/targets/RateWidgets/_shared/` and not next to the views, so the
**main app target compiles them too**, which the plugin README asks for. The app target is 16.4
against the extension's 17.0, which is why the intents carry `@available` annotations.

## Traps

**The font is a symlink** to the same `packages/client/assets/fonts/FiraGO-Regular.otf` `expo-font`
puts in the app. Never turn it into a copy. Measured on device: an extension loads fonts only from
its own bundle, so the file in the target folder, `UIAppFonts` in the target `Info.plist` and
`Font.custom("FiraGO-Regular", ...)` are all three required, dropping either of the first two falls
back to the system font silently. Survives EAS, measured by simulating the upload, the symlink and its target both go because
`packages/client/assets/` ships.

**`Assets.xcassets` is compiled whole, only part of it is source.** Xcode globs the folder, anything
in it lands in `Assets.car`. `AppWidgetIcon.symbolset` is hand made and committed, WidgetKit picks
it up by name, so it needs no target config entry and must not go in `images:` or the SVG lands
twice. The two colorsets are plugin output, rewritten every prebuild, ignored by git and EAS.

**`colors:` owns the colorset and the build setting together, you cannot keep one without the
other.** Per name it writes the colorset into the source tree each prebuild, and
`with-xcode-changes.js` sets `ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME` /
`ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME` only while the entry exists. The trick that
keeps `AppWidgetIcon.symbolset` out of `images:` has no equivalent: drop `$accent` and the colorset
survives but the gallery button goes black.

**The hex in `colors:` is p3, not sRGB.** `with-ios-colorset.js` always emits
`color-space: display-p3`, so `#007AFF` goes in as `#3478F6` and `#0A84FF` as `#3B82F7` or the tone
comes out visibly off. A system color reference (`{"platform":"ios","reference":"linkColor"}`) was
tried, the next prebuild overwrote it. Doing it properly needs our own config plugin after
`apple-targets`, not worth a difference that only shows under increased contrast.

**Never pass `--no-clean`.** Cleaning is the default. Upstream issues 201 and 202 report
`--no-clean` crashing the plugin and duplicating targets; not reproduced here, and not worth
reproducing.

**Deployment target is 17.0**, above the app's 16.4, because `AppIntentConfiguration` requires it.
Deliberate. It costs widgets on iOS 16.4 to 16.7 only, the app itself needs 16.4.

**Extension reports `CFBundleDevelopmentRegion = en`**, hand written project said `es-419`. Not
fixable from the target `Info.plist`, `GENERATE_INFOPLIST_FILE` synthesises it from project level
`developmentRegion` and no Expo option exposes that. Measured twice. Harmless, every string is a
Swift literal and the store listing still reads Spanish. Localizing one day needs a config plugin.

**No `icon` in the target config**, so the extension inherits the project level
`ASSETCATALOG_COMPILER_APPICON_NAME`. Fine with a plain PNG app icon, revisit before moving to an
Xcode 26 `.icon` bundle. Upstream issue 159.

**The rate parameters have to be non optional.** `[RateType]?` is what Xcode's converter emits and
with it the editor opens on three "Seleccionar" rows while the widget renders fine off the provider
fallback. Dropping the `?` and giving the parameter its own query fixes it:

```swift
@Parameter(title: "Cotizaciones", size: [...], query: ListRateTypesQuery())
var rateTypes: [RateType]
```

Apple states it in `widgetkit/making-a-configurable-widget`: "If your widget includes nonoptional
parameters, you must supply a default value... A second option is to use a query type that
implements `defaultResult()`." `DefaultValue` is an associated type, one per query, so Lista and
Brechas each need their own `EntityQuery` to keep their own defaults. Per parameter queries exist
for collections, declared in `AppIntents.swiftinterface`.

Only the collections needed this, the single rate parameter opened on Oficial while still
`RateType?`. Why was never established. It is non optional too for symmetry, and that is the gap:
its upgrade path was never re-tested from an App Store build, the collections were. A widget coming
back from an update having lost its rate, look here first.

**The non optional warning is deliberate, do not silence it with `?`.** The metadata processor
prints, twice per parameter:

```
Encountered a non-optional type for parameter: rateTypes. Conformance to the following AppIntent
protocols requires all parameter types to be optional: ... AppIntents.WidgetConfigurationIntent
```

Making the parameter optional to quiet it is what breaks the defaults. The risk it points at was
measured and does not happen: a widget configured under the SiriKit build keeps its rates after
updating onto the non optional parameter, tested on device with four widgets, two hand configured
and two on defaults. Re-test whenever Xcode or the deployment target moves.

**A stale `DerivedData` can ship the extension without its AppIntents metadata**, and the symptom
reads like a code bug. Every gallery preview renders redacted, and the log says:

```
Failed to instantiate type SelectRateTypeIntent by name (9mbitoDlar20SelectRateTypeIntentV).
The type with this mangled name does not exist in the process's memory space.
Returned view collection was either nil or empty.
```

`mbitoDlar` there is the app's Swift module and the `9` is its length, so the extension is being
asked for the app executable's copy of the intent, which its own process does not carry. Measured in
that build: `RateWidgetsExtension.appex` shipped with no `Metadata.appintents` while the app's
declared all three. Deleting `~/Library/Developer/Xcode/DerivedData/mbitoDlar-*` and building again
produced it, with `RateWidgetsExtension` mangled names, and the widgets rendered.

Why the task did not run is not settled. XCBuild had `ExtractAppIntentsMetadata` in its manifest for
that exact output and the file was absent, after a prebuild had regenerated the project underneath.
The build database was never inspected, so the cache is the working diagnosis and not a proven one.
Check the product before touching any source, the embedded copy and the standalone one both:

```
ls ~/Library/Developer/Xcode/DerivedData/mbitoDlar-*/Build/Products/*/{mbitoDlar.app/PlugIns/,}RateWidgetsExtension.appex/
```

Both targets compiling `_shared/Intents.swift` is the design and was not the fault here. Moving the
file out of `_shared/` was tried and did not help, it only drops the app's copy.

**The endpoint is hardcoded** in `getRates()`, so unlike android this side never reads `API_URL`. A
build pointed at another host ships ios widgets still reading production, silently.

**`placeholder(in:)` is synchronous and must stay off the network.** Apple documents it as
returning a `TimelineEntry` immediately and `AppIntentTimelineProvider` makes only `snapshot` and
`timeline` async, so `getRates()` is `async` and awaited from those two, never blocked on a
`DispatchSemaphore`. `placeholder` reads `storedRates()` and nothing else.

Returning no rates is not an option, WidgetKit paints the placeholder as the widget content until
the first timeline lands so an empty one shows "Cotizaciones no disponibles" right after an install.
`placeholderEntry` falls back to synthesised values, **equal and non zero on purpose** because
`SpreadWidgetEntryView` divides one price by the other and a pair of zeros gives NaN. If revisited,
install and look at the widgets before opening the app.

**Nothing serialises the three providers**, `getRates()` reads the cache at the top and writes it
once the response lands, so a concurrent reload may cost three requests instead of one. Never
measured. Android has no hole here, `RatesApi.fetch` is `@Synchronized` on a single thread executor.

**`@bacons/apple-targets` is in `expo.autolinking.exclude`** so its `ExtensionStorageModule` stays
unlinked. That module is the App Group bridge and would let a widget render without a request of its
own, but three things block it: the app holds `{type: {stats: [...]}}` while both widgets parse
`{type: [ts, value, change]}`; an injected payload renders from one source while the fallback
renders from the other, so a rate gated in one corrupts a widget with no build error; and it would
have to pass `usableRates` here and `parse` on android, the choke point that keeps a malformed
payload off a widget. Taking the package out of that list also retires
`packages/client/modules/widgetkit/`, which ships `reloadWidget`.

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
configuration sheet opens, right count and drag handles but no labels. Close and reopen and they are
there for good. Once per placed widget, never on one added new, and the widget renders the right
rates throughout. Accepted: the stored configuration is intact and closing the sheet untouched
writes nothing over it. Not the "Seleccionar" defect, which was ours and is fixed above. On the open
that paints blank the query does answer, measured with `os_log` on device: three identifiers in,
three entities out, three display representations handed over, three empty rows drawn.

Tested on device and fallen, do not re-run:

| Candidate                                                                   | How it fell                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Lazy migration that never consults the query                                | `entities(for:)` is called on the first pass                       |
| `compactMap` dropping legacy identifiers                                    | `asked=3 -> got=3`, nothing was dropped                            |
| `AppIntentTimelineProvider.recommendations()`                               | returned two visibly different entries, the gallery showed neither |
| `static var parameterSummary { Summary() }`                                 | lands in the metadata as `actionConfiguration`, no change          |
| A custom `init()` on the intent assigning the rates                         | no change                                                          |
| `DisplayRepresentation` built without string interpolation                  | no change                                                          |
| Moving the intents into `_shared/` so the app target compiles them          | the app metadata did gain the entity and query, no change          |
| Clean uninstall plus device reboot, to rule out a stale `appintentsd` index | no change                                                          |

## Rollback

The plugin only runs at prebuild, never at runtime. If it breaks: `expo prebuild -p ios`, commit
the generated `packages/client/ios/`, drop `@bacons/apple-targets` from `app.config.ts` and un-ignore
`packages/client/ios/`. The Xcode project becomes hand maintained again, as it was before 2026-08.
