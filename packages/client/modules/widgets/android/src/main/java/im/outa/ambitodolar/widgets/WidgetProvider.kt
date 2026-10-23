package im.outa.ambitodolar.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.appwidget.AppWidgetProviderInfo
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.util.SizeF
import android.view.View
import android.widget.RemoteViews
import kotlin.math.roundToInt

// one row of a list widget, name against price and date against change
data class Row(
  val name: String,
  val price: String,
  val date: String,
  val change: String,
  val changeColor: Int,
)

// the six slot card and the three row list, rateType is what the tap opens
sealed class Content(val rateType: String?) {
  class Card(
    val title: String,
    val detail: String,
    val small: String,
    val smallColor: Int,
    val big: String,
    val date: String,
    rateType: String,
    val bigColor: Int = R.color.widget_foreground,
  ) : Content(rateType)

  class Rows(val rows: List<Row>) : Content(null)
}

abstract class WidgetProvider : AppWidgetProvider() {
  // null shows the empty text, the preview passes INVALID_APPWIDGET_ID and so reads the defaults
  protected abstract fun card(context: Context, widgetId: Int, rates: Map<String, Rate>): Content?

  abstract val layout: Int

  abstract val emptyText: Int

  // one default per slot in layout order, the config screen reads the slot count from here
  abstract val defaultRates: List<String>

  // the ios spread intent is the one without a valueType parameter
  open val hasValueType: Boolean = true

  // what the config screen offers and the tab the tap opens, markets never mix with rates
  open val catalog = Format.RATE_TYPES

  open val path = "rates"

  // the ios intent parameter titles, one slot and many
  open val configTitles = R.string.widget_config_rate to R.string.widget_config_rates

  // a retired type goes back to its slot default unless another slot holds it, then it draws nothing like ios
  internal fun rateTypes(context: Context, widgetId: Int): List<String> {
    val stored =
      defaultRates.mapIndexed { slot, default ->
        WidgetConfig.rateType(context, widgetId, slot, default)
      }
    return stored.mapIndexed { slot, type ->
      type.takeIf { known -> catalog.any { it.first == known } } ?: defaultRates[slot].takeIf { it !in stored } ?: type
    }
  }

  // ios drops the missing ones with compactMap and only goes empty when none is left
  protected fun rows(
    context: Context,
    widgetId: Int,
    rates: Map<String, Rate>,
    row: (String, Rate) -> Row,
  ): Content? =
    rateTypes(context, widgetId)
      .mapNotNull { type -> rates[type]?.let { row(type, it) } }
      .takeIf { it.isNotEmpty() }
      ?.let { Content.Rows(it) }

  // what the config screen puts on top, the same string the launcher shows in the picker
  abstract val label: Int

  // the fetch cannot run on the main thread, goAsync keeps the receiver alive until the redraw is done
  override fun onReceive(context: Context, intent: Intent) {
    val manager = AppWidgetManager.getInstance(context)
    val ids =
      when (intent.action) {
        // separators and time are read at render time
        Intent.ACTION_MY_PACKAGE_REPLACED,
        Intent.ACTION_LOCALE_CHANGED,
        Intent.ACTION_TIMEZONE_CHANGED -> all(context, manager)
        AppWidgetManager.ACTION_APPWIDGET_UPDATE ->
          intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS) ?: all(context, manager)
        else -> null
      }
    // an empty list still refreshes the picker preview, only an unhandled action goes to the base class
    if (ids == null) {
      super.onReceive(context, intent)
      return
    }
    val pending = goAsync()
    val trigger = intent.action.orEmpty().substringAfterLast('.')
    Widgets.EXECUTOR.execute {
      try {
        renderNow(context, ids, trigger)
      } finally {
        pending.finish()
      }
    }
  }

  override fun onRestored(context: Context, oldWidgetIds: IntArray, newWidgetIds: IntArray) {
    oldWidgetIds.zip(newWidgetIds).forEach { (old, new) ->
      WidgetConfig.move(context, old, new, defaultRates.size)
    }
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    appWidgetIds.forEach { WidgetConfig.clear(context, it, defaultRates.size) }
  }

  // the work serves every provider, so it only goes with the last widget of all of them
  override fun onDisabled(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    if (Widgets.ALL.all { it.all(context, manager).isEmpty() }) {
      WidgetWorker.cancel(context)
    }
  }

  // APPWIDGET_UPDATE is protected, so the app and the config screen redraw through here
  // no manifest flag guards this door and getFont below api 26 is an Error nothing catches
  fun refresh(context: Context, ids: IntArray? = null, trigger: String = "app") {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    Widgets.EXECUTOR.execute { renderNow(context, ids, trigger) }
  }

  // blocking, the worker holds itself on it until the redraw is done
  internal fun renderNow(context: Context, ids: IntArray? = null, trigger: String = "app") {
    val manager = AppWidgetManager.getInstance(context)
    try {
      render(context, manager, ids ?: all(context, manager), trigger)
    } catch (e: Exception) {
      // an exception would otherwise die on the executor thread without a trace
      Log.w(TAG, "redraw failed on $trigger", e)
    }
  }

  internal fun all(context: Context, manager: AppWidgetManager): IntArray =
    manager.getAppWidgetIds(ComponentName(context, javaClass))

  private fun render(
    context: Context,
    manager: AppWidgetManager,
    ids: IntArray,
    trigger: String,
  ) {
    // with nothing placed only the preview is left, and below api 35 there is none
    if (ids.isEmpty() && Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
      return
    }
    // scheduled before the fetch, or a first widget added offline would never get a periodic run
    // the count is asked again because onDisabled may have cancelled the work meanwhile
    if (all(context, manager).isNotEmpty()) {
      WidgetWorker.schedule(context)
    }
    val rates = RatesApi.fetch(context)
    // null means no answer and nothing on disk, the empty text beats a bare initialLayout
    if (rates == null) {
      for (id in ids) {
        manager.updateAppWidget(id, views(context, null, id))
      }
      return
    }
    if (ids.isNotEmpty()) {
      // an id removed meanwhile is a no op for the host, never a widget brought back
      for (id in ids) {
        manager.updateAppWidget(id, views(context, card(context, id, rates), id))
      }
      Log.i(TAG, "${javaClass.simpleName} drew ${ids.size} on $trigger")
    }
    // the preview quota is about two an hour, a periodic run for an unplaced provider would spend it
    if (ids.isEmpty() && trigger == PERIODIC) {
      return
    }
    // published even with nothing placed, a stale stored preview outlives the resource ids it was built against
    try {
      publishPreview(context, manager, rates)
    } catch (e: Exception) {
      Log.w(TAG, "preview not published", e)
    }
  }

  // from android 15 the picker shows a real widget like the ios gallery, false when the quota is spent
  private fun publishPreview(context: Context, manager: AppWidgetManager, rates: Map<String, Rate>) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
      return
    }
    val preview = card(context, AppWidgetManager.INVALID_APPWIDGET_ID, rates) ?: return
    manager.setWidgetPreview(
      ComponentName(context, javaClass),
      AppWidgetProviderInfo.WIDGET_CATEGORY_HOME_SCREEN,
      views(context, preview, null),
    )
  }

  private fun RemoteViews.slot(
    context: Context,
    id: Int,
    text: String,
    sizeDp: Float,
    color: Int,
    wrap: Boolean = false,
    room: Int = 0,
  ): Int {
    val bitmap = TextBitmap.of(context, text, sizeDp, context.getColor(color), wrap, room)
    setImageViewBitmap(id, bitmap)
    // an image has nothing for talkback to read otherwise
    setContentDescription(id, text)
    return bitmap.width
  }

  // a ceiling and not a layout, twice the card because an s9 reports 174dp for a card it draws at 144
  // the picker preview has no widget to ask and falls back to the declared minimum, zero means no ceiling
  private fun roomPx(context: Context, reported: Int, padding: Int): Int {
    val card =
      if (reported > 0) {
        (reported * context.resources.displayMetrics.density).roundToInt()
      } else {
        context.resources.getDimensionPixelSize(R.dimen.widget_min_size)
      }
    return CEILING * (card - 2 * padding)
  }

  // OPTION_APPWIDGET_SIZES from android 12, the old extra when it is missing or empty
  @Suppress("DEPRECATION")
  private fun widthDp(options: Bundle): Int {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      options
        .getParcelableArrayList<SizeF>(AppWidgetManager.OPTION_APPWIDGET_SIZES)
        ?.minOfOrNull { it.width }
        ?.let { return it.toInt() }
    }
    return options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
  }

  private fun views(context: Context, content: Content?, widgetId: Int?): RemoteViews {
    val views = RemoteViews(context.packageName, layout)
    views.setViewVisibility(R.id.widget_content, if (content == null) View.GONE else View.VISIBLE)
    views.setViewVisibility(R.id.widget_empty, if (content == null) View.VISIBLE else View.GONE)
    // 0 for the picker preview, which has no widget to ask
    val reported =
      widgetId?.let { widthDp(AppWidgetManager.getInstance(context).getAppWidgetOptions(it)) } ?: 0
    // Sizes is a proportion of the card, so a card under REFERENCE_DP scales down and never up
    val scale = if (reported > 0) (reported / REFERENCE_DP).coerceIn(SCALE_FLOOR, 1f) else 1f
    // the padding follows the text at half its rate
    val padding =
      (context.resources.getDimensionPixelSize(R.dimen.widget_padding) * (1f + scale) / 2f)
        .roundToInt()
    if (scale < 1f) {
      views.setViewPadding(R.id.widget_content, padding, padding, padding, padding)
    }
    when (content) {
      null ->
        views.slot(
          context,
          R.id.widget_empty,
          context.getString(emptyText),
          Sizes.EMPTY * scale,
          R.color.widget_foreground,
          wrap = true,
        )
      is Content.Card -> {
        val room = roomPx(context, reported, padding)
        views.slot(context, R.id.widget_title, content.title, Sizes.TITLE * scale, R.color.widget_foreground, room = room)
        views.slot(context, R.id.widget_detail, content.detail, Sizes.DETAIL * scale, R.color.widget_secondary, room = room)
        views.slot(context, R.id.widget_small, content.small, Sizes.CHANGE * scale, content.smallColor, room = room)
        views.slot(context, R.id.widget_big, content.big, Sizes.VALUE * scale, content.bigColor, room = room)
        views.slot(context, R.id.widget_date, content.date, Sizes.DATE * scale, R.color.widget_secondary, room = room)
      }
      is Content.Rows -> {
        val room = roomPx(context, reported, padding)
        // name and date get the reported card minus the value beside them, so a long one ellipsizes at the row size
        // an s9 reports more than it draws and still lands on fitStart, the picker preview keeps the ceiling
        val gap = (ROW_GAP_DP * context.resources.displayMetrics.density).roundToInt()
        val beside = { value: Int -> if (reported > 0) (room / CEILING - value - gap).coerceAtLeast(1) else room }
        SLOTS.forEachIndexed { slot, ids ->
          val row = content.rows.getOrNull(slot)
          // a missing row stays invisible with spaces at the same sizes, so the others keep their place like ios
          val visibility = if (row == null) View.INVISIBLE else View.VISIBLE
          views.setViewVisibility(ids[0], visibility)
          views.setViewVisibility(ids[1], visibility)
          if (row == null) {
            views.slot(context, ids[2], " ", Sizes.ROW_NAME * scale, R.color.widget_foreground)
            views.slot(context, ids[3], " ", Sizes.ROW_VALUE * scale, R.color.widget_foreground)
            views.slot(context, ids[4], " ", Sizes.DATE * scale, R.color.widget_secondary)
            views.slot(context, ids[5], " ", Sizes.ROW_CHANGE * scale, R.color.widget_secondary)
          } else {
            val price = views.slot(context, ids[3], row.price, Sizes.ROW_VALUE * scale, R.color.widget_foreground, room = room)
            views.slot(
              context,
              ids[2],
              row.name,
              Sizes.ROW_NAME * scale,
              R.color.widget_foreground,
              room = beside(price),
            )
            val change = views.slot(context, ids[5], row.change, Sizes.ROW_CHANGE * scale, row.changeColor, room = room)
            views.slot(
              context,
              ids[4],
              row.date,
              Sizes.DATE * scale,
              R.color.widget_secondary,
              room = beside(change),
            )
          }
        }
      }
    }
    if (widgetId != null) {
      views.setOnClickPendingIntent(
        android.R.id.background,
        openApp(context, widgetId, content?.rateType),
      )
    }
    return views
  }

  // the ambito-dolar scheme the app declares, ios opens a universal link android would need assetlinks for
  private fun openApp(context: Context, widgetId: Int, type: String?): PendingIntent {
    val uri = "ambito-dolar://$path" + if (type != null) "/$type" else ""
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(context.packageName)
    return PendingIntent.getActivity(
      context,
      widgetId,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  companion object {
    // how many cards wide a text may be before it is cut, see roomPx
    private const val CEILING = 2

    // under the narrowest report that renders right, the 174 of an s9, see android-widgets.md
    private const val REFERENCE_DP = 170f

    // past this the ellipsis reads better than shrinking further
    private const val SCALE_FLOOR = 0.7f

    // the marginStart of the price and the change in widget_list.xml
    private const val ROW_GAP_DP = 4f

    // the trigger the periodic work reports
    const val PERIODIC = "worker"

    // row container, meta container, name, price, date and change of each list slot
    private val SLOTS =
      listOf(
        intArrayOf(R.id.widget_row0, R.id.widget_meta0, R.id.widget_name0, R.id.widget_price0, R.id.widget_date0, R.id.widget_change0),
        intArrayOf(R.id.widget_row1, R.id.widget_meta1, R.id.widget_name1, R.id.widget_price1, R.id.widget_date1, R.id.widget_change1),
        intArrayOf(R.id.widget_row2, R.id.widget_meta2, R.id.widget_name2, R.id.widget_price2, R.id.widget_date2, R.id.widget_change2),
      )
  }
}
