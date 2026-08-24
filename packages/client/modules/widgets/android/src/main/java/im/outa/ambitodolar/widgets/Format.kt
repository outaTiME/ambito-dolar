package im.outa.ambitodolar.widgets

import java.math.RoundingMode
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

// mirrors RateWidgets.swift, which mirrors packages/core, keep the three in sync
object Format {
  // truncates like the core toFixedNoRounding, built per call so a locale change is picked up
  private fun currency(): DecimalFormat =
    DecimalFormat("#,##0.00", DecimalFormatSymbols(Locale.getDefault())).apply {
      roundingMode = RoundingMode.DOWN
    }

  // per call for the same reason as the currency one, a val would freeze its digits
  private fun date(): DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM HH:mm")

  fun rateCurrency(value: Double): String = currency().format(value)

  // the ios spread reads the difference through the same formatter with the percent off
  fun rateAmount(value: Double): String {
    val text = currency().format(value)
    val zero = currency().format(0.0)
    // a value that formats to zero loses its sign first, or a change of a thousandth down would
    // print as -0,00% right next to the equals sign that changeSymbol gives it for not moving
    return when {
      text == "-$zero" -> zero
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

  // the spread carries the newer of its two rates, and the second one when they tie, which is
  // what the ios comparison falls through to
  fun later(first: String, second: String): String {
    val a = instant(first)
    val b = instant(second)
    val newer = if (a != null && b != null && a.isAfter(b)) a else b
    return newer?.atZoneSameInstant(ZoneId.systemDefault())?.format(date()) ?: ""
  }

  fun instant(value: String): OffsetDateTime? =
    try {
      OffsetDateTime.parse(value)
    } catch (e: Exception) {
      null
    }

  // the api sends iso 8601 with the buenos aires offset, shown in the device timezone like ios
  fun timestamp(value: String): String =
    try {
      OffsetDateTime.parse(value).atZoneSameInstant(ZoneId.systemDefault()).format(date())
    } catch (e: Exception) {
      ""
    }

  // ios/RateWidgets/Utils/Helper.swift keeps the same list, in the same order
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

  fun rateTitle(type: String): String = RATE_TYPES.firstOrNull { it.first == type }?.second ?: type

  // ios checks Helper.getRateTypes().contains before reading a rate out of the payload, so a type
  // it retired is dropped even while the service keeps sending it, which is the case of qatar and
  // ahorro today. Without this the widget would title a rate with its raw id
  fun isKnown(type: String): Boolean = RATE_TYPES.any { it.first == type }

  // ValueType.displayName on ios
  fun valueLabel(value: String): String =
    when (value) {
      "buy" -> "Compra"
      "average" -> "Promedio"
      else -> "Venta"
    }
}
