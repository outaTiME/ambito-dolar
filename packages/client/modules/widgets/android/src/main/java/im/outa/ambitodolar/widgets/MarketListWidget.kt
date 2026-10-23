package im.outa.ambitodolar.widgets

import android.content.Context

// the ListWidget rows for three markets
class MarketListWidget : WidgetProvider() {
  override val emptyText = R.string.widget_market_empty_plural

  override val label = R.string.widget_market_list_label

  override val layout = R.layout.widget_list

  override val hasValueType = false

  override val catalog = Format.MARKET_TYPES

  override val path = "markets"

  override val configTitles = R.string.widget_config_market to R.string.widget_config_markets

  // the first three of the list, same as ios
  override val defaultRates = listOf("inflacion", "inflacion_interanual", "plazo_fijo")

  override fun card(context: Context, widgetId: Int, rates: Map<String, Rate>): Content? =
    rows(context, widgetId, rates) { type, rate ->
      Row(
        name = Format.shortTitle(type),
        price = Format.marketValue(type, rate),
        date = Format.marketDate(type, rate.timestamp),
        change = Format.marketChange(type, rate),
        changeColor = Format.marketColor(type, rate),
      )
    }
}
