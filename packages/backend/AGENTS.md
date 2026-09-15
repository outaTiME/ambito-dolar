# Backend

Rules for `packages/backend`, loaded on top of the root `AGENTS.md` when working here.

SST v4, Lambda handlers.

- API handlers go through `Shared.wrapHandler(...)` and answer with `Shared.serviceResponse(...)`.
- `packages/backend/src/routes/test.js` is an API endpoint, not a test. There is no test script here.
- Public response shapes are contracts: the client, the website and both widget implementations
  read them. A `/fetch` change reaches the ios widgets first, see
  `packages/client/docs/android-widgets.md`.
- `is_open` in `quotes.json` drives how often the client asks for rates. Dropping it or changing
  its meaning fails silently, see `docs/product-policies.md`. It must not go into `/fetch` while
  `storeFetchJsonObject` is gated on `is_updated`: a gated write leaves it stale on exactly the
  close and the open, the two runs that move it without new rates. Anything that writes
  `quotes.json` outside `Process` has to carry the flag over,
  `packages/backend/src/routes/update-rates.js` reads the stored one for that.
- **`puppeteer-core` and `@sparticuz/chromium` move together or not at all**, both only used in
  `packages/backend/src/libs/chrome.js`. A mismatch fails when the social lambda launches Chrome,
  which surfaces as a missing post and not as an error. The chromium README prescribes the check:
  match the Chrome major that puppeteer ships, from https://pptr.dev/supported-browsers, to the
  chromium package major.
- **One `timeout` in `packages/core` and no per call override.** Every source was measured before it
  was set and only one is above a second, so a second number would be a guess. A success body read
  with `.then(r => r.json())` is outside that timer, and a timeout is never retried.
- **ky skips POST and PATCH**, so those wrap in `promiseRetry` instead: every social target, the
  nested one in `social/instagram.js` that waits out a media still processing, and `getBusinessDay`.
  Retrying a publish can repeat it, and with lambda retries off in `infra/defaults.ts` that is the
  only way a post goes out twice.
- **Every lambda timeout in `infra/` is twice its observed duration and says so.** Move the pair
  together.
- **What survives a slow source is the `catch`, not the timeout.** `getRate` catches and
  `getObjectRates` compacts the hole, so one slow source costs one rate. `getBusinessDay` throws
  uncaught and costs the whole cycle. A lambda killed after `storeRatesJsonObject` leaves S3 written
  and the push unsent, which is worse than dying before it.
- **Do not reorder `process.js`.** `storeRatesJsonObject` -> `updateRealtimeData` -> `notify` is
  load bearing, a push landing before the board is written shows stale rates to the clients still
  on it.
- **Remove `updateInstantData` before 2027-08-31**, the day InstantDB cloud shuts down. It carries
  no timeout of its own and runs before `notify()`, so a hung sdk eats the one minute `Process`
  budget and stops push and socials for everyone.
