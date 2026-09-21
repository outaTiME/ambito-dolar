# Donation modal policy

Read this before changing the donation flow, its catalog, donor re-asks or the Developer screen
bypass.

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
- Post-donate re-ask `getReAskMs` date-based, tiered by the total donated. Donors not penalized for low usage, with the one exception spelled out further down.
- Forced opens via Developer screen bypass cooldown but don't increment dismiss counter.
- The forced open is a one shot trigger and it is spent where the modal is shown, never where it is
  dismissed: next to `present()` in `packages/client/components/AppContainer.tsx` and on mount in
  the `packages/client/app/donate.tsx` route. A trigger left armed reopens the modal on the next
  dependency change, which is what shipped for a while and reads as the modal reopening at random.
- Keep the sheet dismiss accounting on `onDismiss`. A completed close can skip `onChange` when the
  current index is already `-1`, which is what a close interrupting the opening animation does. This
  sheet leaves `enableDismissOnClose` at its default `true`, so its completed close reaches
  `onDismiss` through the modal teardown. Moving the accounting back to `onChange` brings the whole
  class of bugs back.
- Whether the open was forced is remembered in a ref. It is stamped only on a forced presentation
  and cleared on every dismiss, which is what keeps the two leaks shut: an automatic check crossing
  a usage day while the modal is still open would otherwise reclassify a forced open and spend the
  cooldown on it, and a stamp that outlived its own modal would exempt the next automatic dismissal
  from the cooldown instead.
- `donationShownDay` caps the automatic ask at one per usage day. It is a module variable and not a
  persisted field, so it survives a remount and resets on a process restart, which is the cap this
  is meant to be. A forced open stamps it too, so forcing suppresses the automatic ask for that
  usage day in the same runtime. The effect also drops a check left in flight, so a dependency
  change mid check cannot present against state that already moved, and a failing `getCustomerInfo`
  leaves the day unspent on purpose so a later dependency change retries.
- Only two persisted state fields: `ignore_donation_days_used` (snapshot of `days_used` at last dismiss), `ignore_donation_count` (consecutive dismisses, resets on donate). New fields only with strong reason.
- The steps are 15, 30, 45, 60 and 75 usage days, capped, and the re-ask is 90, 180 or 360 days for a total donated under 2, under 10, or 10 and over. The top step stretches the wait, it does not end it, and there is no amount that stops the asking. Both live in `packages/client/utilities/Donation.ts`.
- The usage day gate runs before the re-ask, so a donor under 15 usage days waits for both. Donating resets the snapshot to `0` and not to the current `days_used`, so `elapsedDays` becomes the whole history and anyone past 15 days clears it at once. The deviation from "never penalized" only reaches someone who donated that early, and it asks them less rather than more.
- `computeLifetime` sums today's prices in the store's own currency, and the 2 and 10 thresholds read as USD. A storefront in another currency applies the same numeric thresholds without converting, so the step a donor lands on follows the raw number and not what it is worth. `currencyCode` comes back from the catalog and nothing reads it.
- The donation history belongs to `installation_id`, the RevenueCat App User ID, and RevenueCat holds
  a store account's purchases for one App User ID at a time. The id is persisted in the app
  container, so an app update keeps it and a clean install mints a new one that reads zero, which is
  the store answering for a different user and not a failed read.
- Only a purchase brings it back, by transferring the history to the id that bought. Restoring does
  not: consumables drop out of the receipt once finished, so `restorePurchases` on a fresh id posted
  and transferred nothing, verified on device. Android has no in-app path either and Play Billing 8
  stopped returning consumed one-time purchases. `allowBackup: false` in
  `packages/client/app.config.ts` disables the cloud backup. For apps running on and targeting
  android 12 or later some manufacturers still permit a device to device transfer, and this app
  declares no `dataExtractionRules`, so keeping `installation_id` through a migration is not
  guaranteed either way.
- Explicit `<device-transfer>` rules would define which app data is eligible for a transfer, not
  guarantee a recovery. This is a CNG project and expo exposes no app config field for them, so they
  would go in an expo config plugin. Before deciding, audit what the restored state carries:
  `packages/client/store/index.ts` keeps `push_token` and `sending_push_token` out, but it does
  persist `last_register_hash`, which is derived from the token. The widget side of the same flag is
  in `packages/client/docs/android-widgets.md`.
- The RevenueCat transfer makes two installs on one store account take turns, whichever bought last holds
  the history and the other reads zero. Do not try to fix it from the app. Without a login there is
  no identifier for the store account and StoreKit does not expose one, the alias behavior is legacy
  and closed to new projects, and `Keep with original App User ID` would stop the turn taking by
  killing the transfer that recovers a reinstalled donor, the more common case. Syncing the id through
  the icloud keychain is the one technique that works, ios only and a native module.
- When someone asks for their donations back, transfer by Order ID from the RevenueCat dashboard.
- Closing the sheet with a purchase in flight or just finished is not a dismiss, `donatedRef` and `loadingRef` hold it back. Without that, donating and closing would count against the donor.
- The two paths agree on the gating, on spending the trigger at show time, on the purchase in
  flight guard and on hanging the dismiss accounting off the teardown, the sheet on `onDismiss` and
  the route on its unmount cleanup. Where they part is which ancestor owns them. Clearing the rates
  removes the navigator rendered inside `AppContainer`, so an open donation route unmounts and
  records a dismiss unless it was forced, a purchase is in flight or a purchase succeeded, while the
  sheet belongs to the donation wrapper around it and stays mounted. Unmounting the sheet itself is
  not exempt either: the gorhom `Portal` cleanup calls `handlePortalOnUnmount`, which can reach
  `onDismiss`. Verify the teardown on both before flipping `USE_NATIVE_DONATION_SHEET`.
- `USE_NATIVE_DONATION_SHEET` is the way out of `@gorhom/bottom-sheet` and both paths are kept alive on purpose. It is `false`, so the `BottomSheetModal` in `packages/client/components/AppContainer.tsx` is what ships and the `packages/client/app/donate.tsx` route opened by `goToDonateModal()` sits dormant. That route is not dead code, deleting it burns the escape hatch, and a change to the donation modal has to land on both sides.
