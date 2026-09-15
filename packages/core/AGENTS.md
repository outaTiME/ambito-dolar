# Core

Rules for `packages/core`, loaded on top of the root `AGENTS.md` when working here.

A change here reaches the client, the backend and the website.

- **`fetch` and `promiseRetry` have consumers on both sides.** `promiseRetry` reads as backend only
  and is not, the client retries the expo push token with it through `Helper.promiseRetry` in
  `packages/client/actions/index.ts`. The `timeout` on the ky instance is what the client waits out
  on a hung socket before its retry button appears.
- **Read a body with the ky `.json()` shortcut and never with a native `response.json()`.** ky drops
  its timer once the headers land, so the native read has no deadline and a hung stream leaves the
  await pending for good. On the client that also strands the in-flight guard in
  `withRateUpdates.tsx`, and from there not even the retry button gets through.

## Tests

```bash
yarn test                                                # from the root, through lerna
yarn workspace @ambito-dolar/core exec ava
yarn workspace @ambito-dolar/core exec ava --match="Dates should use*"
```

- The `test` script is `eslint . && ava`, so `yarn workspace @ambito-dolar/core test` dies with
  `command not found: eslint`: eslint only resolves from the repo root. Go through root `yarn test`
  or `exec ava`.
- `--match` for fast feedback, not the whole file.
