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
- **`cadence` in the payload slows that polling, clamped so it can only slow and never speed up.** It
  carries the open market value and the client derives the closed one, so an already resolved value
  must never be sent. It does not reach the widgets, which keep their own.
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
  behind it the tick is not blocked, it does not run: `useTickProvider` takes the same test
  `AppContainer` makes, so the interval stops exactly where the button appears. It comes back when
  the button clears the error, which is before its fetch answers, and the in-flight guard absorbs the
  tick calls that land in between. The guard inside `fetchRates` still covers the other triggers.
- **`NetInfo` covers the fast failure only**, a hung socket still takes the whole `timeout` from
  `packages/core` before the retry button appears. Do not add a retry layer on top of ky.
- **`FOREGROUND_TOAST_WINDOW` is the toast's only job.** An update landing within it of the app
  reaching foreground reads as belonging to that open, so `Actualizado` announces it, and anything
  later arrives silently. The ten seconds are a judgement about what still feels like the same open,
  not a number derived from anything else, so there is nothing to recompute it from.

## Notification body and social caption

`getBodyMessage` (`packages/backend/src/subscribers/notify.js`) feeds push body + social caption.

- Cap 300 chars: bsky `text` graphemes, reddit `title` chars, both published through IFTTT. Reddit error misleading: `NO_TEXT: title required` when title >300.
- Format: `LABEL VALOR ↑PCT%` / `↓PCT%`. No colon, no parens, no trailing period. No-change rates (CRIPTO) drop arrow+pct.
- Separator `, ` (cleanest in iOS push vs `·` or `|`). Sort by absolute pct DESC, biggest movers first, no-change rates land last.
- Arrows ↑↓ over `+/-` for peripheral scan (SF Pro native). Before adding a rate: simulate caption with all active + new, must ≤300 with ≥10 headroom. Headroom <10 → compact (drop "de jornada", shorter labels) before merge.

## Donation modal policy

- `donate_choose_note` on the DonateScreen card says the charge is one time and repeatable, which
  answers a question a user sent to support. `getOfferings` in
  `packages/client/hooks/useDonationProducts.ts` reads whichever offering is current, so the ladder is
  whatever that one holds and `donations` has to stay the current one. Nothing in the code filters by
  product category any more, so a subscription dropped into the current offering would render and the
  note would lie. Keep it consumables only.
- The offering is the catalog and the dashboard is where the ladder changes, with no release. A
  package removed from it also drops its key from `priceMap`, so past transactions of that product
  stop counting in `computeLifetime`, and a donor whose reduced total falls into a lower step gets
  re-asked sooner. Add steps, do not remove them.
- Cooldown in distinct usage days, not wall-clock. Heavy users steady cadence, casual users + sleepers respected.
- Single escalating schedule `getCooldownDays` (`packages/client/utilities/Donation.ts`) governs first appearance + post-dismiss cooldown.
- Post-donate re-ask `getReAskMs` date-based, tiered by lifetime donated. Donors never penalized for low usage.
- Forced opens via Developer screen bypass cooldown but don't increment dismiss counter.
- Only two state fields: `ignore_donation_days_used` (snapshot of `days_used` at last dismiss), `ignore_donation_count` (consecutive dismisses, resets on donate). New fields only with strong reason.
- The steps are 15, 30, 45, 60 and 75 usage days, capped, and the re-ask is 3, 6 or 12 months for a lifetime under 2, under 10, or over. Both live in `packages/client/utilities/Donation.ts`.
- The usage day gate runs before the re-ask, so a donor under 15 usage days waits for both. Donating resets the snapshot to `0` and not to the current `days_used`, so `elapsedDays` becomes the whole history and anyone past 15 days clears it at once. The deviation from "never penalized" only reaches someone who donated that early, and it asks them less rather than more.
- `computeLifetime` sums today's prices in the store's own currency, and the 2 and 10 thresholds read as USD. A storefront in another currency lands every donor on the 12 month step. `currencyCode` comes back from the catalog and nothing reads it.
- The donation history belongs to `installation_id`, the RevenueCat App User ID, and RevenueCat holds
  a store account's purchases for one App User ID at a time. The id is persisted in the app
  container, so an app update keeps it and a clean install mints a new one that reads zero, which is
  the store answering for a different user and not a failed read.
- Only a purchase brings it back, by transferring the history to the id that bought. Restoring does
  not: consumables drop out of the receipt once finished, so `restorePurchases` on a fresh id posted
  and transferred nothing, verified on device. Android has no in-app path either, Play Billing 8
  stopped returning consumed one-time purchases and `allowBackup: false` rules out the backup.
- That same transfer makes two installs on one store account take turns, whichever bought last holds
  the history and the other reads zero. Do not try to fix it from the app. Without a login there is
  no identifier for the store account and StoreKit does not expose one, the alias behavior is legacy
  and closed to new projects, and `Keep with original App User ID` would stop the turn taking by
  killing the transfer that recovers a reinstalled donor, the more common case. Syncing the id through
  the icloud keychain is the one technique that works, ios only and a native module.
- When someone asks for their donations back, transfer by Order ID from the RevenueCat dashboard.
- Closing the sheet with a purchase in flight or just finished is not a dismiss, `donatedRef` and `loadingRef` hold it back. Without that, donating and closing would count against the donor.
- `USE_NATIVE_DONATION_SHEET` is the way out of `@gorhom/bottom-sheet` and both paths are kept alive on purpose. It is `false`, so the `BottomSheetModal` in `AppContainer` is what ships and `goToDonateModal()` on the `app/donate.tsx` route sits dormant. That route is not dead code, deleting it burns the escape hatch, and a change to the donation modal has to land on both sides.
