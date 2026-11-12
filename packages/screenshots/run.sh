#!/bin/sh
# the store screenshots into release/app-store and release/google-play
# see docs/store-screenshots.md
# run as yarn screenshots [--build] [--verbose] [device...], over the client's unattended builds,
# yarn client:build:unattended, which build only on a change, --build forces them
# devices named capture alone, the rest compose from their last raw captures
set -eu

rebuild= verbose= only=
for arg; do
  case $arg in
    --build) rebuild=1 ;;
    -v | --verbose) verbose=1 ;;
    -*) echo "usage: yarn screenshots [--build] [--verbose] [device...]" >&2 && exit 2 ;;
    *) only="$only $arg" ;;
  esac
done
# a step's status is the command's, not tee's
[ -z "$verbose" ] || set -o pipefail

here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)
cd "$here"
mkdir -p out
log=$here/out/run.log
: >"$log"

# colors only on a terminal, NO_COLOR turns them off
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  esc=$(printf '\033')
  dim="$esc[2m" green="$esc[32m" yellow="$esc[33m" red="$esc[31m" cyan="$esc[36m" reset="$esc[0m"
else
  dim= green= yellow= red= cyan= reset=
fi
# fd 4 is the terminal, a step's own output goes to the log
exec 4>&1
began=$(date +%s)
current=
took() {
  s=$(($(date +%s) - $1))
  if [ "$s" -ge 60 ]; then printf '%dm%02ds' $((s / 60)) $((s % 60)); else printf '%ds' "$s"; fi
}
# a terminal without --verbose gets a spinner, the rest a start line
spin= spinner=
[ ! -t 1 ] || [ -n "$verbose" ] || spin=1
# the line clear first when a spinner may be on it
warn() {
  [ -z "$spin" ] || printf '\r\033[K' >&4
  printf '%s! %s%s\n' "$yellow" "$*" "$reset" >&4
}
spinner_loop() {
  # a run killed without its traps takes the spinner along
  while kill -0 $$ 2>/dev/null; do
    for frame in ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏; do
      printf '\r%s%s%s %s\033[K' "$cyan" "$frame" "$reset" "$current" >&4
      sleep 0.1
    done
  done
}
unspin() {
  [ -n "$spinner" ] || return 0
  # a kill right after the fork can still run the inherited finish trap, -9 runs none
  kill -9 "$spinner" 2>/dev/null || true
  wait "$spinner" 2>/dev/null || true
  spinner=
  # the line cleared and the cursor back
  printf '\r\033[K\033[?25h' >&4
}
# a line when a step starts and one when it ends, its output in out/run.log and with --verbose
# on screen too, a failure ends the run through set -e and finish reports it
step() {
  current=$1 t=$(date +%s)
  shift
  if [ -n "$spin" ]; then
    # the cursor hidden while the spinner runs, unspin shows it again
    printf '\033[?25l' >&4
    spinner_loop &
    spinner=$!
  else
    printf '%s› %s%s\n' "$dim" "$current" "$reset"
  fi
  if [ -n "$verbose" ]; then "$@" 2>&1 | tee -a "$log"; else "$@" >>"$log" 2>&1; fi
  unspin
  printf '%s✓%s %s %s%s%s\n' "$green" "$reset" "$current" "$dim" "$(took "$t")" "$reset"
  current=
}

# every simulator, emulator and argent tool server, a leftover one takes the next device's place
close_all() {
  "$repo/node_modules/.bin/argent" server stop >/dev/null 2>&1 || true
  xcrun simctl shutdown all
  for serial in $(adb devices | awk '/^emulator-/ { print $1 }'); do
    adb -s "$serial" emu kill >/dev/null 2>&1 || true
  done
  # the kill returns before the emulator is gone
  tries=0
  while adb devices | grep -q '^emulator-' && [ "$tries" -lt 30 ]; do
    sleep 1
    tries=$((tries + 1))
  done
  if adb devices | grep -q '^emulator-'; then
    echo "an emulator outlived its kill, forcing it"
    pkill -9 -f qemu-system || true
  fi
}

# a device that fails gets a second try
capture() {
  ./capture.sh "$1" && return
  warn "failed, second try"
  close_all
  ./capture.sh "$1"
}

# oxipng shrinks every PNG losslessly, level 3 is within 1.5 percent of level 4 at a sixth of
# the time, the extras are few and take level 4
optimize() {
  oxipng --strip safe -o 3 -r release/app-store release/google-play/*/
  oxipng --strip safe -o 4 release/social-header.png release/google-play/feature-graphic.png \
    "$repo"/packages/website/src/assets/images/phone*.png
}

# whatever happens, no simulator or emulator is left running, a failed step shows the log's end
finish() {
  status=$?
  # a second ctrl-c would cut the cleanup short, its commands inherit the ignore
  trap '' INT
  # the cleanup goes on past a failure of its own
  set +e
  # set -e can end the run inside a step, with its output still going to the log
  exec >&4 2>&4
  unspin
  if [ -n "$current" ]; then
    printf '%s✗%s %s %s%s%s\n' "$red" "$reset" "$current" "$dim" "$(took "$t")" "$reset"
    [ -n "$verbose" ] || { printf '%s' "$dim" && tail -n 15 "$log" && printf '%s' "$reset"; }
    echo "log: packages/screenshots/out/run.log"
  fi
  close_all >>"$log" 2>&1
  exit "$status"
}
trap finish EXIT
# macOS sh can skip the EXIT trap on a ctrl-c otherwise
trap 'exit 130' INT

# simulators, AVDs, flows, tools, font and client env first, a missing one stops it in seconds
# the watch first, its failure stops the run in a minute, then the devices in config order
devices=$(node -e '
  const { execSync } = require("child_process");
  const { existsSync, readdirSync, readFileSync } = require("fs");
  const home = require("os").homedir() + "/.android/avd";
  import("./config.ts").then(({ DEVICES, SCENES, THEME, WATCH }) => {
    const sims = execSync("xcrun simctl list devices available", { encoding: "utf8" });
    const avds = (existsSync(home) ? readdirSync(home) : []).filter((d) => d.endsWith(".avd"))
      .map((d) => readFileSync(`${home}/${d}/config.ini`, "utf8"));
    const missing = [["ios", WATCH], ...Object.values(DEVICES)
      .map((d) => [d.platform, d.name])]
      .filter(([platform, name]) => platform === "ios" ? !sims.includes(`${name} (`)
        : !avds.some((ini) => ini.includes(`hw.device.name=${name}\n`)))
      .map(([, name]) => name);
    missing.push(...SCENES.flatMap((s) => [s.flow, ...Object.values(s.flows ?? {})])
      .filter((f) => !existsSync(`flows/${f}.yaml`)).map((f) => `flows/${f}.yaml`));
    if (!existsSync(THEME.font)) missing.push(THEME.font);
    // the build reads them, without them it captures the fixture rates and no widget values
    const { env } = require("@expo/env").parseProjectEnv("../client", { mode: "production" });
    missing.push(...["RATES_URI", "HISTORICAL_RATES_URI", "API_URL"]
      .filter((k) => !(process.env[k] || env[k])).map((k) => `${k} in packages/client/.env`));
    if (!process.env.ANDROID_HOME) missing.push("ANDROID_HOME");
    // macOS ships a java stub, java_home answers only with a JDK installed
    try { execSync("/usr/libexec/java_home", { stdio: "ignore" }); }
    catch { missing.push("a JDK"); }
    for (const c of ["adb", "emulator", "pod"]) {
      try { execSync(`command -v ${c}`, { stdio: "ignore" }); }
      catch { missing.push(`${c} on the PATH`); }
    }
    if (missing.length) {
      console.error(`missing ${missing.join(", ")}, see docs/store-screenshots.md`);
      process.exit(1);
    }
    console.log(["apple-watch", ...Object.keys(DEVICES)].join(" "));
  });
')
for name in $only; do
  case " $devices " in
    *" $name "*) ;;
    *) echo "no device $name, one of: $devices" >&2 && exit 2 ;;
  esac
done
devices=${only:-$devices}
step build "$repo/packages/client/scripts/unattended-build.sh" ${rebuild:+--force}
close_all >>"$log" 2>&1
# the marble strip behind every set, each scene shows its own stretch of it, and the social header
step background node background.ts
# one device at a time: an iOS boot restarts argent's tool server, which drops the connections
# of a capture on another device
for device in $devices; do
  # the kind of device, the folder names say the rest
  case $device in
    apple-watch) kind="apple watch" ;; iphone-duo-*) kind="iphone duo" ;; iphone-*) kind=iphone ;;
    ipad-*) kind=ipad ;; pixel-tablet) kind="android tablet" ;; pixel-*) kind="android phone" ;;
    *) kind=$device ;;
  esac
  step "$kind" capture "$device"
  close_all >>"$log" 2>&1
done
step compose node compose.ts

# one folder per store in release/, ready to upload, before the extras so a failing one leaves
# them in place
for dir in out/screenshots/*/; do
  device=$(basename "$dir")
  case $device in pixel-*) store=google-play ;; *) store=app-store ;; esac
  command rm -rf "release/$store/$device"
  mkdir -p "release/$store"
  mv "$dir" "release/$store/$device"
done
# out/raw and out/background for a node compose.ts by hand
command rm -rf out/screenshots

# the Play feature graphic at the Play folder's root, and the website phone
step extras sh -c 'node feature-graphic.ts && node website-phone.ts'
# the run goes the same without oxipng, the PNGs stay as written
if command -v oxipng >/dev/null; then
  step optimize optimize
else
  warn "optimize skipped, no oxipng"
fi

count=$(find release/app-store release/google-play -name '*.png' | wc -l | tr -d ' ')
# a blank line sets the summary apart from the steps
printf '\n%s%s images in packages/screenshots/release took %s%s\n' "$green" "$count" \
  "$(took "$began")" "$reset"
