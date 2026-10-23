package im.outa.ambitodolar.widgets

import android.content.Context

// ListRatesWidgetEntryView on ios, three rates with their own date and change, one value type
class ListWidget : WidgetProvider() {
  override val emptyText = R.string.widget_empty_plural

  override val label = R.string.widget_list_label

  override val layout = R.layout.widget_list

  // Helper.getDefaultRateTypes() is the first three of the list
  override val defaultRates = listOf("oficial", "bna", "informal")

  override fun card(context: Context, widgetId: Int, rates: Map<String, Rate>): Content? {
    val valueType = WidgetConfig.valueType(context, widgetId)
    return rows(context, widgetId, rates) { type, rate ->
      Row(
        name = Format.shortTitle(type),
        price = Format.rateCurrency(rate.value(valueType)),
        date = Format.timestamp(rate.timestamp),
        change = Format.changeWithSymbol(rate.change),
        changeColor = Format.changeColor(rate.change),
      )
    }
  }
}
