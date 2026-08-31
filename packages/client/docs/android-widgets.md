# Android widgets

Read this before touching anything under `packages/client/modules/widgets/`, the ios
`RateWidgets` target, or the widget previews. `AGENTS.md` carries the pointer and the trap
lines, this file carries everything else.

## The module

Native, in the local expo module `packages/client/modules/widgets/`. RemoteViews and XML layouts, no react-native and no Compose. Android stays CNG: `packages/client/android/` is generated, only the module is checked in, and autolinking merges its manifest and its `res/` into the app, so no config plugin is needed.

- **Three providers over one base.** `WidgetProvider` holds the machinery: `goAsync`, the executor, the fetch, the empty state, the deep link, the android 15 preview, the cleanup on delete. `RateWidget`, `ListWidget` and `SpreadWidget` only declare their defaults, label, empty text, layout and how they fill the slots. A fourth widget writes no machinery, only that declaration, plus the registrations listed below.
- **Two layouts, not three.** `widget_card.xml` is the six slots every ios systemSmall card lays out, title / detail / gap / small / big / date, and serves the rate and the spread: what changes is which value lands on which slot and which one carries the change color. `widget_list.xml` is the three rate one. `Content.Card` and `Content.Rows` pick between them.
- **The card is square** through an ImageView with `adjustViewBounds` over a 1:1 shape drawable. Never `match_parent` on the card. Sizing the card from what the launcher reports is unreliable, measured on two phones: a Moto Edge 30 Ultra cropped 16dp and a Galaxy S9 scaled to 78%.
- **The sizes scale to the card, `scaleFor` in `WidgetProvider.kt`.** `Sizes` is a proportion of the
  card, glyph height over card width, so it holds only while the card is the width it was calibrated
  at, and that width is the launcher decision, not the android version. Every size is multiplied by
  `reported / REFERENCE_DP`, coerced into `SCALE_FLOOR .. 1`, and the content padding follows at
  `(1 + scale) / 2`, since left fixed it reads as a frame around a card that shrank around it.
  The cap at 1 is what keeps every card at or over the reference rendering exactly as it does today,
  and `REFERENCE_DP` stays **under the narrowest report of a device that renders right** so that it
  lands there: 170 against the 174 of an s9, and raising it past 174 would start shrinking that
  phone. `SCALE_FLOOR` is 0.7, past which the ellipsis reads better than more shrinking and
  `TextBitmap` already does it through `room` and `floor`. With no widget to ask, the picker preview gets 1 and is not
  scaled. That could differ from the placed widget on a launcher with small cards, but the two
  ranges do not overlap: a small card comes from placing by `minWidth` below api 31, and the live
  preview is api 35, where `targetCellWidth` already hands over the full cell. Falling back to the
  declared `minWidth` would not help either, 110dp lands under `SCALE_FLOOR` and would shrink every
  preview on every phone. Worst case here is a cramped card in the picker while the placed one is
  right, which is cosmetic.
  Measured with `uiautomator dump` against the reported width: a galaxy s9 on android 10 with one ui
  reports 174dp and draws 144 and renders right, an android 12 emulator reports 175 and draws 176
  and renders right, an android 10 emulator reports 130 and draws 130 and the content overflows it.
  The two numbers do not track each other, so the ratio is the signal and not the difference.
- **One role, one size, in `Sizes.kt`.** The ios point sizes times `1.05`, measured as glyph height over card width, which is independent of screen and density: android then lands inside the spread ios already has between an iPhone Air and a 15 Pro Max. In dp and not sp, so the system font scale cannot move them, which is what `sizeCategory large` does on ios. A new widget picks roles from there and adds none, or the same date drifts to two sizes as it once did, 12.1 on the card against 12.7 on the list.
- **One role, one color.** `widget_foreground` for names, titles and values, `widget_secondary` for subtitles and dates, the change color only on the percentage. The roles live in `views()`; each widget declares only which slot carries the change color, because ios colors the small one on the rate and the big one on the spread. They are `fgColor`, `fgSecondaryColor` and `changeColor` on the ios side, and the date is `#8E8E93` on all three widgets. A date that looks lighter on one is antialiasing or the launcher scaling it down, never a different color.
- **The box is the one a TextView reserves by default**, top to bottom of the font and not just ascent to descent, which `setIncludePad` keeps. The list lines used to turn that padding off because Roboto reserved room ios does not, and once the text is drawn with FiraGO the two boxes are within two pixels, so there is no exception left to carry.
- **Gated to api 26** with `android:enabled="@bool/widget_supported"` plus a `values-v26` override, because `Resources.getFont` is api 26 and the text is drawn with it. Below that the launcher never lists the widgets.
- **`android:fontFamily` does NOT work here.** The launcher builds the views in its own process and resolves only system typefaces, so the font falls back with no error and no log line. Measured on four devices: holds on One UI, fails on pixel, motorola and the emulator. Not a format problem, a `.ttf` fails the same.
- **The text is drawn here and travels as a bitmap.** `TextBitmap.of()` is the one routine every slot goes through, so a fourth widget writes no render code. Only the glyphs are pixels, the card and the layout stay real views, so the launcher lays the row out. The reported width feeds two things: the ellipsis ceiling in `roomPx`, at twice the card, and the size scaling above, which is the one measurement the render does depend on. Around 325 KB per list redraw against a 1 MB binder ceiling; `ALPHA_8` plus a tint would cut it to a quarter if it ever gets close.
- The font file is not duplicated, a Copy task in the module `build.gradle` brings it from `packages/client/assets/fonts/` at build time, the same way the ios pbxproj references it once for two targets. It is referenced from exactly one place now, `TextBitmap`, and `Resources.getFont` is api 26, so the gate still holds.
- **A restore does hand out new ids**, so `onRestored` moves the config keys across and is not dead code. `allowBackup` is false in `packages/client/app.config.ts`, which used to settle it, but from android 12 that flag no longer covers a device to device transfer: that one is `dataExtractionRules`, there is none, so the default applies and the widgets come across with new ids.
- **Redraw triggers**: `APPWIDGET_UPDATE`, `MY_PACKAGE_REPLACED`, `LOCALE_CHANGED` and `TIMEZONE_CHANGED`, all through `goAsync` and all hitting `/fetch`, plus `reloadWidgets()` from `AppContainer` and the config save. The locale and zone ones matter because separators and time are read at render, so without them a change leaves the widget wrong for half an hour.
- **The periodic redraw is a WorkManager `PeriodicWorkRequest`**, 30 min behind a network constraint, which is the shape of the google widget sample. `updatePeriodMillis` is 0: it is an alarm, it fires with no network, and those redraws died in milliseconds on a doze wake. No flex, because it narrows the window a constrained run has to land in and makes a skipped period more likely. A failed fetch returns `Result.retry()` with no count of our own: WorkManager re-evaluates the constraint before running again and backs off 30s doubling to five hours, so that one line already means come back when there is network, and it survives the process dying. Measured: radio back on with the app never opened, redrawn in about 100s.
- `adb shell am broadcast APPWIDGET_UPDATE` is protected and does NOT force a redraw, call `provider.refresh(context)`.
- **An app update re-inflates every widget from `initialLayout`**, which is why `MY_PACKAGE_REPLACED` is handled: without it they sit there up to half an hour. Measured at 2 to 6 seconds. That initial state is the bare card and not the unavailable text, because in those seconds the rates are loading, not missing.
- **The endpoint is not hardcoded.** The module `build.gradle` emits `widget_api_url` from the same `API_URL` the app reads, falling back to production, so a host change does not leave the widgets talking to the old one. A plain gradle build with no environment gets the fallback. That is the one trap here: `resValue` reads `System.getenv` at gradle configuration time and a bare `./gradlew assembleRelease` does not load `packages/client/.env`, while the js bundle comes from `expo export:embed`, which does. Point `.env` at staging and that build ships a staging app with production widgets, silently. `expo run:android --variant release` and eas read both from the same place and do not split.
- **One `/fetch` for a burst.** `RatesApi` holds the payload 10s, enough to collapse the timeline of three providers into one request. It has to stay under WorkManager's 30s minimum backoff or the first retry lands inside the window, makes no request and reports success on stale data. ios holds 60s in `getRates()`, on disk and not in memory, because each reload there can be a separate extension invocation while the three android providers share the app process. One attempt, `connectTimeout` and `readTimeout` at 4s each, which is what every google sample uses and nothing more; the body is capped at 256K characters, not bytes, because an `OutOfMemoryError` is an `Error` no catch would hold.
- **Neither side stores an answer it cannot use.** Both require a 2xx and at least one known rate before replacing the persisted payload, because an error body is valid json too and taking it would blank the widgets and leave that body as the fallback for the next failure. What they keep differs: ios stores the filtered rates, android stores the raw body and filters it again on read.
- **A failed fetch does not take rates off a widget.** `fetch` answers with what it has, the rates of the last call that came back or the payload on disk, and `cached` is only ever replaced by another call that came back, so nothing a failure finds can lower it. ios does the same through a `UserDefaults` fallback in `getRates()`.
- **Null is the other case**, and it means this process never got an answer and there is nothing on disk either. Then there is nothing to protect, so every id is drawn with the empty text instead of the bare `initialLayout`, which has no text and not even a tap. That is a first run with no network and it is what ios shows there. Verified on a device: data cleared, booted with no network, all three drew the empty text.
- **Nothing is cached across a locale change.** The `DecimalFormat` is built per call and not held in a lazy, which would freeze the separators of whatever locale was set the first time a widget drew.
- **A `/fetch` schema change goes to ios first**, see the sync section below. The timestamp is the one already guarded there, because `ISO8601DateFormatter` with its default options rejects fractional seconds and the backend growing milliseconds is one deploy away.
- **Unknown rate types are dropped at parse time.** The service still sends `qatar` and `ahorro`, retired and commented out in `Helper.swift`, and without the filter the widget titles a rate with its raw id. `Format.isKnown` is the same check as the ios `Helper.getRateTypes().contains`.
- **Retired rate types**: survivors keep their order and compact to the top, the blank slots pad the bottom, same as the ios `compactMap`. The spread needs both sides or it goes empty, the list only goes empty when none of the three survives.
- **Widget order in the picker follows the labels, not the declaration.** The launcher sorts alphabetically. Measured twice: two declaration orders gave the same picker, and renaming the labels to `Zzz`/`Aaa`/`Mmm` reordered it. Labels have to match `.configurationDisplayName(...)`, so the order is not ours to pick.
- **`previewImage`**: regenerate from a live device with `node scripts/widget-preview.js assets/widgets/android-rate-2x2.png [--device serial]` from `packages/client`, ImageOptim after. The module `build.gradle` copies the three pngs into `drawable-nodpi` straight from `packages/client/assets/widgets/` at build time, so there is no prebuild step in between. From android 15 `setWidgetPreview` replaces them at runtime with the real rates, capped at two calls per hour per provider.
- Android cannot re-render a widget on a system theme change, so they are forced dark like ios.
- **Logs**: `adb logcat -s AmbitoWidgets` prints nothing on One UI even with the lines in the
  buffer, measured on a galaxy s9: 0 against 324 for the same log. Use `adb logcat AmbitoWidgets:I
*:S`, which is the timeline. One line per redraw with its trigger and how many widgets it drew, one per call to the service with its duration. A cache hit logs nothing: `fetch` runs once per provider, so a full redraw is one request and two hits.

### Both platforms or neither

The widgets are written twice, once in Swift and once in Kotlin, so these move together. Touching
one side alone is the bug that gets shipped.

- **A rate added or retired**: `packages/client/targets/RateWidgets/_shared/Helper.swift` `getRateTypes()` and
  `Format.kt` `RATE_TYPES`. Both mirror `getAvailableRateTypes()` in `packages/core`, which is
  the order the app itself lists rates in, and the one the picker and the defaults read here.
  Retired ones stay commented on the ios list and are simply absent from the kotlin one, which doubles as the picker. A widget still configured on a retired type shows its raw id in the config row until the user picks another, which is the whole cost of not keeping a second list of names to hand sync. `getRateTitle` in the same core file is a third copy of
  the labels that also has to agree.
- **A rate label**: the `display` of the ios entry and the second half of the kotlin pair.
- **A font size**: `RateWidgets.swift` carries the point sizes and `Sizes.kt` the same numbers
  times 1.05. Measured against real captures, that factor puts android inside the spread ios
  already has between an iPhone Air and a 15 Pro Max, so change the role and not the factor.
- **A default**: ios in `Helper.swift`, `getDefaultRateType`, `getDefaultRateTypes` and
  `getDefaultSpreadRateTypes`, read from `RateTypeQuery.defaultResult` for the single rate and from
  each provider's `rateTypes(for:)` fallback for the two lists; android in each provider's
  `defaultRates`.
- **A /fetch schema change**: ios first, always. `lookupRateValues` reads the array by index and
  forces its casts, so it only survives because `wellFormed` filters ahead of it, while android drops
  the rate and keeps the rest.

### A new widget

- **iOS**: a `struct X: Widget` with its `kind`, added to the `RateWidgets` bundle, plus a
  `WidgetConfigurationIntent` with its parameters in `packages/client/targets/RateWidgets/_shared/Intents.swift`,
  which compiles into the app target as well as the widget one.
- **Android**: a `WidgetProvider` subclass, one line in `Widgets.ALL`, a `<receiver>`, an
  `packages/client/modules/widgets/android/src/main/res/xml/widget_x_info.xml`, label and description in `strings.xml`, the preview png in
  `packages/client/assets/widgets/` and its line in the module `build.gradle`. Four of those are static
  registrations android demands and cannot be factored away. Reusing `widget_card.xml` or
  `widget_list.xml` costs nothing more; a new shape needs a `Content` subtype and a branch in
  `views()`.
- The config screen takes a new widget with no changes as long as it picks rates and, optionally,
  buy/average/sell. Anything else is a change there.

### What the widgets take from the app

They are a complement, they do not change the app. Every touch point runs one way, the module reading from the app side, and each one fails differently if the app moves.

- **The font**, `packages/client/assets/fonts/FiraGO-Regular.otf`. A Copy task in the module `build.gradle` brings it in at build time. Renaming or moving it breaks the build at aapt, which is loud and fine.
- **The endpoint**, `API_URL`. The module emits it into the `widget_api_url` resource at build time, with production as the fallback. This one fails silently, the widgets would keep talking to the fallback.
- **The deep link**, the `ambito-dolar` scheme and the `/rates[/type]` route, hardcoded in `WidgetProvider.openApp`. Changing the scheme in `app.config.ts` leaves the tap doing nothing, also silently.
- **The theme.** `Theme.Widget.Config` and the app `AppTheme` are siblings under `Theme.AppCompat.DayNight.NoActionBar`, not parent and child, so nothing set on the app theme reaches this screen: `AppTheme` already defines `colorPrimary` and the bars and the config screen does not see any of them. What it does inherit is appcompat's own accent. Two consequences worth knowing before changing it: the screen follows the system light or dark and not the in-app Tema setting, because that one is applied by react native and the launcher usually starts this activity in a process where react native never ran; and moving it under `AppTheme` is the change to make if the two are ever meant to agree.

Going the other way there is a single line: `AppContainer` calls `reloadWidgets()` next to the ios `WidgetKit.reloadAllTimelines()`. Unlike the ios one it costs a `/fetch`, because the payload the app holds and the one the service returns are not the same shape.

Module resources are all prefixed `widget_`, plus `Theme.Widget.Config`. Keep it, everything merges into one namespace with the app.

### Config screen

`WidgetConfigActivity` serves every widget and reads which one it is from the id the launcher passes (`getAppWidgetInfo(...).provider`). Sections with their chosen values, each row opening a picker.

- **Every piece is framework.** The section title is the `PreferenceCategory` recipe (`TextAppearance.AppCompat.Body2`, 14sp medium, accent, 16dp margin over 8dp padding), the value row copies the appcompat picker item (`?attr/listPreferredItemHeightSmall`, `?android:attr/textAppearanceMedium`, `?attr/textColorAlertDialogListItem`), and the picker is `setSingleChoiceItems`, which is what `ListPreference` opens by itself. Nothing is drawn by hand.
- **Appcompat `AlertDialog`, never the platform one.** On one ui the platform one becomes a full width bottom sheet that also tints the status bar.
- **Never a Material3 theme here.** The exposed dropdown and the segmented button need it and it paints `statusBarColor` and `navigationBarColor`. Tried and reverted, twice.
- **Only `Listo` persists.** Picking writes to memory, so backing out of a widget being reconfigured leaves it as it was, which is what the canceled result promises. The activity sets `RESULT_CANCELED` on create, so on a host that gates the add on this screen, system back drops the widget the user just placed: the confirm control must be affirmative, never an X or a back arrow. From api 31 `configuration_optional` lets the launcher place the widget on its defaults and never show this screen, so there the same result only means the reconfigure left everything as it was.
- Rows update in place after a pick, the dialog is never rebuilt under the user. Both it and the picker are held in fields and dismissed in `onDestroy`, and the pending selection survives a rotation through `onSaveInstanceState`.
- Per widget config in SharedPreferences `ambito_widgets`, keys `rate0_<id>`, `rate1_<id>`, `rate2_<id>` and `value_<id>`, cleaned on delete. The same file also holds `last_payload`, which is the fallback above and is not per widget, so it is never cleaned.
- Picking a rate another slot holds swaps them, so a widget never shows the same rate twice.
- Defaults belong to each widget and mirror the ios ones: rate `oficial`, list `oficial, bna, informal`, spread `informal, bna`.

## Picker copy

- **Voseo everywhere.** App I18n is rioplatense voseo (`Elegí`, `verificá`, `Tenés`). No tuteo (`Elige`, `verifica`, `Tienes`). Applies to iOS Swift strings too.
- **iOS is the base for meaning, not for format.** New Android widget copy derives verb + noun from the iOS `.description(...)`, never invented fresh.
- iOS `.description(...)` (`packages/client/targets/RateWidgets/RateWidgets.swift`): full sentence, trailing period. Apple style.
- Android `description` (`packages/client/modules/widgets/android/src/main/res/values/strings.xml`): imperative, **no trailing period**, 4-8 words. Android picker style, matches system widgets (Battery `See battery info for your devices`, Chrome `Quickly start a search in Chrome`, Clock `Choose cities in the Clock app`).
- Android drops the iOS filler, keeps the verb: iOS `Consultá las cotizaciones a lo largo del día.` becomes Android `Consultá las cotizaciones del día`.
- `label` (Android) and `.configurationDisplayName(...)` (iOS) identical string.
- Config section titles come from the iOS intent parameter titles (the `@Parameter(title:)` of each `WidgetConfigurationIntent` in `packages/client/targets/RateWidgets/_shared/Intents.swift`): Rate `Cotización` + `Mostrar`, list `Cotizaciones` + `Mostrar`, Spread `Cotizaciones`. Singular when the widget takes one rate, plural when it takes several.
- Android description shorter than the current one is always safe, no hard length cap but picker truncates.
