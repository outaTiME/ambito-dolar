# Android widgets

Read this before touching anything under `packages/client/modules/widgets/`, the ios
`RateWidgets` target, or the widget previews. `AGENTS.md` carries the pointer and the trap
lines, this file carries everything else.

## The module

Native, in the local expo module `packages/client/modules/widgets/`. RemoteViews and XML layouts, no react-native, no Compose. Android stays CNG: `packages/client/android/` is generated, only the module is checked in, and autolinking merges its manifest and `res/` into the app, so no config plugin.

- **The card is square** through an ImageView with `adjustViewBounds` over a 1:1 shape drawable. Never `match_parent`. Sizing the card from what the launcher reports is unreliable, measured on two phones: a Moto Edge 30 Ultra cropped 16dp, a Galaxy S9 scaled to 78%.
- **The text sizes scale to the reported width, `scaleFor` in `WidgetProvider.kt`.** `Sizes` is a
  proportion of the card, so every size is multiplied by `reported / REFERENCE_DP`, clamped to
  `SCALE_FLOOR .. 1`, and the padding follows at `(1 + scale) / 2`. `REFERENCE_DP` is 170 and has to
  stay **under the narrowest report that still renders right**, the 174 of an s9. `SCALE_FLOOR` is
  0.7, past it `TextBitmap` ellipsizes. The picker preview has no widget to ask and gets 1.
  Measured with `uiautomator dump`, reported against drawn: s9 on android 10 and one ui 174/144
  right, android 12 emulator 175/176 right, android 10 emulator 130/130 overflows. The two do not
  track, so the ratio is the signal.
- **One role, one size, in `Sizes.kt`.** The ios point sizes times `1.05`, measured as glyph height over card width, independent of screen and density. In dp not sp, so the system font scale cannot move them, which is what `sizeCategory large` does on ios.
- **A date that looks lighter on one widget is antialiasing or the launcher scaling it down**, never a different color. Roles live in `views()`, each widget declares only which slot carries the change color, because ios colors the small one on the rate and the big one on the spread.
- **Gated to api 26** with `android:enabled="@bool/widget_supported"` plus a `values-v26` override, because `Resources.getFont` is api 26 and the text is drawn with it. Below that the launcher never lists the widgets.
- **`android:fontFamily` does NOT work here.** The launcher builds the views in its own process and resolves only system typefaces, so the font falls back with no error and no log line. Measured on four devices: holds on One UI, fails on pixel, motorola, emulator. Not a format problem, a `.ttf` fails the same.
- **The text is drawn here and travels as a bitmap.** `TextBitmap.of()` is the one routine every slot goes through, so a fourth widget writes no render code. Only the glyphs are pixels, the card and layout stay real views. Around 325 KB per list redraw against a 1 MB binder ceiling, `ALPHA_8` plus a tint would cut it to a quarter.
- **A restore does hand out new ids**, so `onRestored` moves the config keys across and is not dead code. `allowBackup` is false in `packages/client/app.config.ts` but from android 12 that no longer covers a device to device transfer, which is `dataExtractionRules` and there is none, so where a manufacturer still allows it the default applies.
- **Redraw triggers**: `APPWIDGET_UPDATE`, `MY_PACKAGE_REPLACED`, `LOCALE_CHANGED`, `TIMEZONE_CHANGED`, all through `goAsync` and all hitting `/fetch`, plus `reloadWidgets()` from `withRateUpdates` and the config save. Locale and zone matter because separators and time are read at render. `MY_PACKAGE_REPLACED` matters because an app update re-inflates every widget from `initialLayout` and without it they sit bare up to half an hour.
- **The periodic redraw is a WorkManager `PeriodicWorkRequest`**, 30 min behind a network constraint. `updatePeriodMillis` is 0 on purpose: it is an alarm, it fires with no network, and those redraws died in milliseconds on a doze wake. A failed fetch returns `Result.retry()` with no count of our own, WorkManager re-evaluates the constraint and backs off 30s doubling to five hours.
- `adb shell am broadcast APPWIDGET_UPDATE` is protected and does NOT force a redraw, call `provider.refresh(context)`.
- **The endpoint is not hardcoded.** The module `build.gradle` emits `widget_api_url` from the same `API_URL` the app reads, falling back to production. The trap: `resValue` reads `System.getenv` at gradle configuration time and a bare `./gradlew assembleRelease` does not load `packages/client/.env`, while the js bundle comes from `expo export:embed`, which does. So a `.env` pointed at staging ships a staging app with production widgets, silently. `expo run:android --variant release` and eas read both from the same place.
- **One `/fetch` for a burst.** `RatesApi` holds the payload 10s, collapsing the three providers into one request. It has to stay under WorkManager's 30s minimum backoff or the first retry lands inside the window and reports success on stale data. ios holds 60s in `getRates()`, on disk, because each reload there can be a separate extension invocation while the three android providers share the app process. One attempt, `connectTimeout` and `readTimeout` at 4s each, body capped at 256K characters and not bytes because an `OutOfMemoryError` is an `Error` no catch would hold.
- **Neither side stores an answer it cannot use**, both require a 2xx and at least one known rate before replacing the persisted payload: an error body is valid json too. ios stores the filtered rates, android the raw body, filtered again on read.
- **A failed fetch never lowers what a widget shows.** `fetch` answers with the last call that came back or the payload on disk, and only another call that came back replaces it.
- **Null means this process never got an answer and there is nothing on disk.** Then every id draws the empty text instead of the bare `initialLayout`, which has no text and not even a tap. Verified on a device: data cleared, booted with no network, all three drew the empty text.
- **Nothing is cached across a locale change.** The `DecimalFormat` is built per call and not held in a lazy, which would freeze the separators of whatever locale was set the first time a widget drew.
- **Unknown rate types are dropped at parse time**, `Format.isKnown` mirroring the ios `Helper.getRateTypes().contains`. The service still sends the retired `qatar` and `ahorro`, and without the filter the widget titles a rate with its raw id. Survivors keep their order and compact to the top, blanks pad the bottom, same as the ios `compactMap`. The spread needs both sides or it goes empty, the list only when none of the three survives.
- **Widget order in the picker follows the labels, not the declaration.** The launcher sorts alphabetically. Measured twice: two declaration orders gave the same picker, and renaming the labels to `Zzz`/`Aaa`/`Mmm` reordered it. Labels have to match `.configurationDisplayName(...)`, so the order is not ours to pick.
- **`previewImage`**: regenerate from a live device with `node scripts/widget-preview.js assets/widgets/android-rate-2x2.png [--device serial]` from `packages/client`, ImageOptim after. The module `build.gradle` copies the three pngs into `drawable-nodpi` straight from `packages/client/assets/widgets/` at build time, no prebuild step between. From android 15 `setWidgetPreview` replaces them at runtime with the real rates, capped at two calls per hour per provider.
- Android cannot re-render a widget on a system theme change, so they are forced dark like ios.
- **Logs**: `adb logcat -s AmbitoWidgets` prints nothing on One UI even with the lines in the buffer, measured on a galaxy s9: 0 against 324 for the same log. Use `adb logcat AmbitoWidgets:I *:S`. One line per redraw with its trigger and how many widgets it drew, one per call to the service with its duration.
- Module resources are all prefixed `widget_`, plus `Theme.Widget.Config`. Keep it, everything merges into one namespace with the app.

### Both platforms or neither

Written twice, Swift and Kotlin, so these move together. Touching one side alone is the bug that
gets shipped.

- **A rate added or retired**: `packages/client/targets/RateWidgets/_shared/Helper.swift`
  `getRateTypes()` and `Format.kt` `RATE_TYPES`, both mirroring `getAvailableRateTypes()` in
  `packages/core`, which owns the order. `getRateTitle` there is a third copy of the labels that has
  to agree. Retired ones stay commented on the ios list, absent from the kotlin one which doubles as
  the picker, so a widget still on a retired type shows its raw id until the user picks another.
- **A rate label**: the `display` of the ios entry and the second half of the kotlin pair.
- **A font size**: `RateWidgets.swift` carries the point sizes and `Sizes.kt` the same numbers
  times 1.05. Change the role, not the factor.
- **A default**: ios in `Helper.swift`, `getDefaultRateType`, `getDefaultRateTypes` and
  `getDefaultSpreadRateTypes`, read from `RateTypeQuery.defaultResult` for the single rate and from
  each provider's `rateTypes(for:)` fallback for the two lists; android in each provider's
  `defaultRates`.
- **A /fetch schema change**: ios first, always. `lookupRateValues` reads the array by index and
  forces its casts, surviving only because `wellFormed` filters ahead of it, while android drops the
  rate and keeps the rest. The timestamp is already guarded, `ISO8601DateFormatter` with default
  options rejects fractional seconds.

### A new widget

- **iOS**: a `struct X: Widget` with its `kind`, added to the `RateWidgets` bundle, plus a
  `WidgetConfigurationIntent` with its parameters in `packages/client/targets/RateWidgets/_shared/Intents.swift`,
  which compiles into the app target as well as the widget one.
- **Android**: a `WidgetProvider` subclass, one line in `Widgets.ALL`, a `<receiver>`, an
  `packages/client/modules/widgets/android/src/main/res/xml/widget_x_info.xml`, label and description in `strings.xml`, the preview png in
  `packages/client/assets/widgets/` and its line in the module `build.gradle`. Four are static
  registrations android demands and cannot be factored away. Reusing `widget_card.xml` or
  `widget_list.xml` costs nothing more, a new shape needs a `Content` subtype and a branch in
  `views()`.
- The config screen takes a new widget with no changes as long as it picks rates and, optionally,
  buy/average/sell. Anything else is a change there.

The root `AGENTS.md` lists the four things outside the widgets that break them when moved. Two of
them are only documented here:

- **The deep link**, the `ambito-dolar` scheme and the `/rates[/type]` route, hardcoded in `WidgetProvider.openApp`. Changing the scheme in `app.config.ts` leaves the tap doing nothing, silently.
- **The theme.** `Theme.Widget.Config` and the app `AppTheme` are siblings under `Theme.AppCompat.DayNight.NoActionBar`, not parent and child, so nothing set on the app theme reaches the config screen, which inherits appcompat's own accent instead. Two consequences: the screen follows the system light or dark and not the in-app Tema setting, because that one is applied by react native and the launcher usually starts this activity in a process where it never ran; and moving it under `AppTheme` is the change to make if the two are ever meant to agree.

Going the other way there is a single line: `withRateUpdates` calls `reloadWidgets()` next to the ios `WidgetKit.reloadAllTimelines()`. Both cost a `/fetch`, the app payload and the service one are not the same shape.

### Config screen

`WidgetConfigActivity` serves every widget and reads which one it is from the id the launcher passes (`getAppWidgetInfo(...).provider`). Sections with their chosen values, each row opening a picker.

- **Every piece is framework**: the `PreferenceCategory` recipe for the section title, the appcompat picker item for the value row, `setSingleChoiceItems` for the picker. Nothing drawn by hand.
- **Appcompat `AlertDialog`, never the platform one.** On one ui the platform one becomes a full width bottom sheet that also tints the status bar.
- **Never a Material3 theme here.** The exposed dropdown and the segmented button need it and it paints `statusBarColor` and `navigationBarColor`. Tried and reverted, twice.
- **Only `Listo` persists.** Picking writes to memory, so backing out of a widget being reconfigured leaves it as it was, which is what the canceled result promises. The activity sets `RESULT_CANCELED` on create, so on a host that gates the add on this screen, system back drops the widget the user just placed: the confirm control must be affirmative, never an X or a back arrow. From api 31 `configuration_optional` lets the launcher place the widget on its defaults and never show this screen, so there the same result only means the reconfigure left everything as it was.
- Rows update in place after a pick, the dialog is never rebuilt under the user. Both it and the picker are held in fields and dismissed in `onDestroy`, the pending selection survives a rotation through `onSaveInstanceState`.
- Per widget config in SharedPreferences `ambito_widgets`, keys `rate0_<id>`, `rate1_<id>`, `rate2_<id>` and `value_<id>`, cleaned on delete. The same file also holds `last_payload`, which is the fallback above and is not per widget, so it is never cleaned.
- Picking a rate another slot holds swaps them, so a widget never shows the same rate twice.
- Defaults belong to each widget and mirror the ios ones: rate `oficial`, list `oficial, bna, informal`, spread `informal, bna`.

## Picker copy

- **iOS is the base for meaning, not for format.** New Android copy derives verb + noun from the iOS `.description(...)`, never invented fresh.
- iOS `.description(...)` is a full sentence with a trailing period, Android `description` is imperative, 4-8 words, **no trailing period**, matching the android picker style. iOS `Consultá las cotizaciones a lo largo del día.` becomes Android `Consultá las cotizaciones del día`. Shorter is always safe, the picker truncates.
- `label` (Android) and `.configurationDisplayName(...)` (iOS) are the same string.
- Config section titles come from the `@Parameter(title:)` of each `WidgetConfigurationIntent`: `Cotización` or `Cotizaciones` plus `Mostrar`. Singular when the widget takes one rate, plural when it takes several.
