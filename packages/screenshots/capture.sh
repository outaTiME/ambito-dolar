#!/bin/sh
# one device's raw captures into out/raw/<device>/<scene>.png, run by run.sh one device at a time
# with every simulator and emulator shut down, see docs/store-screenshots.md
set -eu

here=$(cd "$(dirname "$0")" && pwd)
cd "$here"
device=$1
bundle=im.outa.AmbitoDolar
out=out/raw/$device
argent() { "$here/../../node_modules/.bin/argent" "$@"; }
# yarn client:build:unattended, run.sh builds it first
build=$here/../client/build/unattended

# the device from config.ts as shell variables, scenes holds one "id flow appearance" line each
# assigned first, a failed node inside eval "$(...)" would pass set -e
config=$(node -e '
  import("./config.ts").then(({ DEVICES, SCENES, WATCH, WATCH_PAGES }) => {
    const key = process.argv[1];
    const d = DEVICES[key] ?? { platform: "watch", name: WATCH, native: { width: 0, height: 0 } };
    console.log(`platform=${d.platform} name="${d.name}"`);
    console.log(`posture=${d.posture ?? ""} orientation=${d.orientation ?? ""}`);
    console.log(`native=${d.native.width}x${d.native.height} pages="${WATCH_PAGES.join(" ")}"`);
    console.log(`scenes="${SCENES.map((s) =>
      [s.id, s.flows?.[key] ?? s.flow, s.appearance ?? "light"].join(" ")).join("\n")}"`);
  })
' "$device")
eval "$config"

# the simulator on the newest runtime, simctl lists the runtimes in ascending order
sim_boot() {
  # the exact name, a search term would also match a longer one like a Pro Max for a Pro
  udid=$(xcrun simctl list devices available | grep -F "    $name (" | grep -oE '[0-9A-F-]{36}' |
    tail -1)
  : "${udid:?no $name simulator}"
  "$@"
  xcrun simctl boot "$udid"
  xcrun simctl bootstatus "$udid" >/dev/null
}

# simctl reports every capture on stderr, only a failure is worth a line
sim_shot() {
  xcrun simctl io "$udid" screenshot "$1" >/dev/null 2>&1 ||
    { echo "$device: simctl took no screenshot" >&2; exit 1; }
}

# a capture equal to the one before and not to the previous screen, no spinner or half turned page
settle() {
  last= tries=0
  while [ "$tries" -lt 60 ]; do
    sim_shot "$1"
    sum=$(cksum <"$1")
    [ "$sum" = "$last" ] && [ "$sum" != "$prev" ] && { prev=$sum; return; }
    last=$sum tries=$((tries + 1))
    sleep 0.5
  done
  echo "$device $(basename "$1") never settled" >&2
  exit 1
}

# flat captures and no flows, compose.ts takes them as they are
# watchOS has no simctl status_bar, watch-clock.c is injected into every simulator process so
# Carousel draws 10:09, argent swipes the pages
watch() {
  sim_boot true
  xcrun --sdk watchsimulator clang -target arm64-apple-watchos10.0-simulator -dynamiclib \
    -framework CoreFoundation -o out/watch-clock.dylib watch-clock.c
  xcrun simctl install "$udid" "$build"/AmbitoDolar.app/Watch/*.app
  # 12 hour time on the face
  xcrun simctl spawn "$udid" defaults write -g AppleICUForce24HourTime -bool false
  xcrun simctl spawn "$udid" launchctl setenv FAKE_HHMM 1009
  xcrun simctl spawn "$udid" launchctl setenv DYLD_INSERT_LIBRARIES "$here/out/watch-clock.dylib"
  # Carousel draws the clock, launchd starts it again with the library
  pkill -f "Carousel.app/Carousel" || true
  sleep 8
  sim_shot "$out/face.png"
  prev=$(cksum <"$out/face.png")
  command rm -f "$out/face.png"
  xcrun simctl launch --terminate-running-process "$udid" "$bundle.watchkitapp" >/dev/null
  first=1
  for page in $pages; do
    [ -n "$first" ] ||
      argent run gesture-swipe --udid "$udid" --fromX 0.9 --fromY 0.5 --toX 0.1 --toY 0.5 >/dev/null
    settle "$out/$page.png"
    first=
  done
  # the injected clock stops mouse input, the shutdown in run.sh drops it
  xcrun simctl spawn "$udid" launchctl unsetenv DYLD_INSERT_LIBRARIES
  xcrun simctl spawn "$udid" launchctl unsetenv FAKE_HHMM
  command rm -f out/watch-clock.dylib
}

# the app in Argentine Spanish, written while the simulator is shut down
pin_locale() {
  prefs=~/Library/Developer/CoreSimulator/Devices/$udid/data/Library/Preferences
  mkdir -p "$prefs"
  [ -f "$prefs/.GlobalPreferences.plist" ] || plutil -create xml1 "$prefs/.GlobalPreferences.plist"
  plutil -replace AppleLocale -string es_AR "$prefs/.GlobalPreferences.plist"
  plutil -replace AppleLanguages -json '["es-AR"]' "$prefs/.GlobalPreferences.plist"
}

command rm -rf "$out"
mkdir -p "$out"
if [ "$platform" = watch ]; then
  watch
  exit
fi

if [ "$platform" = ios ]; then
  sim_boot pin_locale
  # over the installed app, a reinstall would drop the widgets placed by hand
  xcrun simctl install "$udid" "$build/AmbitoDolar.app"
  appearance() { xcrun simctl ui "$udid" appearance "$1"; }
  # "charged" draws the charging bolt, a cellular data type a faint label next to the wifi glyph
  status_bar() {
    xcrun simctl status_bar "$udid" override --time 9:41 --batteryState discharging \
      --batteryLevel 100 --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 \
      --dataNetwork wifi
  }
  screenshot() {
    if [ -z "$posture" ]; then
      sim_shot "$1"
      return
    fi
    # a folded foldable has two displays, simctl hands the cover one over unturned, argent upright
    shot=$(argent run screenshot --udid "$udid" --scale 1 --includeImageInContext false |
      sed -n 's/^Saved screenshot: //p')
    [ -n "$shot" ] || { echo "$device: argent took no screenshot" >&2; exit 1; }
    mv "$shot" "$1"
  }
  # the app the flow left in front stays there
  in_front() { :; }
else
  # the AVD by its hardware profile
  ini=$(grep -lx "hw.device.name=$name" ~/.android/avd/*.avd/config.ini 2>/dev/null | sed -n 1p)
  : "${ini:?no AVD with the $name profile}"
  emulator -avd "$(basename "$(dirname "$ini")" .avd)" -no-boot-anim -no-audio >/dev/null 2>&1 &
  pid=$!
  tries=0
  until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do
    kill -0 "$pid" 2>/dev/null && [ "$tries" -lt 150 ] ||
      { echo "$device: the emulator never booted" >&2; exit 1; }
    sleep 2
    tries=$((tries + 1))
  done
  udid=$(adb devices | awk '/^emulator-/ { print $1; exit }')
  # a cold emulator can raise "Process system isn't responding" over the app, SystemUI paints
  # its rounded corners into every capture and the bezel art draws its own
  adb -s "$udid" shell \
    "settings put global hide_error_dialogs 1; settings put secure sysui_rounded_size 0"
  adb -s "$udid" shell am force-stop "$bundle" 2>/dev/null || true
  adb -s "$udid" install -r "$build/app-release.apk" >/dev/null
  # the per app language, the emulator itself stays in en-US
  adb -s "$udid" shell cmd locale set-app-locales "$bundle" --locales es-AR
  appearance() {
    adb -s "$udid" shell cmd uimode night "$([ "$1" = dark ] && echo yes || echo no)" >/dev/null
  }
  # SystemUI demo mode at 12:30, the flow runner turns it off after each run
  status_bar() {
    adb -s "$udid" shell settings put global sysui_demo_allowed 1
    for args in "enter" "clock -e hhmm 1230" "battery -e level 100 -e plugged false" \
      "network -e wifi show -e level 4 -e fully true" "network -e mobile hide" \
      "notifications -e visible false"; do
      # shellcheck disable=SC2086
      adb -s "$udid" shell am broadcast -a com.android.systemui.demo -e command $args >/dev/null
    done
  }
  # argent's emulator screenshot paints the skin's rounded corners in, screencap has none
  screenshot() { adb -s "$udid" exec-out screencap -p >"$1"; }
  in_front() { adb -s "$udid" shell dumpsys window | grep -q "mCurrentFocus=.*$bundle/"; }
fi

# a tool server from before the boot never reaches the new devtools endpoint (argent #561), and
# its first start after a boot can outlast the client's own wait (argent #1431)
# a free port, a stale server may still hold the default one, and the idle exit of an autospawn
argent server start --detach --force --port 0 --idle-timeout 30 >/dev/null 2>&1 || true
tries=0
# status exits 0 with no server too, only the json says whether it answers
until argent server status --json 2>/dev/null | grep -q '"running": true'; do
  [ "$tries" -lt 60 ] || { echo "$device: argent's tool server never came up" >&2; exit 1; }
  sleep 1
  tries=$((tries + 1))
done
# the first launch pays the cold bundle and lands any new rates, outside any flow
argent run launch-app --udid "$udid" --bundleId "$bundle" >/dev/null 2>&1 || true
argent run await-screen-idle --udid "$udid" --timeoutMs 60000 >/dev/null 2>&1 || true
[ -z "$posture" ] || argent run fold --udid "$udid" --posture "$posture" >/dev/null
[ -z "$orientation" ] || argent run rotate --udid "$udid" --orientation "$orientation" >/dev/null

shoot() {
  # a launch can still race the devtools handshake, the runner's own fix is a second run
  argent e2e run "flows/$flow.yaml" --device "$udid" >/dev/null ||
    { sleep 5 && argent e2e run "flows/$flow.yaml" --device "$udid"; }
  # the flow runner pins and restores the bar around a run, so it is pinned per capture
  status_bar
  sleep 0.4
  screenshot "$out/$id.png"
}

# on fd 3, adb and argent read stdin and would eat the scene list
before=
while read -r id flow look <&3; do
  appearance "$look"
  shoot
  # a flow once passed with the launcher in the capture, the widgets flow ends there on purpose
  if [ "$flow" != widgets-android ] && ! in_front; then
    echo "$device $id: the app left the screen, once more"
    # the cause was never seen, the log keeps what the emulator said
    adb -s "$udid" logcat -d -b all -t 300
    shoot
    in_front || { echo "$device $id: the app left the screen again" >&2; exit 1; }
  fi
  size=$(sips -g pixelWidth -g pixelHeight "$out/$id.png" |
    awk '/pixel(Width|Height)/ { printf "%s%s", s, $2; s = "x" }')
  [ "$size" = "$native" ] || { echo "$device $id is $size, not $native" >&2; exit 1; }
  # every scene differs from the one before, the same capture twice is a screen that never moved
  sum=$(cksum <"$out/$id.png")
  [ "$sum" != "$before" ] || { echo "$device $id is the same capture as the scene before" >&2; exit 1; }
  before=$sum
  echo "$device $id"
done 3<<EOF
$scenes
EOF
