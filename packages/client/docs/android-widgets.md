# Android widgets

Read this before touching anything under `packages/client/modules/widgets/`, the ios
`RateWidgets` target, or the widget previews. `AGENTS.md` carries the pointer and the trap
lines, this file carries everything else.

## The module

Native, in the local expo module `packages/client/modules/widgets/`. RemoteViews and XML layouts, no react-native and no Compose. Android stays CNG: `packages/client/android/` is generated, only the module is checked in, and autolinking merges its manifest and its `res/` into the app, so no config plugin is needed.

- **Three providers over one base.** `WidgetProvider` holds the machinery: `goAsync`, the executor, the fetch, the empty state, the deep link, the android 15 preview, the cleanup on delete. `RateWidget`, `ListWidget` and `SpreadWidget` only declare their defaults, label, empty text, layout and how they fill the slots. A fourth widget is one file that size.
- **Two layouts, not three.** `widget_card.xml` is the six slots every ios systemSmall card lays out, title / detail / gap / small / big / date, and serves the rate and the spread: what changes is which value lands on which slot and which one carries the change color. `widget_list.xml` is the three rate one. `Content.Card` and `Content.Rows` pick between them.
- **The card is square** through an ImageView with `adjustViewBounds` over a 1:1 shape drawable. Never `match_parent` on the card. Sizing the card from what the launcher reports is unreliable, measured on two phones: a Moto Edge 30 Ultra cropped 16dp and a Galaxy S9 scaled to 78%.
- **One role, one size, in `Sizes.kt`.** The ios point sizes times `1.05`, measured as glyph height over card width, which is independent of screen and density: android then lands inside the spread ios already has between an iPhone Air and a 15 Pro Max. In dp and not sp, so the system font scale cannot move them, which is what `sizeCategory large` does on ios. A new widget picks roles from there and adds none, or the same date drifts to two sizes as it once did, 12.1 on the card against 12.7 on the list.
- **One role, one color.** `widget_foreground` for names, titles and values, `widget_secondary` for subtitles and dates, the change color only on the percentage. The roles live in `views()`; each widget declares only which slot carries the change color, because ios colors the small one on the rate and the big one on the spread. They are `fgColor`, `fgSecondaryColor` and `changeColor` on the ios side, and the date is `#8E8E93` on all three widgets. A date that looks lighter on one is antialiasing or the launcher scaling it down, never a different color.
- **The box is the one a TextView reserves by default**, top to bottom of the font and not just ascent to descent, which `setIncludePad` keeps. The list lines used to turn that padding off because Roboto reserved room ios does not, and once the text is drawn with FiraGO the two boxes are within two pixels, so there is no exception left to carry.
- **Gated to api 26** with `android:enabled="@bool/widget_supported"` plus a `values-v26` override, because `Resources.getFont` is api 26 and the text is drawn with it. Below that the launcher never lists the widgets.
- **`android:fontFamily` does NOT work here.** The launcher builds the views in its own process and resolves only system typefaces, so the font falls back with no error and no log line. Measured on four devices: holds on One UI, fails on pixel, motorola and the emulator. Not a format problem, a `.ttf` fails the same.
- **The text is drawn here and travels as a bitmap.** `TextBitmap.of()` is the one routine every slot goes through, so a fourth widget writes no render code. Only the glyphs are pixels, the card and the layout stay real views, which is why none of this needs the size the launcher reports badly. Around 325 KB per list redraw against a 1 MB binder ceiling; `ALPHA_8` plus a tint would cut it to a quarter if it ever gets close.
- The font file is not duplicated, a Copy task in the module `build.gradle` brings it from `packages/client/assets/fonts/` at build time, the same way the ios pbxproj references it once for two targets. It is referenced from exactly one place now, `TextBitmap`, and `Resources.getFont` is api 26, so the gate still holds.
- **A restore does hand out new ids**, so `onRestored` moves the config keys across and is not dead code. `allowBackup` is false in `packages/client/app.config.ts`, which used to settle it, but from android 12 that flag no longer covers a device to device transfer: that one is `dataExtractionRules`, there is none, so the default applies and the widgets come across with new ids.
- **Redraw triggers**: `APPWIDGET_UPDATE`, `MY_PACKAGE_REPLACED`, `LOCALE_CHANGED` and `TIMEZONE_CHANGED`, all through `goAsync` and all hitting `/fetch`, plus `reloadWidgets()` from `AppContainer` and the config save. The locale and zone ones matter because separators and time are read at render, so without them a change leaves the widget wrong for half an hour.
- **The retry belongs to WorkManager, not to us.** A redraw landing as the device wakes can find dns with no answer yet and fail in milliseconds, which is the bug the widgets shipped with. `doWork` returns `Result.retry()` once when the service could not be reached: it backs off on its own, waits for the network constraint again and survives the process dying. A bounded loop of ours came first, written before the worker existed, and it slept inside the ten seconds the receiver had and died with the process. The other four triggers fire with the device awake and fall back to the payload on disk, so they draw stale rates, never a blank card. Bounded at one because the period is the real schedule and retrying a dead service every backoff step is requests nobody reads.
- **The periodic redraw is a WorkManager `PeriodicWorkRequest`**, 30 min with 10 min flex behind a network constraint, which is what google points a widget that needs the network at. `updatePeriodMillis` is 0: it is an alarm, it fires with no network, and those redraws died in milliseconds on a doze wake. A `JobScheduler` of ours came first and hand rolled unique work, the reboot, the constraint, cancelling and a version stamp; three review bugs were in exactly those, so the library owns them now.
- `adb shell am broadcast APPWIDGET_UPDATE` is protected and does NOT force a redraw, call `provider.refresh(context)`.
- **An app update re-inflates every widget from `initialLayout`**, which is why `MY_PACKAGE_REPLACED` is handled: without it they sit there up to half an hour. Measured at 2 to 6 seconds. That initial state is the bare card and not the unavailable text, because in those seconds the rates are loading, not missing.
- **The endpoint is not hardcoded.** The module `build.gradle` emits `widget_api_url` from the same `API_URL` the app reads, falling back to production, so a host change does not leave the widgets talking to the old one. A plain gradle build with no environment gets the fallback.
- **One `/fetch` for a burst.** `RatesApi` holds the payload 60s and a failure 10: enough to absorb three providers behind a dead service, not enough to sit on the failure once the network is back. ios has the same 60s in `getRates()`, on disk and not in memory because each reload there can be a separate extension invocation while the three android providers share the app process. One attempt, `connectTimeout` and `readTimeout` at 4s each so it is bounded at 8 against the 10 a receiver gets, and ios gets the same 4 plus a wait bounded one second past it so a stalled connection cannot hold the extension. It collapses the timeline, snapshot and placeholder of three widgets into one request, and the preview still shows real rates because what it serves is the payload.
- **Neither side stores what it cannot use.** Android requires the parse to yield at least one known rate before replacing the persisted payload, and ios requires a 2xx plus at least one known rate, because an error body is valid json too and taking it would blank the widgets and leave that body as the fallback for the next failure.
- **A failed fetch leaves the widget as it was**: `render` returns early on null and never calls `updateAppWidget`, so the launcher keeps the last views it got. ios does the same through a `UserDefaults` fallback in `getRates()`.
- **Nothing is cached across a locale change.** The `DecimalFormat` is built per call and not held in a lazy, which would freeze the separators of whatever locale was set the first time a widget drew.
- **A `/fetch` schema change goes to ios first**, see the sync section below. The timestamp is the one already guarded there, because `ISO8601DateFormatter` with its default options rejects fractional seconds and the backend growing milliseconds is one deploy away.
- **Unknown rate types are dropped at parse time.** The service still sends `qatar` and `ahorro`, retired and commented out in `Helper.swift`, and without the filter the widget titles a rate with its raw id. `Format.isKnown` is the same check as the ios `Helper.getRateTypes().contains`.
- **Retired rate types**: survivors keep their order and compact to the top, the blank slots pad the bottom, same as the ios `compactMap`. The spread needs both sides or it goes empty, the list only goes empty when none of the three survives.
- **Widget order in the picker follows the labels, not the declaration.** The launcher sorts alphabetically. Measured twice: two declaration orders gave the same picker, and renaming the labels to `Zzz`/`Aaa`/`Mmm` reordered it. Labels have to match `.configurationDisplayName(...)`, so the order is not ours to pick.
- **`previewImage`**: regenerate from a live device with `node scripts/widget-preview.js assets/widgets/android-rate-2x2.png [--device serial]` from `packages/client`, ImageOptim after, `expo prebuild` last. The module `build.gradle` copies the three pngs into `drawable-nodpi`. From android 15 `setWidgetPreview` replaces them at runtime with the real rates, capped at two calls per hour per provider.
- Android cannot re-render a widget on a system theme change, so they are forced dark like ios.
- **Logs**: `adb logcat -s AmbitoWidgets` prints nothing on One UI even with the lines in the
  buffer, measured on a galaxy s9: 0 against 324 for the same log. Use `adb logcat AmbitoWidgets:I
*:S`, which is the timeline. One line per redraw with its trigger and how many widgets it drew, one per call to the service with its duration. A cache hit logs nothing, it is the hottest path and there are nine per redraw.

### Both platforms or neither

The widgets are written twice, once in Swift and once in Kotlin, so these move together. Touching
one side alone is the bug that gets shipped.

- **A rate added or retired**: `packages/client/ios/RateWidgets/Utils/Helper.swift` `getRateTypes()` and
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
  `res/xml/widget_x_info.xml` in the module, label and description in `strings.xml`, the preview png in
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

## Picker copy

- **Voseo everywhere.** App I18n is rioplatense voseo (`Elegí`, `verificá`, `Tenés`). No tuteo (`Elige`, `verifica`, `Tienes`). Applies to iOS Swift strings too.
- **iOS is the base for meaning, not for format.** New Android widget copy derives verb + noun from the iOS `.description(...)`, never invented fresh.
- iOS `.description(...)` (`packages/client/ios/RateWidgets/RateWidgets.swift`): full sentence, trailing period. Apple style.
- Android `description` (`packages/client/modules/widgets/android/src/main/res/values/strings.xml`): imperative, **no trailing period**, 4-8 words. Android picker style, matches system widgets (Battery `See battery info for your devices`, Chrome `Quickly start a search in Chrome`, Clock `Choose cities in the Clock app`).
- Android drops the iOS filler, keeps the verb: iOS `Consultá las cotizaciones a lo largo del día.` → Android `Consultá las cotizaciones del día`.
- `label` (Android) and `.configurationDisplayName(...)` (iOS) identical string.
- Config section titles come from the iOS intent parameter display names (`packages/client/ios/RateWidgets/Base.lproj/RateWidgets.intentdefinition`, read with `plutil -convert xml1`): Rate `Cotización` + `Mostrar`, list `Cotizaciones` + `Mostrar`, Spread `Cotizaciones`. Singular when the widget takes one rate, plural when it takes several.
- Android description shorter than the current one is always safe, no hard length cap but picker truncates.
