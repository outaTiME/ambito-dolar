package im.outa.ambitodolar.widgets

import java.math.RoundingMode
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

// mirrors packages/client/targets/_shared/Rates.swift and packages/core, keep the three in sync
object Format {
  // truncates like the core toFixedNoRounding, per call so a locale change is picked up
  private fun currency(digits: Int = 2): DecimalFormat =
    DecimalFormat(if (digits > 0) "#,##0." + "0".repeat(digits) else "#,##0", DecimalFormatSymbols(Locale.getDefault())).apply {
      roundingMode = RoundingMode.DOWN
    }

  private val DATE = DateTimeFormatter.ofPattern("dd/MM HH:mm")

  fun rateCurrency(value: Double): String = currency().format(value)

  // the ios spread reads the difference through the same formatter with the percent off
  fun rateAmount(value: Double, digits: Int = 2): String {
    val format = currency(digits)
    val text = format.format(value)
    val zero = format.format(0.0)
    // a value that formats to zero loses its sign, decided on the magnitude since the minus sign is per locale
    return when {
      value < 0 && format.format(-value) == zero -> zero
      value > 0 -> "+$text"
      else -> text
    }
  }

  fun rateChange(value: Double): String = rateAmount(value) + "%"

  // what the rate and the list widgets show, the ios formatRateChange with symbol left on
  fun changeWithSymbol(value: Double): String = rateChange(value) + " " + changeSymbol(value)

  fun changeSymbol(value: Double): String =
    when {
      value == 0.0 -> "="
      value > 0 -> "↑"
      else -> "↓"
    }

  fun changeColor(value: Double): Int =
    when {
      value == 0.0 -> R.color.widget_blue
      value > 0 -> R.color.widget_green
      else -> R.color.widget_red
    }

  // the newer of the two, the second on a tie like the ios comparison
  fun later(first: String, second: String): String =
    shown(listOfNotNull(instant(second), instant(first)).maxOrNull())

  fun instant(value: String): OffsetDateTime? =
    try {
      OffsetDateTime.parse(value)
    } catch (e: Exception) {
      null
    }

  // the api sends iso 8601 with the buenos aires offset, shown in the device timezone like ios
  fun timestamp(value: String): String = shown(instant(value))

  private fun shown(value: OffsetDateTime?): String =
    value?.atZoneSameInstant(ZoneId.systemDefault())?.format(DATE) ?: ""

  // packages/client/targets/_shared/Helper.swift keeps the same list and order
  val RATE_TYPES =
    listOf(
      "oficial" to "Oficial",
      "bna" to "BNA",
      "informal" to "Blue",
      "turista" to "Tarjeta",
      "ccl" to "CCL",
      "mep" to "MEP",
      "ccb" to "Cripto",
      "mayorista" to "Mayorista",
      "euro" to "Euro",
      "euro_informal" to "Euro Blue",
      "real" to "Real",
      "futuro" to "Futuro",
    )

  // Helper.getMarketTypes() keeps the same list and order
  val MARKET_TYPES =
    listOf(
      "inflacion" to "Inflación",
      "inflacion_interanual" to "Inflación interanual",
      "plazo_fijo" to "Plazo fijo",
      "uva" to "UVA",
      "riesgo_pais" to "Riesgo país",
      "merval" to "Merval",
      "reservas" to "Reservas",
    )

  // rates and markets share the /fetch keys and never repeat one
  private val TITLES = (RATE_TYPES + MARKET_TYPES).toMap()

  fun rateTitle(type: String): String = TITLES[type] ?: type

  // the RateType short on ios, for names that do not fit a row
  private val SHORT = mapOf("inflacion_interanual" to "Interanual")

  fun shortTitle(type: String): String = SHORT[type] ?: rateTitle(type)

  // the ios usableRates whitelist, a retired type is dropped while the service still sends it
  fun isKnown(type: String): Boolean = type in TITLES

  // display rules per market, the MARKETS of config/kinds.ts and marketFormats on ios
  private class Market(
    val decimals: Int = 2,
    // pts, pb and US$ are left out like the tickers do, only % and the M of reservas stay
    val suffix: String = "",
    // a percentage moves in points, the others in percent
    val points: Boolean = false,
    // up is bad news, so the colors swap
    val inverse: Boolean = false,
    // a month or a day, never moved by the device timezone
    val dated: String? = null,
  )

  private val MARKETS =
    mapOf(
      "inflacion" to Market(suffix = "%", points = true, inverse = true, dated = "MMMM"),
      "inflacion_interanual" to Market(suffix = "%", points = true, inverse = true, dated = "MMMM"),
      "plazo_fijo" to Market(suffix = "%", points = true, dated = "dd/MM"),
      "uva" to Market(dated = "dd/MM"),
      "riesgo_pais" to Market(decimals = 0, inverse = true),
      "merval" to Market(decimals = 0),
      "reservas" to Market(decimals = 0, suffix = " M", dated = "dd/MM"),
    )

  private fun market(type: String) = MARKETS.getValue(type)

  fun marketValue(type: String, rate: Rate): String =
    market(type).let { currency(it.decimals).format(rate.sell) + it.suffix }

  // the close comes back from the percentage when missing
  // rounded first because a float residue would truncate a whole step down
  private fun marketDiff(type: String, rate: Rate): Double {
    val close = rate.close ?: (rate.sell / (1 + rate.change / 100))
    val scale = Math.pow(10.0, market(type).decimals.toDouble())
    return Math.round((rate.sell - close) * scale) / scale
  }

  // formatMarketChange in its card form, with the arrow of the diff
  fun marketChange(type: String, rate: Rate): String {
    val diff = marketDiff(type, rate)
    val format = market(type)
    val text = if (format.points) rateAmount(diff, format.decimals) else rateChange(rate.change)
    return text + " " + changeSymbol(diff)
  }

  fun marketColor(type: String, rate: Rate): Int =
    marketDiff(type, rate).let { changeColor(if (market(type).inverse) -it else it) }

  fun marketDate(type: String, timestamp: String): String {
    val dated = market(type).dated ?: return timestamp(timestamp)
    val text =
      instant(timestamp)
        ?.atZoneSameInstant(ZoneId.of("America/Argentina/Buenos_Aires"))
        ?.format(DateTimeFormatter.ofPattern(dated, Locale.forLanguageTag("es-AR"))) ?: return ""
    return text.replaceFirstChar { it.uppercase() }
  }

  // ValueType.displayName on ios
  fun valueLabel(value: String): String =
    when (value) {
      "buy" -> "Compra"
      "average" -> "Promedio"
      else -> "Venta"
    }
}
