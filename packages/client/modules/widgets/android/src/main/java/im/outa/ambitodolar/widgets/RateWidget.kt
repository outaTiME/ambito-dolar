package im.outa.ambitodolar.widgets

import android.content.Context

// RateWidgetEntryView on ios: one rate, the change on the small slot with its arrow and color,
// the price big and plain
class RateWidget : WidgetProvider() {
  override val emptyText = R.string.widget_empty

  override val layout = R.layout.widget_card

  override val label = R.string.widget_rate_label

  // Helper.getDefaultRateType() is the first of the list
  override val defaultRates = listOf("oficial")

  override fun card(context: Context, widgetId: Int, rates: Map<String, Rate>): Content? {
    val type = rateTypes(context, widgetId)[0]
    // a retired rate type stops coming from the service, ios drops it and shows the empty text
    val rate = rates[type] ?: return null
    val valueType = WidgetConfig.valueType(context, widgetId)
    return Content.Card(
      title = Format.rateTitle(type),
      // rates without a buy sell pair have no value type to show, same as ios
      detail = if (rate.hasPair) Format.valueLabel(valueType) else " ",
      small = Format.changeWithSymbol(rate.change),
      smallColor = Format.changeColor(rate.change),
      big = Format.rateCurrency(rate.value(valueType)),
      bigColor = R.color.widget_foreground,
      date = Format.timestamp(rate.timestamp),
      rateType = type,
    )
  }
}
