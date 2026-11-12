#!/bin/sh
# yarn client:e2e, every flow of .argent/e2e on an iPhone simulator and then on an android emulator,
# booting whichever is off, over the unattended build
set -eu

# the simulator by its default name, the AVD by its hardware profile so a renamed one still counts
iphone="iPhone 18 Pro Max"
profile=pixel_9_pro

client=$(cd "$(dirname "$0")/.." && pwd)
out=$client/build/unattended
argent() { "$client/../../node_modules/.bin/argent" "$@"; }
# status exits 0 with no server too, only the json says whether it answers
running() { argent server status --json 2>/dev/null | grep -q '"running": true'; }
# a tool server from before a boot never reaches the new devtools endpoint (argent #561), and the
# first launch pays the cold start and the devtools handshake, both outside the flows like capture.sh
ready() {
  if [ "$2" = booted ] || ! running; then
    # a free port, a stale server may still hold the default one, and the idle exit of an autospawn
    argent server start --detach --force --port 0 --idle-timeout 30 >/dev/null 2>&1 || true
  fi
  tries=0
  until running; do
    [ "$tries" -lt 60 ] || { echo "argent's tool server never came up" >&2; exit 1; }
    sleep 1
    tries=$((tries + 1))
  done
  argent run launch-app --udid "$1" --bundleId im.outa.AmbitoDolar >/dev/null 2>&1 || true
  argent run await-screen-idle --udid "$1" --timeoutMs 60000 >/dev/null 2>&1 || true
}
# one flow at a time, a launch can still race the devtools handshake on a loaded host and gets one
# more try like capture.sh does, a real failure fails twice
flows() {
  failed=0
  for flow in .argent/e2e/*.yaml; do
    argent e2e run "$flow" --device "$1" || { sleep 5 && argent e2e run "$flow" --device "$1"; } ||
      failed=1
  done
  return "$failed"
}
cd "$client"
# a missing tool fails here and not after the builds
for c in xcrun pod adb emulator; do
  command -v "$c" >/dev/null || { echo "missing $c on the PATH" >&2; exit 1; }
done
# macOS ships a java stub, java_home answers only with a JDK installed
/usr/libexec/java_home >/dev/null 2>&1 || { echo "missing a JDK" >&2; exit 1; }
: "${ANDROID_HOME:?missing ANDROID_HOME}"
# the devices before the builds, a missing one fails in seconds
sim=$(xcrun simctl list devices available | grep -F "    $iphone (" | grep -oE '[0-9A-F-]{36}' | tail -1)
: "${sim:?no $iphone simulator}"
avds=~/.android/avd
ini=$(grep -lx "hw.device.name=$profile" "$avds"/*.avd/config.ini 2>/dev/null | sed -n 1p)
: "${ini:?no AVD with the $profile profile}"
avd=$(basename "$(dirname "$ini")" .avd)

"$client/scripts/unattended-build.sh"

# the flows read Argentine Spanish, a simulator booted in another language goes down to get it
if ! xcrun simctl list devices | grep -F "($sim) (Shutdown)" >/dev/null && {
  [ "$(xcrun simctl spawn "$sim" defaults read -g AppleLocale 2>/dev/null)" != es_AR ] ||
    ! xcrun simctl spawn "$sim" defaults read -g AppleLanguages 2>/dev/null | sed -n 2p | grep -q 'es-AR'
}; then
  xcrun simctl shutdown "$sim"
fi
booted=
if xcrun simctl list devices | grep -F "($sim) (Shutdown)" >/dev/null; then
  booted=booted
  # written while the simulator is shut down
  prefs=~/Library/Developer/CoreSimulator/Devices/$sim/data/Library/Preferences
  mkdir -p "$prefs"
  [ -f "$prefs/.GlobalPreferences.plist" ] || plutil -create xml1 "$prefs/.GlobalPreferences.plist"
  plutil -replace AppleLocale -string es_AR "$prefs/.GlobalPreferences.plist"
  plutil -replace AppleLanguages -json '["es-AR"]' "$prefs/.GlobalPreferences.plist"
  xcrun simctl boot "$sim"
fi
xcrun simctl bootstatus "$sim" >/dev/null
xcrun simctl install "$sim" "$out/AmbitoDolar.app"
ready "$sim" "$booted"
# one device after the other, a tool server restart for the emulator would drop the simulator's session
# both devices run even when the first fails, the exit status says whether either did
status=0
flows "$sim" || status=1

# a running emulator counts only when it is that AVD, another one would run the flows on its screen
emu=
for serial in $(adb devices | awk '/^emulator-.*device$/ { print $1 }'); do
  if [ "$(adb -s "$serial" emu avd name 2>/dev/null | sed -n 1p | tr -d '\r')" = "$avd" ]; then
    emu=$serial
  fi
done
booted=
if [ -z "$emu" ]; then
  booted=booted
  before=$(adb devices | awk '/^emulator-/ { print $1 }')
  emulator -avd "$avd" -no-boot-anim -no-audio >/dev/null 2>&1 &
  pid=$!
  tries=0
  # the new serial, another emulator also answers adb
  until emu=$(adb devices | awk '/^emulator-/ { print $1 }' | grep -vxF "$before" | sed -n 1p) &&
    [ -n "$emu" ] && [ "$(adb -s "$emu" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do
    kill -0 "$pid" 2>/dev/null && [ "$tries" -lt 150 ] ||
      { echo "the $avd emulator never booted" >&2; exit 1; }
    sleep 2
    tries=$((tries + 1))
  done
  # a cold emulator can raise "Process system isn't responding" over the app
  adb -s "$emu" shell settings put global hide_error_dialogs 1
fi
adb -s "$emu" install -r "$out/app-release.apk" >/dev/null
# the per app language, the emulator itself stays in en-US
adb -s "$emu" shell cmd locale set-app-locales im.outa.AmbitoDolar --locales es-AR
ready "$emu" "$booted"

flows "$emu" || status=1
exit "$status"
