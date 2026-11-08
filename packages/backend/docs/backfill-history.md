# Backfilling or dropping a type's history

Read before loading history for a rate or a market by hand, or removing one, for example a new
indicator that should open with past data or a retired rate. The processor only ever appends the
day it sees, so anything before its first tick comes from here.

`packages/backend/scripts/backfill-history.js`, run from the repo root. Never call
`/update-historical-rates` or `/update-rates` by hand for this, the script builds both bodies and
checks them.

```
node packages/backend/scripts/backfill-history.js --rows <type>=<grid.json> [--drop <type>] [--apply]
node packages/backend/scripts/backfill-history.js --drop <type> [--apply]
```

Both flags repeat for several types. Without `--apply` it is a dry run: it downloads production,
builds the new files, runs every check and prints the result, nothing is uploaded.

## The grid

A JSON file outside the repo, `[[YYYY-MM-DD, value], ...]` oldest first, one row per day the
source published (business days for a daily series, month ends for a monthly one). A value is a
number, or `[buy, sell]` for a rate. Build it from whatever source has the series, a one-off file,
not a loader in the script.

- Each row becomes `[timestamp, value, change]`, the change against the row before with
  `getNextRateStat`, the processor math. The first row gets 0, as a first tick does.
- The timestamp is `00:00` for a bcra series (`BCRA_MARKET_IDS`, they show the day only) and
  `18:00` for the rest, the close the last tick reads.
- Only the days before the first stored row are added, the processor rows are never touched, so a
  rerun adds nothing.

## Dropping

`--drop <type>` removes the type from the history and from `quotes.json`.

- A type the processor still serves (a market whose source changed, the MSCI Merval replacing the
  S&P one) is seeded in `quotes.json` with the record the next tick would write: same identity and
  hash from `getMarkets`/`getNewRates`, so the tick does not duplicate it. With a grid for the same
  type (`--drop merval --rows merval=...`) the type is rebuilt whole and the seed takes its change
  against the grid's day before, plus the week before it as stats, the detail screen needs two
  stats to show its chart and ranges.
- A retired type has no latest value and only goes away. A rate is never seeded, it comes back with
  its next tick if the processor still reads it.

## What it checks before uploading

Any failure aborts with nothing uploaded.

- Every type not named stays byte identical, in the history and in `quotes.json`, rates included.
- The stored rows are the untouched tail of each loaded type, one row per day, in order.
- The history body has no `rates`/`markets` key, the route would merge instead of replacing.
- `max`/`max_date` in `quotes.json` move only when the grid has a higher value.

## Uploading, `--apply`

It asks before each upload (type `yes`).

1. Reads production again and aborts if it changed since the snapshot, a tick would be lost.
2. Posts the history to `/update-historical-rates`, which replaces `full-historical-quotes.json`
   and regenerates `historical-quotes.json` and the legacy files. Downloads it and compares.
3. Posts `quotes.json` to `/update-rates`, which moves `updated_at` so the clients fetch again and
   merges the body's stats into the history. The script simulates that merge first and says what
   it adds or rewrites, then downloads both files and compares.

A failure prints the `curl` that restores the backups, `quotes.json` first and the history after,
since restoring quotes merges its rows back into the history. A network error prints them too, the
request may still have landed, read the bucket before restoring.

## Before running

- Deploy first. The seed hash comes from the local `packages/backend/src/subscribers/process.js`,
  the deployed processor must compute the same one or Monday's tick adds a second record.
- Run on a weekend or after the close, the processor cron runs 10 to 18 monday to friday and a
  write during the run aborts it. `--apply` refuses monday to friday 9 to 19.
- The root `.env` needs `QUOTES_OBJECT_KEY` and `SECRET_KEY`, plus `MARKETS_URL` and `BCRA_URL` for
  `--drop`. `packages/client/.env` needs `API_URL` (https) and `HISTORICAL_RATES_URI`. Nothing in
  the script names a url.
- Backups and the built files land in `~/Desktop/ad-backfill-<date>/` (`--out` changes it):
  `backup-*.json` is production before the run, `new-*.json` what was uploaded.
