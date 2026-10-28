# Donation modal policy

Read this before changing the donation flow, its catalog, donor re-asks or the Developer screen
bypass.

- `donate_choose_note` on the `packages/client/screens/DonateScreen.tsx` card says the charge is one
  time and repeatable, which answers a question a user sent to support. `getOfferings` in
  `packages/client/hooks/useDonationProducts.ts` reads whichever offering is current, so the ladder
  is whatever that one holds and `donations` has to stay the current one. Nothing in the code
  filters by product category any more, so a subscription dropped into the current offering would
  render and the note would lie. Keep it consumables only.
- The offering is the catalog and the dashboard is where the ladder changes, with no release. A
  package removed from it also drops its key from `priceMap`, so past transactions of that product
  stop counting in `computeLifetime`, and a donor whose reduced total falls into a lower step gets
  re-asked sooner. Add steps, do not remove them.
- Cooldown in distinct usage days, not wall-clock. Heavy users steady cadence, casual users + sleepers respected.
- Both schedules and the checks applying them, `getDonationCooldown` and `getDonationReAsk`, live in `packages/client/utilities/Donation.ts`, tested in `packages/client/test.js`. `getCooldownDays` governs the first appearance and every post-dismiss wait: 15, 30, 45, 60 and 75 usage days, capped. `getReAskMs` governs the ask after a donation, date based so a donor is not penalized for low usage, with the one exception spelled out further down: 90, 180 or 360 days for a total donated under 2, under 10, or 10 and over. The top step stretches the wait, it does not end it, and there is no amount that stops the asking.
- The re-ask measures from `customerInfo.requestDate`, the server time of that snapshot, and the device clock only when it is missing. A clock months ahead would re-ask a donor the next day, one behind would never re-ask. A cached snapshot carries an older time, so it can only push the ask to the next usage day and never bring it forward.
- Forced opens via Developer screen bypass cooldown but don't increment dismiss counter.
- The modal is the `packages/client/app/donate.tsx` route, a native `formSheet` with `fitToContents`
  opened by `goToDonateModal()`. `withAppDonation` in `packages/client/components/AppContainer.tsx`
  only decides when, and waits for valid rates: the initial screen mounts no navigator, `navigate`
  would spend `donationShownDay` on a route that never mounts. The route owns the purchase and the
  dismiss accounting. Native, so it follows a fold or a resize and Android back closes it.
- The forced open is a one shot trigger and it is spent where the modal is shown, never where it is
  dismissed: on mount in the route. A trigger left armed reopens the modal on the next dependency
  change, which is what shipped for a while and reads as the modal reopening at random.
- The dismiss accounting hangs off the route unmount cleanup, which every close reaches: the swipe,
  the backdrop tap, Android back and Ahora no. A purchase reaches it too, `donatedRef` exempts it.
  `onDonated` pops the route only while `navigation.isFocused()`, a sheet closed before the payment
  sheet showed must not pop the screen below.
- Whether the open was forced is read once on mount into a ref, which dies with the route. An
  automatic check crossing a usage day while the modal is still open cannot reclassify a forced
  open and spend the cooldown on it, and the stamp cannot outlive its own modal and exempt the next
  automatic dismissal.
- `donationShownDay` caps the automatic ask at one per usage day. It is a module variable and not a
  persisted field, so it survives a remount and resets on a process restart, which is the cap this
  is meant to be. A forced open stamps it too, so forcing suppresses the automatic ask for that
  usage day in the same runtime. The effect also drops a check left in flight, so a dependency
  change mid check cannot present against state that already moved, and a failing `getCustomerInfo`
  leaves the day unspent on purpose so a later dependency change retries.
- A modal left open past midnight reruns the check on the new usage day, `router.navigate` reuses
  the open route and the slug stays, taken on mount. That day is stamped in `donationShownDay` and
  the close spends the cooldown as usual.
- Only two persisted state fields: `ignore_donation_days_used` (snapshot of `days_used` at last dismiss), `ignore_donation_count` (consecutive dismisses, resets on donate). New fields only with strong reason.
- The usage day gate runs before the re-ask, so a donor under 15 usage days waits for both. Donating resets the snapshot to `0` and not to the current `days_used`, so `elapsedDays` becomes the whole history and anyone past 15 days clears it at once. The deviation from "never penalized" only reaches someone who donated that early, and it asks them less rather than more.
- `computeLifetime` sums today's prices in the store's own currency, and the 2 and 10 thresholds read as USD. A storefront in another currency applies the same numeric thresholds without converting, so the step a donor lands on follows the raw number and not what it is worth. `currencyCode` comes back from the catalog and nothing reads it. `formatProductPrice` and the Statistics total use the app currency format labelled `US$`, on purpose, so prices read like the rest of the app. `price` comes in the store currency: the products are defined in USD, each store sets the local price per country, and Argentina buys in USD on both. Do not switch to the store `priceString`, its format does not match the app.
- The donation history belongs to `installation_id`, the RevenueCat App User ID, and RevenueCat holds
  a store account's purchases for one App User ID at a time. The id is persisted in the app
  container, so an app update keeps it and a clean install mints a new one that reads zero, which is
  the store answering for a different user and not a failed read.
- Only a purchase brings it back, by transferring the history to the id that bought. Restoring does
  not: consumables drop out of the receipt once finished, so `restorePurchases` on a fresh id posted
  and transferred nothing, verified on device. Android has no in-app path either and Play Billing 8
  stopped returning consumed one-time purchases. `allowBackup: false` in
  `packages/client/app.config.ts` disables the cloud backup, but from android 12 that flag no longer
  covers a device to device transfer, and this app declares no `dataExtractionRules`, so keeping
  `installation_id` through a migration is not guaranteed either way. Explicit `<device-transfer>`
  rules would make it eligible, not guarantee it, and expo exposes no config field for them, so they
  would take a config plugin.
- The RevenueCat transfer makes two installs on one store account take turns, whichever bought last
  holds the history and the other reads zero. Do not try to fix it from the app: without a login
  there is no identifier for the store account, and `Keep with original App User ID` would stop the
  turn taking by killing the transfer that recovers a reinstalled donor, the more common case. The
  icloud keychain is the one technique that works, ios only and a native module.
- When someone asks for their donations back, transfer by Order ID from the RevenueCat dashboard.
- A purchase goes through `useDonationPurchase` in `packages/client/hooks/useDonationPurchase.ts`, one at a time, from the `/donate` route and `packages/client/screens/DonateScreen.tsx`. Settings keeps its own guard, its wait also covers loading the products.
- Closing the modal with a purchase in flight or just finished is not a dismiss, `donatedRef` and `loadingRef` hold it back. Without that, donating and closing would count against the donor.
- `purchaseDonation`, in `packages/client/hooks/useDonationPurchase.ts`, resolves `true` once charged and reports any failure itself, callers only branch on it. A pending purchase (ask to buy, a pending store payment) rejects with `PAYMENT_PENDING_ERROR` and is not a failure: no alert and no Sentry. Its close still counts as a dismiss on purpose: nothing registers a donation until the transaction lands, so a close that spent no cooldown would ask again on the next usage day while the approval is pending. Once it lands the re-ask gate reads the transaction.
- A failed boot fetch of the catalog leaves no dep changed, so `withAppDonation` retries on the next foreground, through `ensureProducts` of `useDonationProducts`. The retry lives there and not in the hook, every screen using the hook would re-render on each app state change. Without it a launch without network skips the automatic modal for as long as the process lives.
- Clearing the rates removes the navigator rendered inside `AppContainer`, so an open donation route
  unmounts and records a dismiss unless it was forced, a purchase is in flight or a purchase
  succeeded. A locale reload does the same. A notification tap pushes the tabs over the sheet and
  the rates `popToTop` closes it, counting a dismiss too. The Conversor quick action leaves it below
  the new tabs. `router.dismissTo` cannot replace that `navigate`, between tabs it does nothing.
