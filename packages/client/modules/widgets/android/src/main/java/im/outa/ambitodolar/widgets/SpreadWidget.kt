package im.outa.ambitodolar.widgets

import android.content.Context

// SpreadWidgetEntryView on ios, the difference small and plain and the percentage big and
// colored, both sides read at their sell value because the ios intent has no value type
class SpreadWidget : WidgetProvider() {
  override val emptyText = R.string.widget_empty_plural

  override val layout = R.layout.widget_card

  override val label = R.string.widget_spread_label

  // Helper.getDefaultSpreadRateTypes() is rateTypes[2] then rateTypes[1], Blue against BNA
  override val defaultRates = listOf("informal", "bna")

  override val hasValueType = false

  override fun card(context: Context, widgetId: Int, rates: Map<String, Rate>): Content? {
    val (firstType, secondType) = rateTypes(context, widgetId)
    // the spread needs both sides, one alone says nothing
    val first = rates[firstType] ?: return null
    val second = rates[secondType] ?: return null
    val firstValue = first.value(WidgetConfig.DEFAULT_VALUE)
    val secondValue = second.value(WidgetConfig.DEFAULT_VALUE)
    val change = (firstValue / secondValue - 1) * 100
    // a spread that is not a number says nothing and would be drawn as if it did: a divisor near
    // zero, or a subtraction between two values far apart, comes out infinite from two finite
    // sides, reaches DecimalFormat and prints. The empty text is the honest answer
    if (!change.isFinite() || !(firstValue - secondValue).isFinite()) {
      return null
    }
    return Content.Card(
      title = TITLE,
      detail = Format.rateTitle(firstType) + " → " + Format.rateTitle(secondType),
      small = Format.rateAmount(firstValue - secondValue),
      smallColor = R.color.widget_foreground,
      // no arrow on this one, ios reads the plain change here
      big = Format.rateChange(change),
      bigColor = Format.changeColor(change),
      date = Format.later(first.timestamp, second.timestamp),
      rateType = firstType,
    )
  }

  companion object {
    // RateValue(id: "spread", name: "Brecha", ...) on ios, not a configurable label
    private const val TITLE = "Brecha"
  }
}
