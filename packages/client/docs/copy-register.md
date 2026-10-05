# Copy register

Applies when writing any user facing string: `packages/client/config/I18n.ts`, the ios widget strings in
`packages/client/targets/` and the android widget resources.

Voseo everywhere, rioplatense: `Elegí`, `verificá`, `Tenés`. No tuteo. Applies to the ios swift
strings too. The widget picker has its own register, see `packages/client/docs/android-widgets.md`.

The error strings take their shape from Apple's `es_419`: `Imposible <verb>` and `No se pudieron
<verb>`. Apple's `es_419` tutea and this app does not, voseo wins there.

Every string is one sentence. A failure that needs a remedy carries it in the same sentence or
leaves it to the button beside it.

Neutral `lo` refers to an action. Do not pluralise one to `los` just to match a nearby plural noun.

A note says what happens or what the reader can do, and never opens on a negation. Every negative
string is an error state, so a note shaped like one reads as a failure. State the fact instead of
denying the alternative.

`Donar` is the action and `Donaciones` counts them in the stats, `aporte` is the thing the reader
picks and gives. Those two are the whole vocabulary for it, there is no `colaborar` and no
`contribución` in the catalog.

One word per concept where the concept is really one: `conexión` never `conectividad`. No
commercial vocabulary, so no `pago` and no `suscripción`.
