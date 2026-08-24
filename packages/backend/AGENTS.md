# Backend

Rules for `packages/backend`, loaded on top of the root `AGENTS.md` when working here.

SST v4, Lambda handlers.

- API handlers go through `Shared.wrapHandler(...)` and answer with `Shared.serviceResponse(...)`.
- `packages/backend/src/routes/test.js` is an API endpoint, not a test. There is no test script here.
- Public response shapes are contracts: the client, the website and both widget implementations
  read them. A `/fetch` change reaches the ios widgets first, see
  `packages/client/docs/android-widgets.md`.
