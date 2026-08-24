# Core

Rules for `packages/core`, loaded on top of the root `AGENTS.md` when working here.

ESM (`"type": "module"`). Shared domain utils: rates, dates, formatting, fetch helpers. Consumed by
the client, the backend and the website, so a change here reaches all three.

## Tests

The only automated tests in the repo.

```bash
yarn test                                                # from the root, through lerna
yarn workspace @ambito-dolar/core exec ava
yarn workspace @ambito-dolar/core exec ava --match="Dates should use*"
```

- The `test` script is `eslint . && ava`, so `yarn workspace @ambito-dolar/core test` dies with
  `command not found: eslint`: eslint only resolves from the repo root. Go through root `yarn test`
  or `exec ava`.
- `--match` for fast feedback, not the whole file.
