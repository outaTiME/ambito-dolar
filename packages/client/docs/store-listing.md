# Store listing

Applies when writing the App Store / Google Play description or the "What's New" entry of a release.
Same copy register as the app (`packages/client/docs/copy-register.md`): voseo, no tuteo, no `colaborar`.

## Description

- Only what the app does today. Cross the rate list with core `getAvailableRateTypes` and the
  indicators with `getAvailableMarketTypes`, names as the cards show them.
- No "tiempo real": rates update automatically during the market day, by polling.
- No colons, sections `COTIZACIONES` and `INDICADORES` as the only headings, features in one sentence.
- Current text, 2026-10 (14.2.0):

```
Ámbito Dólar es la aplicación líder para seguir las cotizaciones de las principales divisas en Argentina. Simple, elegante y efectiva, te muestra el dólar blue, el oficial, el MEP y los indicadores económicos más relevantes, actualizados automáticamente durante la jornada.

COTIZACIONES
- Dólar Oficial, BNA (Banco Nación), Blue (Informal), Tarjeta (Turista), CCL, MEP, Cripto, Mayorista y Futuro
- Euro Oficial y Euro Blue (Informal)
- Real Oficial

INDICADORES
- Inflación mensual e interanual
- Plazo fijo y UVA
- Riesgo país y Merval
- Reservas del BCRA

Ámbito Dólar va más allá con notificaciones de apertura, cierre y variaciones, gráficos históricos, brechas entre cotizaciones, un conversor integrado y widgets para tu pantalla principal, todo configurable a tu medida.

Lo mejor de todo es que es completamente gratuita, sin publicidades molestas y de código abierto, sostenida por los aportes de su comunidad.

Descargá Ámbito Dólar y mantenete siempre un paso adelante en el dinámico mundo de las cotizaciones en Argentina.
```

## What's New

One entry per release, newest first, separated by `—`:

```
—

  v.14.2.0

• <user visible change>
• Ajustes estéticos, corrección de errores y mejoras en la estabilidad.
```

- `v.` plus the full version, two leading spaces.
- One `•` line per user visible change, one sentence with a final period. Openers in use: `Nueva/Nuevo…`,
  `Ahora podés…`, `<Cotización> se suma a las cotizaciones disponibles.`, `Se suman…`.
- A platform limit goes in parentheses at the end: `(requiere Android 8 o superior)`.
- The closing line is fixed and always last: `Ajustes estéticos, corrección de errores y mejoras en la
estabilidad.` A release with nothing user visible carries only that line.
- Fixes and internals (tracking, payload, polling cadence) stay out unless the user notices them.
