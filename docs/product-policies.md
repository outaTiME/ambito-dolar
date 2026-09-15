# Product policies

Rules that only bite when touching the area they name. `AGENTS.md` carries the pointer and the
one line that must not be broken by accident.

## Rate rollout gating

New rate in development before stores approve client release:

- Backend `packages/backend/src/subscribers/notify.js`: add rate type to socials `_.omit(current_rates, [...])` so socials don't publish before clients render. Mark `// TODO: remove once vX.Y.Z is released`.
- Client `packages/client/utilities/Helper.ts`: add the rate type to the `.omit([...])` in `getAvailableRates`, which hides it on every platform. Same TODO.
- Version gate `packages/backend/src/libs/shared.js`: `MIN_CLIENT_VERSION_FOR_<TYPE> = 'X.Y.Z'`, apply where payloads/notifications dispatched.
- Verify social caption ≤300 chars with new rate.

Release after approval: delete only the `// TODO:` line + that rate entry. Preserve `_.omit([...])` block + `// rates to exclude...` comment placeholder as insertion point for next gated rate.

## Rate refresh cadence

The client polls `Settings.RATES_URI` from `packages/client/components/withRateUpdates.tsx`.

- Cadence comes from `is_open` in `quotes.json`, `base_rates.is_open = !close_day`
  (`packages/backend/src/subscribers/process.js`): true on every 5 minute run, false from
  `ProcessClose` at 18:00, and false through a non-working day because the business day guard returns
  early. That covers nights, weekends and holidays with no calendar on the client. The guard
  preserves the value and never repairs it, so a missed close leaves the app polling fast until the
  next open.
- **Never derive a market date from the device.** `DateUtils.get` parses without a timezone, so a
  comparison at `'day'` follows the phone and not the market. `getTimezoneDate` in `packages/core`
  is the one that knows about Argentina.
- **The cadence gate lives inside `fetchRates`, not in the effects**, so every trigger shares it.
  The callers that bypass it with `{ force: true }` are the store clear, the retry button and the
  connectivity listener.
- **`historical_rates` is persisted on purpose.** It is what draws yesterday's chart when the
  refetch fails instead of raising the alert, so it cannot be blacklisted out of the store to keep
  the blob small. The cost is that it rides along on every rewrite of the rates slice.
- **An empty screen belongs to the retry button.** With no rates in the store and a failed attempt
  behind it, neither the tick nor the connectivity listener fetches again.
- **`NetInfo` covers the fast failure only**, a hung socket still takes the whole `timeout` from
  `packages/core`. That window is why `still_loading` exists, at half of it so the message always
  lands first. Do not add a retry layer on top of ky.

## Notification body and social caption

`getBodyMessage` (`packages/backend/src/subscribers/notify.js`) feeds push body + social caption.

- Cap 300 chars: bsky `text` graphemes, reddit `title` chars. Reddit error misleading: `NO_TEXT: title required` when title >300.
- Format: `LABEL VALOR ↑PCT%` / `↓PCT%`. No colon, no parens, no trailing period. No-change rates (CRIPTO) drop arrow+pct.
- Separator `, ` (cleanest in iOS push vs `·` or `|`). Sort by absolute pct DESC, biggest movers first, no-change rates land last.
- Arrows ↑↓ over `+/-` for peripheral scan (SF Pro native). Before adding a rate: simulate caption with all active + new, must ≤300 with ≥10 headroom. Headroom <10 → compact (drop "de jornada", shorter labels) before merge.

## Donation modal policy

- Cooldown in distinct usage days, not wall-clock. Heavy users steady cadence, casual users + sleepers respected.
- Single escalating schedule `getCooldownDays` (`packages/client/utilities/Donation.ts`) governs first appearance + post-dismiss cooldown.
- Post-donate re-ask `getReAskMs` date-based, tiered by lifetime donated. Donors never penalized for low usage.
- Forced opens via Developer screen bypass cooldown but don't increment dismiss counter.
- Only two state fields: `ignore_donation_days_used` (snapshot of `days_used` at last dismiss), `ignore_donation_count` (consecutive dismisses, resets on donate). New fields only with strong reason.
