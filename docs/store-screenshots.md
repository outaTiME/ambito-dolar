# Store screenshots

Applies when regenerating the App Store and Google Play screenshots, the Play feature graphic, the
Apple Watch set, the website phone or the social header. All of it comes from
`packages/screenshots/`, the listing copy is in `packages/client/docs/store-listing.md`.

## Files

- `config.ts`: devices, frames, theme and scenes (headline, layout, flow, placement per device).
  The device keys are the output folders and store slots.
- `packages/screenshots/flows/`: one argent e2e test per screen, a scene names it in `flow`, `flows` overrides it per
  device. They reach each screen through the tab and row names, a rename in the app breaks them.
  The iPad tab bar exposes no name, so `markets-ipad`, `conversion-ipad` and `notifications-ipad`
  tap its icons by position, in portrait axes while the iPad lies landscape, and a change in the
  number or size of the tabs moves them. A deep link from outside the app raises "¿Abrir en Ámbito
  Dólar?", which a flow cannot tap.
- `capture.sh <device>`: one device's raw captures into `packages/screenshots/out/raw/<device>/`.
  Boots it, pins the locale, appearance and status bar, installs over the app, runs each flow with
  `argent e2e run` and captures with `simctl io screenshot`, argent's `screenshot` on the folded Duo
  (simctl hands its cover display over unturned) or `adb screencap`, checking every capture against
  `native`. The flow runner restores the status bar after every run (Android: demo mode off), so it
  is pinned per capture. A failed flow runs once more. An Android capture where the app left the
  screen (`dumpsys window` focus) is shot again once with the emulator's logcat in the log, the
  widgets scene excluded since it ends on the launcher. A capture equal to the scene before fails,
  a screen that never moved. The watch has no flows, see Layout.
- `compose.ts`: the raw captures into the store tiles, the marble, the headline and the capture
  in its bezel, and the watch pages as they are. Three layouts, `classic`, `tilt` and `copy-below`,
  the math from goldie 0.5 (MIT, Copyright (c) 2026 Kacper Kapuściak). It writes RGB PNGs itself,
  App Store and the Play feature graphic reject an alpha channel and canvas only encodes RGBA.
- `background.ts`: renders `background.svg` per device as one strip of `scenes x tile width`, scene
  `i` shows it at `-i` tile widths, so the marble runs on from one screenshot into the next. Also
  the Play feature graphic background and `packages/screenshots/release/social-header.png`
  (1500x500).
- `feature-graphic.ts`: the Play phone rates, markets and conversion on the marble, 1024x500.
- `website-phone.ts`: the iPhone rates and dark captures in the black bezel, 1470x3000, into
  `packages/website/src/assets/images/phone.png` and `phone-dark.png`, for
  `packages/website/src/components/Phone.astro` and the root `README.md`.
- `packages/screenshots/frames/`: the bezel PNGs and their licenses, `measure-frame.ts` measures a new one.
- `run.sh`: everything. A check of the simulators, AVDs, flows, tools, font and client env, then the
  Release builds into `packages/screenshots/out/build/`: the client's prebuild and `expo run:ios`
  for the simulator, and Gradle for the APK with the env files loaded the way Expo loads them,
  `expo run:android` always installs on a device. The builds go without the Sentry DSN and the
  Amplitude key, every capture launch would reach the real projects, and unattended
  (`UNATTENDED=true`, see `packages/client/AGENTS.md` E2E). Then `background.ts`, the captures,
  `compose.ts`, the split into `packages/screenshots/release/app-store/` and
  `packages/screenshots/release/google-play/`, the extras, then `oxipng` when installed. What gets
  uploaded into `packages/screenshots/release/`, committed, the rest into
  `packages/screenshots/out/`, ignored, `packages/screenshots/out/build/` kept for the next run.
- `tsconfig.json`: for the editor and `tsc`, Node runs the `.ts` files without it.
- `ipad-widgets.ts`: the iPad widget layout, see Widgets scene.

## Setup, once per machine

- Installed: Xcode 27 with the iOS 27.2 and watchOS 27 runtimes, CocoaPods, the Android SDK in
  `ANDROID_HOME` with `adb` and `emulator` on the `PATH`, a JDK for Gradle, the Node of the root
  `engines`. `yarn install` brings argent and `@napi-rs/canvas`. Optional, `oxipng`
  (`brew install oxipng`): about a sixth less weight, lossless, a run without it uploads the same
  pixels.
- `packages/client/.env` with `RATES_URI`, `HISTORICAL_RATES_URI` and `API_URL` of the deployed
  backend, `API_URL` the CloudFront alias, the builds read them and the run checks them first.
- One simulator per name, the run takes the last one `simctl` lists, the newest runtime, and the
  widgets have to be on that one: `iPhone 18 Pro Max`, `iPhone Duo`, `iPad Pro 11-inch (M5)`,
  `Apple Watch Ultra 4 (49mm)`.
- One AVD per profile, the run picks it by `hw.device.name` and not by name: `Play_Phone`
  (`pixel_9_pro`) and `Play_Tablet` (`pixel_tablet` with `hw.lcd.width=2560`,
  `hw.lcd.height=1600`, `hw.initialOrientation=landscape`, a rotated emulator hands argent
  sideways screenshots). Both with `fastboot.forceColdBoot=yes`, a quick boot from the snapshot a
  run leaves hangs the system.
- Play wallpaper, kept by the AVD: Wallpaper & style, More wallpapers, Geometric shapes,
  Tessellation 9, home and lock. The black widgets disappear on the stock dark one, and there is no
  shell command for it.
- Widgets, see below. A new device needs the app before them: a first `yarn screenshots` installs
  it, then the widgets by hand and a second run. Runs install over the app, a reinstall would drop
  them.

## Regenerating

From the repo root, the morning after the 18:00 close and done before 9:41 and the market open, so
every device shows the same values and the rows read yesterday next to the 9:41 status bar:

```sh
yarn screenshots
```

- The Release builds, about 12 minutes, run when `packages/screenshots/out/build/` is missing or
  `packages/client`, `packages/core` or `yarn.lock` changed after it, otherwise the run reuses
  them. `--build` forces them after an Xcode bump or a deleted source file, the newer check sees
  neither.
- The captures take about 12 minutes. `run.sh` prints a start and an end line per step, the end one
  with its time, on a terminal a spinner in place of the start line, and the output folder at the
  end. Every command's output goes to `packages/screenshots/out/run.log`, `--verbose` shows it live
  too, a failed step prints the log's last lines. Everything shut down, argent not driven by hand
  while it runs. Not in parallel: an iOS boot restarts argent's tool server and drops a capture on
  another device. Every run takes every device in `config.ts` plus the watch, a device that fails
  gets a second try.
- `yarn screenshots pixel-10-pro` captures only the devices named, the rest compose from their last
  raw captures. Its rates are from another moment than theirs, capture it close to the full run.
- Upload `packages/screenshots/release/app-store/<device>/es-AR/` and
  `packages/screenshots/release/google-play/<device>/es-AR/`, plus
  `packages/screenshots/release/google-play/feature-graphic.png`. Commit the website phone and
  deploy the website. `packages/screenshots/release/social-header.png` goes to the social network
  profiles.
- Commit `packages/screenshots/release/` only with the run that goes to the stores, a record of what
  they show. A test run rewrites it too, every run moves the rates and adds about 15 MB to the
  history, so `git checkout packages/screenshots/release` drops it.
- A copy or layout change only: `node compose.ts` from `packages/screenshots/` recomposes the last
  raw captures in about 4 seconds, then the store split and the extras of `run.sh` by hand.

The android widget gallery previews are separate, only when a widget changes, see
`packages/client/docs/android-widgets.md`. iOS draws its gallery live.

## Widgets scene

- Placed by hand on a home page of their own, all small, newest first, left to right and down:
  indicators list, indicator (Inflación), spread (Blue to BNA), rates list (Oficial, BNA, Blue),
  rate (Oficial, venta).
- Five on iPhone and Duo, two per row, the last alone on the left; Play tablet three above and two
  below between them. Four, without the indicator, two by two on the Play phone (its 4x5 grid
  fits four 2x2) and the iPad (6 slots per landscape row, only an even count centers).
- Pages: iPhone, Duo and iPad their only one, the rest hidden (Edit Pages); Play phone and tablet
  the second. The flows press home twice, the Android one then swipes with `tool: gesture-swipe`,
  a `swipe:` step waits out its timeout reading the app in the background. Nothing checks the home
  screen: a page without widgets, or a swipe lost right after a cold boot, captures without error.
- The iPad simulator does not drag widgets: after placing the four,
  `node packages/screenshots/ipad-widgets.ts <udid>` from the root, the udid of the
  `iPad Pro 11-inch (M5)` in `xcrun simctl list devices`, rewrites `IconState.plist` with them 2 by
  2 and reboots it. The scene zooms the iPad 2.2x.

## Layout

- The look: the same space above, between and below headline and device, measured on
  the ink, headline alternating top and bottom, phones tilted 15 degrees on the rates and dark
  scenes, the second mirrored, tablets upright. Headlines without a final period, broken on the
  same words on every portrait device.
- Tilted scenes and the zoomed iPad bleed off an edge; on the tilted ones the headline centres
  against the rounded corners. The upright Android devices take the `classic` layout size
  (`ANDROID_SIZE`).
- Captures keep the device's own size and density, the store slot is a cover crop and the frame
  cutouts match its aspect. `sysui_rounded_size 0` on Android, or SystemUI paints its corners into
  every capture.
- Clock 9:41 on iOS, 12:30 on Android, 10:09 on the watch.
- iPad set: the 11" iPad Pro landscape on the 13" upload size, the 640 pt content column reads small
  on the 13" screen. Duo: folded only.
- Apple Watch: three flat pages (an older watchOS centres the page title and cuts it), no home
  screen (the watchOS 27 grid keeps a system app in the middle). watchOS has no `simctl status_bar`:
  `capture.sh` injects `watch-clock.c` into the simulator's processes, Carousel draws the clock, and
  sets 12 hour time. The injection stops mouse input in the simulator window, the shutdown at the
  end drops it.

| Folder             | Size (px)   | Store slot             |
| ------------------ | ----------- | ---------------------- |
| `iphone-6.9`       | 1320 × 2868 | App Store iPhone       |
| `iphone-duo-outer` | 1398 × 2034 | App Store Duo, folded  |
| `ipad-11`          | 2752 × 2064 | App Store iPad 13"     |
| `pixel-10-pro`     | 1080 × 1920 | Play phone             |
| `pixel-tablet`     | 2560 × 1440 | Play tablet 7" and 10" |
| `apple-watch`      | 422 × 514   | App Store Watch Ultra  |

## Upgrading

`capture.sh` checks the capture sizes, not what they show. After any upgrade open every set and
check the clock, the widgets, the wallpaper and the bezel fit.

- New OS: install the runtime and create the simulators on it. Delete the older ones, install and
  open the app once, place the widgets again and rerun `ipad-widgets.ts`, they do not move with the
  device. A device can come on a runtime build of its own (`iOS-27-2-iPhone19-4`).
- New iPhone, iPad or Duo: its `DEVICES` entry in `config.ts` (`name`, `native`, `screenshot`,
  `posture`, `orientation`) and its bezel in `packages/screenshots/frames/`, the geometry from
  `node measure-frame.ts <png>` from `packages/screenshots/`; an Apple cutout's radius goes a little
  under the measured one, a larger one shows the background between the screen and the bezel. Keep
  the device key, it is the folder, the store slot and what the extras read; update the setup list
  and the table here. A new iPad also retunes the tab taps of the `-ipad` flows and `SLOTS` in
  `ipad-widgets.ts`, a wrong one lands on another tab or off center without an error.
- New Android: the profiles in its `DEVICES` `name`, all with the `native` screen, or `native` and
  `ANDROID_SIZE` retuned. A new system image wipes the wallpaper and the widgets; check the corners
  are square and the clock reads 12:30.
- New watch or watchOS: `WATCH` and `WATCH_PAGES` in `config.ts`. Nothing checks the 10:09 or the
  size, look at them, and recheck the title and the page count.
- New scene: an entry in `SCENES` (`id`, `flow`, `flows` per device, `appearance`, `layout`,
  `device` and `placements`, `headline`) and its flow. Store order is array order, the marble
  follows `SCENES.length`. `feature-graphic.ts` reads the `rates`, `markets` and `conversion`
  captures, `website-phone.ts` `rates` and `dark`. Play takes 8 screenshots.
- argent bump: `@swmansion/argent` in the package; the flows use `tool:` and `await` steps,
  `capture.sh` calls `e2e run`, `server start` and `status`, `run launch-app`, `await-screen-idle`,
  `fold`, `rotate`, `screenshot` and `gesture-swipe`, `run.sh` `server stop`, check them all.
- `@napi-rs/canvas` bump: a new skia moves the antialiasing of every edge. Recompose the last raw
  captures before and after and look at both sets.
- Expo or Xcode bump: `build_ios`, `build_android` and the check lean on
  `expo run:ios --device generic --no-bundler --output`, `@expo/env` `loadProjectEnv` and
  `parseProjectEnv` and the APK path. Run it, `--build` after an Xcode bump, and check a widget
  capture shows values, not "no disponible".
