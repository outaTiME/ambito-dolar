# Where a rule goes

Read before adding, moving or removing a rule in `AGENTS.md`, a package `AGENTS.md` or `docs/`.

Three levels. Who could break a rule decides where it goes, not how important it is.

- **`AGENTS.md`** loads on every session, so everything there is paid on every task. It holds what
  someone could break without ever opening the subtree that owns it.
- **`packages/<name>/AGENTS.md`** loads on top of the root one when working in that subtree, with
  no one having to remember it. What can only be broken from inside goes there, not in the root.
- **`docs/`** is the depth: measurements and what was tried and failed. Nothing there loads on its
  own, it is read when a pointer says so, so it sits next to what it describes:
  `packages/client/docs/` for what only that package can break, root `docs/` for what crosses
  packages, like the rollout of a rate across backend and client.
- **A pointer** is one line naming the trap and where the detail is. It goes wherever the reader
  who could break the rule will be: the same trap can be written twice for different audiences,
  once in the root for a backend session changing `/fetch`, once in the client for whoever opens
  the widget itself.

Every path with a slash is written complete from the repo root, `packages/client/config/settings.ts`
not `config/settings.ts`. A bare filename with no slash is fine as shorthand.

Follow a pointer before touching what it names, not after. A `docs/` file opens with the line that
says when it applies. It records why something is the way it is, which keeps a settled decision
from being reopened.
