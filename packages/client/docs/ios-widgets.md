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
    Intents.swift                      AppEntity, AppEnum, the 3 WidgetConfigurationIntent
    Utils/Helper.swift                 the rate list, mirrored by Format.kt on android
    FiraGO-Regular.otf                 symlink, see below
    Assets.xcassets/                   source, committed
```

`@bacons/apple-targets` links the folder as a `PBXFileSystemSynchronizedRootGroup`: Xcode globs it
at build time, so **any file dropped in becomes part of the target** and Swift-only edits do not
need a prebuild. Adding, renaming or removing a file in `_shared/` does.

## Traps

**The font is a symlink**, pointing at the same `../../assets/fonts/FiraGO-Regular.otf` that
`expo-font` puts in the app. Never turn it into a copy. Measured on device: an extension only loads
fonts from its own bundle, so the file in the target folder, `UIAppFonts` in the target `Info.plist`
and `Font.custom("FiraGO-Regular", ...)` are all three required, and dropping either of the first
two falls back to the system font silently. It survives EAS, the archive keeps symlinks verbatim and
`assets/` ships with it.

**`Assets.xcassets` is committed source.** The plugin only creates and writes, never deletes, so a
hand written entry survives every prebuild and a renamed colorset lingers until removed by hand.
`AppWidgetIcon.symbolset` must not be declared in `images:` or the SVG ends up in the folder twice.

**`colors:` writes the assets, not the build settings.** The target template names both
`$widgetBackground` and `$accent` whatever the config says; `with-xcode-changes.js` then removes
`ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME` when `$accent` is absent but never removes the
widget background one. So dropping `$widgetBackground` leaves a setting pointing at a colorset that
no longer exists. `$accent` is left undeclared on purpose: the hand written project pointed
`AccentColor` at the system `linkColor` and the plugin only emits literal display-p3 components, so
declaring it would freeze a hex of ours where a system colour used to be. The tint falls back to the
system default instead.

**Never prebuild iOS without `--clean`.** It is the SDK 57 default; `--no-clean` crashes the plugin
and can duplicate targets first. Upstream issues 201 and 202.

**Deployment target is 17.0**, above the app's 16.4, because `AppIntentConfiguration` requires it.
Deliberate. It costs widgets on iOS 16.4 to 16.7 only, the app itself needs 16.4.

**The extension reports `CFBundleDevelopmentRegion = en`** where the hand written project said
`es-419`, and it cannot be fixed from the target `Info.plist`: `GENERATE_INFOPLIST_FILE` makes Xcode
synthesise it from the project level `developmentRegion`, which no Expo option exposes. Measured
twice. Nothing resolves against it, every string is a Swift literal, and the App Store language
comes from the app bundle, which still reports `es-419`. Localizing the widget one day means a
config plugin.

**No `icon` in the target config**, so the extension inherits the project level
`ASSETCATALOG_COMPILER_APPICON_NAME`. Fine with a plain PNG app icon, revisit before moving to an
Xcode 26 `.icon` bundle. Upstream issue 159.

**`placeholder(in:)` goes to the network, leave it.** Apple asks that callback to return immediately
and ours can block five seconds in `getRates()`, so it reads like a bug. Reading `storedRates()`
instead was tried and made the widget show "Cotizaciones no disponibles" right after an install:
WidgetKit paints the placeholder as the widget content until the first timeline arrives, and the
blocking fetch is what fills that gap. If revisited, the check is to install and look at the widgets
before opening the app.

## Widget configuration

Configuration is App Intents, not the SiriKit `.intentdefinition` it used to be. What holds it
together, all of it load bearing:

- `CustomIntentMigratedAppIntent` + `static let intentClassName` on each intent. This is what keeps
  the configuration of widgets already placed by users when they update. Verified on device.
- `static let isDiscoverable = false`. AppIntents flips the SiriKit default: without this the three
  configuration intents show up in the Shortcuts app as actions named in English.
- `RateTypeQuery` is an `EntityStringQuery` and not an `EntityQuery`. Being searchable is what makes
  the system present the full sheet with a search field instead of a compact menu.
- `entities(for:)` resolves in the order asked for. The list widget lets the user drag its rates
  around and that order is the configuration.
- `@Parameter(size: [.systemSmall: 3])` replaces the per-family fixed array sizes SiriKit had.

A rate retired from `Helper.getRateTypes()` no longer resolves, so widgets configured with it fall
back to defaults. It already rendered nothing before, since `lookupRateValues` filters unknown
types.

### The blank rows on the first open are an iOS bug, do not chase them

A widget carried over from the SiriKit build shows its array rows empty the first time its
configuration sheet opens, right count and drag handles but no labels. Close and reopen and they
are there for good. Once per placed widget, never on one added new, only the two array widgets, and
the widget itself renders the right rates throughout. Reproduced on two devices, iOS 26 and 27, over
nine instances, so it is not a regression in either.

It was measured, not argued. On the open that paints blank we resolve everything and the system
asks us how to draw it:

```
01:00:03.495  entities(for:) asked=3 -> got=3
01:00:03.496  displayRepresentation   x3
```

Three identifiers in, three entities out, three display representations handed over, three empty
rows drawn. Closing the sheet untouched leaves the widget unchanged, which is only possible if the
sheet held the right selection all along.

Five candidates were tested on device and all five fell. Do not re-run these:

| Candidate | How it fell |
|---|---|
| Lazy migration that never consults the query | `entities(for:)` is called on the first pass |
| `compactMap` dropping legacy identifiers | `asked=3 -> got=3`, nothing was dropped |
| The blocking network call in `placeholder(in:)` | a freshly added widget runs the same code and never fails |
| One shared query whose `defaultResult()` returns a scalar | split into three queries, no change |
| Collection parameter backed by `EntityStringQuery` | dropped to plain `EntityQuery`, no change |

The shape is not the problem either. Xcode's own SiriKit converter emits exactly this, and
`twofas/2fas-ios` ships the identical `CustomIntentMigratedAppIntent` plus `[Entity]?` since 2024.
`TransientAppEntity`, which Apple's migration page names for custom objects, is impossible here: its
`id` is a framework owned `UUID` that cannot carry `oficial`, and its private query has no
`suggestedEntities`, so there would be no picker. Two Apple feedbacks on `[AppEntity]` collection
configuration in these versions are open and unanswered, FB23075373 and FB23114212.

## Rollback

The plugin only runs at prebuild, never at runtime. If it breaks: `expo prebuild -p ios`, commit
the generated `ios/`, drop `@bacons/apple-targets` from `app.config.ts` and un-ignore
`packages/client/ios/`. The Xcode project becomes hand maintained again, as it was before 2026-08.
