package im.outa.ambitodolar.widgets

import android.content.Context

// SpreadWidgetEntryView on ios, both sides at their sell value because its intent has no value type
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
    // a zero divisor would print infinity as a number
    if (!change.isFinite()) {
      return null
    }
    return Content.Card(
      title = TITLE,
      detail = Format.shortTitle(firstType) + " → " + Format.shortTitle(secondType),
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
