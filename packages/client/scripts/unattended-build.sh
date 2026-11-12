#!/bin/sh
# the unattended Release builds the e2e tests and the store screenshots run on, into build/unattended
# run as yarn client:build:unattended [--force], it builds only when the app sources, core or the
# lockfile changed after the last build, --force builds anyway after an Xcode bump or a deleted source file
set -eu

client=$(cd "$(dirname "$0")/.." && pwd)
repo=$(cd "$client/../.." && pwd)
out=$client/build/unattended
app=$out/AmbitoDolar.app
apk=$out/app-release.apk

changed=$([ ! -d "$app" ] || find "$client" "$repo/packages/core" "$repo/yarn.lock" -newer "$app" \
  -type f -not -path '*/node_modules/*' \
  -not -path '*/build/*' -not -path "$client/ios/*" -not -path "$client/android/*" \
  -not -path '*.xcassets/*.colorset/*' -not -path '*.xcassets/*.appiconset/*' \
  -not -path '*/.expo/*' -not -path '*/.argent/*' -not -path '*/docs/*' -not -path '*/scripts/*' \
  -not -path "$client/dist/*" -not -path "$client/web-build/*" -not -name test.js -not -name '*.md' -not -name sst-env.d.ts \
  -not -name .DS_Store | sed -n 1p)
if [ "${1:-}" != --force ] && [ -d "$app" ] && [ -f "$apk" ] && [ -z "$changed" ]; then
  echo "unattended builds up to date in $out"
  exit 0
fi

# a failed build leaves nothing behind, the next run builds again
command rm -rf "$out"
cd "$repo"
# a Release build uploads its sourcemaps otherwise
export SENTRY_DISABLE_AUTO_UPLOAD=true
# empty keys skip the Sentry and Amplitude inits, every launch would reach them
# an unattended build, the developer screen and no update toast or donation modal of its own
export SENTRY_DSN= AMPLITUDE_KEY= UNATTENDED=true

yarn run client:prebuild --platform ios
# generic builds for the simulator and only copies the .app, the expo cli loads .env
# a Release build embeds its bundle, no Metro and no question about a busy port
yarn run client:run:ios --configuration Release --device generic --no-bundler --output "$out"
[ -d "$app" ] || { echo "the build left no $app" >&2 && exit 1; }

yarn run client:prebuild --platform android
# expo run:android always installs on a device, so gradle alone with the env files loaded the way
# the expo cli loads them, API_URL among them
# a fresh daemon each time, one reused across builds ran out of metaspace in r8
cd "$client"
node -e '
  require("@expo/env").loadProjectEnv(".", { mode: "production" });
  const { status } = require("child_process").spawnSync("./gradlew", ["--no-daemon", "app:assembleRelease"],
    { cwd: "android", stdio: "inherit" });
  process.exit(status ?? 1);
'
cp android/app/build/outputs/apk/release/app-release.apk "$apk"
