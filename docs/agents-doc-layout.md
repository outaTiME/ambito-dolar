# Where a rule goes

Read this before adding, moving or removing a rule in `AGENTS.md`, a package `AGENTS.md`
or `docs/`.

Three levels. What decides where a rule goes is not how important it is, it is who could break it.

- **`AGENTS.md`** loads on every session, so what sits there is paid on every session whatever the
  task is. It holds what someone could break without ever opening the subtree that owns it.
- **`packages/<name>/AGENTS.md`** loads on its own, on top of the root one, when working in that
  subtree. Nobody has to remember it, so anything that can only be broken from inside goes there
  and not in the root one.
- **`docs/`** is the depth, with its measurements and what was tried and failed. Nothing there loads
  on its own, it is read when a pointer says to, so it sits next to what it describes:
  `packages/client/docs/` for what only that package can break, the root `docs/` for what crosses
  packages, the way the rollout of a rate crosses the backend and the client.
- **A pointer** is one line that names the trap and where the detail is. It goes wherever the
  reader who could break the rule will be: the same trap can be worth writing twice with a
  different audience, once in the root for a backend session changing `/fetch` and once in the client
  for whoever opens the widget itself.

Every path with a slash is written complete from the repo root, `packages/client/config/settings.ts`
and not `config/settings.ts`. A bare filename with no slash is fine as shorthand.

Follow a pointer before touching what it names, not after. A `docs/` file opens with the line that
says when it applies, and it is the record of why something is the way it is, which is what keeps a
settled decision from being reopened.
