package im.outa.ambitodolar.widgets

import android.content.Context

// the RateWidget card for one market, a single value so there is no value type to pick
class MarketWidget : WidgetProvider() {
  override val emptyText = R.string.widget_market_empty

  override val layout = R.layout.widget_card

  override val label = R.string.widget_market_label

  override val hasValueType = false

  override val catalog = Format.MARKET_TYPES

  override val path = "markets"

  override val configTitles = R.string.widget_config_market to R.string.widget_config_markets

  // the first of the list, same as ios
  override val defaultRates = listOf("inflacion")

  override fun card(context: Context, widgetId: Int, rates: Map<String, Rate>): Content? {
    val type = rateTypes(context, widgetId)[0]
    val rate = rates[type] ?: return null
    return Content.Card(
      title = Format.shortTitle(type),
      detail = " ",
      small = Format.marketChange(type, rate),
      smallColor = Format.marketColor(type, rate),
      big = Format.marketValue(type, rate),
      date = Format.marketDate(type, rate.timestamp),
      rateType = type,
    )
  }
}
