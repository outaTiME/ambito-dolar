package im.outa.ambitodolar.widgets

import android.content.Context

// RateWidgetEntryView on ios, the change small and colored and the price big and plain
class RateWidget : WidgetProvider() {
  override val emptyText = R.string.widget_empty

  override val layout = R.layout.widget_card

  override val label = R.string.widget_rate_label

  // Helper.getDefaultRateType() is the first of the list
  override val defaultRates = listOf("oficial")

  override fun card(context: Context, widgetId: Int, rates: Map<String, Rate>): Content? {
    val type = rateTypes(context, widgetId)[0]
    // a retired type stops coming from the service and ios shows the empty text
    val rate = rates[type] ?: return null
    val valueType = WidgetConfig.valueType(context, widgetId)
    return Content.Card(
      title = Format.shortTitle(type),
      // a rate without a buy sell pair has no value type to show, same as ios
      detail = if (rate.buy != null) Format.valueLabel(valueType) else " ",
      small = Format.changeWithSymbol(rate.change),
      smallColor = Format.changeColor(rate.change),
      big = Format.rateCurrency(rate.value(valueType)),
      date = Format.timestamp(rate.timestamp),
      rateType = type,
    )
  }
}
