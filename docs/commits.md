# Commits and releases

Read before any commit: the release tail order, the no hunk splitting rule, running the commits and the SDK upgrade sequence.
The general rules live in `AGENTS.md`, Git, commits, and releases.

## Release order (branch tail)

`chore: bump version and build number` (only `packages/client/app.config.ts` version+buildNumber, the native plists are generated) → `chore: bump yarn` (only `.yarnrc.yml` + `packageManager` field in root `package.json`) → `chore: bump dependencies` (lockfiles, manifests) → `chore: publish`.

- Single-dep functional change may own its whole `package.json` if the file has no other pending bumps. Manifest mixing many bumps (SDK upgrade) → whole file to the dominant commit, no hunk split.
- Yarn bump colliding with dep bumps in the same `package.json` (no `.yarnrc.yml` change) → `packageManager` field rides in `chore: bump dependencies`, no separate `chore: bump yarn`.

## No hunk splitting

- Always `git add <file>` (full file). Never `git add -p`/`--patch`, past incident broke files and lost fragments.
- Exception (only `app.config.ts`): version+build lines go to `chore: bump version and build number` while other hunks go to the functional commit.
- Backup WT first: `git diff --binary > /tmp/wt-backup.patch`. Restore: `git apply /tmp/wt-backup.patch`.

## Running the commits

- The subject never opens on a capital, an acronym included: commitlint rejects it as sentence case. `fix: notifications switch for CCL stuck off`, not `fix: CCL switch stuck off`.
- One `git commit` per command, check it landed before the next. A chain with `&&` or `;` keeps going after a rejected commit and its staged files ride into the next one.

## Major SDK upgrade sequence

1. `feat: update to Expo SDK <N>` + `BREAKING CHANGE:` footer (`BREAKING CHANGE: upgraded to React Native 0.85`) — code migration, native diffs, plugins, forced import migration.
2. `docs: update AGENTS rules` if rules change with the upgrade.
3. Then the release order above, `chore: bump yarn` only if Yarn changed.
