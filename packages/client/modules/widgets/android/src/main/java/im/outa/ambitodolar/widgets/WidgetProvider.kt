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

// one rate of the list widget, its name against its price and under it the date against the change
data class Row(
  val name: String,
  val price: String,
  val date: String,
  val change: String,
  val changeColor: Int,
)

// two shapes for the three ios views, the six slot card and the three rate list
// rateType is what the tap opens, the ios list widget opens the app without one
sealed class Content(val rateType: String?) {
  class Card(
    val title: String,
    val detail: String,
    val small: String,
    val smallColor: Int,
    val big: String,
    val bigColor: Int,
    val date: String,
    rateType: String,
  ) : Content(rateType)

  class Rows(val rows: List<Row>) : Content(null)
}

abstract class WidgetProvider : AppWidgetProvider() {
  // null shows the empty text, and the preview passes INVALID_APPWIDGET_ID, which has no keys
  // saved against it and so reads back the defaults
  protected abstract fun card(context: Context, widgetId: Int, rates: Map<String, Rate>): Content?

  // the card one for the rate and the spread, the list one for the three rate widget
  abstract val layout: Int

  // singular on the rate widget, plural where several rates are configured, same as ios
  abstract val emptyText: Int

  // one entry per rate slot, in the order the widget lays them out. The config screen reads the
  // count from here, and every slot falls back to its entry when nothing is stored yet
  abstract val defaultRates: List<String>

  // the ios spread intent is the one without a valueType parameter
  open val hasValueType: Boolean = true

  // the configured rate of every slot, each one falling back to its own default. Pairing a slot
  // with the wrong default is the kind of mistake that only shows up as a wrong widget
  protected fun rateTypes(context: Context, widgetId: Int): List<String> =
    defaultRates.mapIndexed { slot, default ->
      WidgetConfig.rateType(context, widgetId, slot, default)
    }

  // what the config screen puts on top, the same string the launcher shows in the picker
  abstract val label: Int

  // the fetch cannot run on the main thread and a receiver can be killed as soon as onReceive
  // returns, so the update is held with goAsync until the redraw is done
  override fun onReceive(context: Context, intent: Intent) {
    val manager = AppWidgetManager.getInstance(context)
    val ids =
      when (intent.action) {
        // the separators come from the locale and the time from the zone, both read at render
        // time, so a change to either leaves the widget wrong until something redraws it
        Intent.ACTION_MY_PACKAGE_REPLACED,
        Intent.ACTION_LOCALE_CHANGED,
        Intent.ACTION_TIMEZONE_CHANGED -> all(context, manager)
        AppWidgetManager.ACTION_APPWIDGET_UPDATE ->
          intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS) ?: all(context, manager)
        else -> null
      }
    // an empty list is not nothing to do: the picker preview of a provider nobody placed yet is
    // refreshed from here too, and render knows to only do that part. Only an action we do not
    // handle goes back to the base class
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

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    appWidgetIds.forEach { WidgetConfig.clear(context, it, defaultRates.size) }
  }

  // one piece of work serves every provider, so it only goes when the last widget of all of them
  // is gone. onDisabled alone would cancel it while another provider still has widgets on screen
  override fun onDisabled(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    if (Widgets.ALL.all { it.all(context, manager).isEmpty() }) {
      WidgetWorker.cancel(context)
    }
  }

  // APPWIDGET_UPDATE is a protected broadcast and only the system can send it, so the app and
  // the config screen ask for a redraw through here instead.
  // The receivers ship disabled below api 26 and the launcher never lists them, but this door is
  // opened by the app and no manifest flag guards it, and behind it the text is drawn with
  // Resources.getFont, which is api 26. That would raise a NoSuchMethodError, an Error and not an
  // Exception, so nothing downstream would catch it and the app would go down on android 7
  fun refresh(context: Context, ids: IntArray? = null, trigger: String = "app") {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    Widgets.EXECUTOR.execute { renderNow(context, ids, trigger) }
  }

  // blocking, so the caller owns the thread. The worker needs it this way to hold itself until
  // the redraw is done, and it is also where the periodic work is put back after an app update.
  // A reboot is WorkManager's own business and needs nothing from here
  // false when the service could not be reached, which is the only thing the worker asks for so
  // it can hand the retry to WorkManager instead of sleeping inside its own run
  internal fun renderNow(
    context: Context,
    ids: IntArray? = null,
    trigger: String = "app",
    alive: () -> Boolean = { true },
  ): Boolean {
    val manager = AppWidgetManager.getInstance(context)
    return try {
      render(context, manager, ids ?: all(context, manager), trigger, alive)
    } catch (e: Exception) {
      // an exception thrown in here would die on the executor thread without a trace
      Log.w(TAG, "redraw failed on $trigger", e)
      true
    }
  }

  internal fun all(context: Context, manager: AppWidgetManager): IntArray =
    manager.getAppWidgetIds(ComponentName(context, javaClass))

  private fun render(
    context: Context,
    manager: AppWidgetManager,
    ids: IntArray,
    trigger: String,
    alive: () -> Boolean,
  ): Boolean {
    // a provider with nothing on a screen is only here for the picker preview, and below api 35
    // there is no preview to publish, so there is nothing worth a request
    if (ids.isEmpty() && Build.VERSION.SDK_INT < PREVIEW_SDK) {
      return true
    }
    // before the fetch and whatever it answers. Hanging it off a good answer meant that a first
    // widget added with no network never got one: nothing was scheduled, updatePeriodMillis is
    // zero, and getting signal back is not an event, so it sat on its initial layout until the
    // app was opened. The work carries the network constraint precisely so it can wait
    // the id list is a snapshot taken before this ran, and the last widget can be gone by now:
    // onDisabled would have cancelled the work and this would put it straight back, leaving it
    // waking up every half hour with nothing on any screen
    if (ids.isNotEmpty() && all(context, manager).isNotEmpty()) {
      WidgetWorker.schedule(context)
    }
    val rates = RatesApi.fetch(context)
    // a failed fetch leaves whatever the widget was showing, redrawing it empty would throw
    // away good data over a dropped request
    if (rates == null) {
      return false
    }
    // the fetch is the long part, so the stop is looked at again on the way out of it. What it
    // asks is whether the worker was stopped, and once it was, whatever this returns is ignored
    if (!alive()) {
      return true
    }
    // the picker preview is limited to about two an hour, and the periodic run visits every provider
    // every half hour, so a provider nobody placed would spend the whole quota on its own and
    // leave none for the update that actually changes what the preview should show
    val worthPreviewing = ids.isNotEmpty() || trigger != PERIODIC
    if (ids.isNotEmpty()) {
      // asked again per widget: with several on screen a stop lands on the next one instead of
      // waiting out the whole set
      // the list is a snapshot taken before the fetch, and a widget removed in between would be
      // drawn again here from defaults, its configuration already cleared by onDeleted
      // an id removed while the fetch ran is not skipped: the host already dropped it and
      // updateAppWidget on an id it does not know is a no op, never a widget brought back
      for (id in ids) {
        if (!alive()) {
          break
        }
        manager.updateAppWidget(id, views(context, card(context, id, rates), id))
      }
      Log.i(TAG, "${javaClass.simpleName} drew ${ids.size} on $trigger")
    }
    // the preview is not for the widgets on a screen, it is for the ones in the picker that
    // nobody placed yet, so it is published even when this provider has none. Cutting out on an
    // empty id list left a provider you never used showing whatever preview was stored last, and
    // a stored preview outlives an app update while resource ids do not survive a rebuild, so it
    // ends up driving a view that is no longer the one it was built against.
    // The widgets are already drawn, a preview that fails must not take the redraw down with it
    if (!worthPreviewing) {
      return true
    }
    try {
      publishPreview(context, manager, rates)
    } catch (e: Exception) {
      Log.w(TAG, "preview not published", e)
    }
    return true
  }

  // from android 15 the picker can show a real widget instead of a static image, which is what
  // ios does by running the provider for its gallery. Capped at two calls per hour per provider,
  // it returns false when the quota is spent and there is nothing to do about it
  private fun publishPreview(context: Context, manager: AppWidgetManager, rates: Map<String, Rate>) {
    if (Build.VERSION.SDK_INT < PREVIEW_SDK) {
      return
    }
    val preview = card(context, AppWidgetManager.INVALID_APPWIDGET_ID, rates) ?: return
    // it answers false when the two an hour are spent, and then the picker keeps the previous
    // one, which there is nothing to do about
    manager.setWidgetPreview(
      ComponentName(context, javaClass),
      AppWidgetProviderInfo.WIDGET_CATEGORY_HOME_SCREEN,
      views(context, preview, null),
    )
  }

  // widgetId is null for the picker preview, which has nothing to open
  // every text slot goes through here: drawn with our font on our side, sent as a bitmap, and
  // placed by the xml exactly where the TextView it replaces used to sit
  private fun RemoteViews.slot(
    context: Context,
    id: Int,
    text: String,
    sizeDp: Float,
    color: Int,
    wrap: Boolean = false,
    room: Int = 0,
    floor: Float = 1f,
  ) {
    setImageViewBitmap(id, TextBitmap.of(context, text, sizeDp, context.getColor(color), wrap, room, floor))
    // the slot is an image now, so without this talkback reads nothing where it used to read the
    // text. Only the square that sizes the card stays hidden, that one is decoration
    setContentDescription(id, text)
  }

  // a ceiling, never a layout. Sharing a row out is the LinearLayout job, done with the width it
  // really has, and that is the whole reason these are real views and not one drawn image.
  // Twice the card on purpose. What the host reports is not what it lays out, measured, one ui
  // says 166dp for a card it gives around 184, and a ceiling set at the reported width cuts text
  // that had room: a spread of two long rates measures just over the 166 and fits the 184.
  // The report can come up short, but not by half, so at twice the width nothing normal is ever
  // truncated and something pathological still is.
  // The picker preview has no widget to ask, so it falls back to the width this provider itself
  // declares as its minimum, which is ours and not a guess. Zero is never returned: it would read
  // as no ceiling, and a host reporting an odd width for a moment would turn the ceiling off
  // exactly when a narrow card needs it most
  private fun contentPx(context: Context, widgetId: Int?): Int {
    val manager = AppWidgetManager.getInstance(context)
    val reported = widgetId?.let { widthDp(manager.getAppWidgetOptions(it)) } ?: 0
    val card =
      if (reported > 0) {
        (reported * context.resources.displayMetrics.density).roundToInt()
      } else {
        manager
          .getInstalledProvidersForPackage(context.packageName, null)
          .firstOrNull { it.provider.className == javaClass.name }
          ?.minWidth ?: 0
      }
    // the padding comes from the same resource the layouts lay out, so the two cannot drift
    val padding = context.resources.getDimensionPixelSize(R.dimen.widget_padding)
    return CEILING * (card - 2 * padding)
  }

  // OPTION_APPWIDGET_SIZES first, which is the one android added in 12 for exactly this and the
  // one its guide points at: the older four extras describe a range and the same guide says
  // estimating from them "doesn't work in all situations", which is what we measured, one ui
  // reporting 166dp for a card it lays out near 184. The list can come back empty from a launcher
  // that does not fill it, and below 12 it does not exist, so the old extra stays as the fallback
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
    when (content) {
      null ->
        views.slot(
          context,
          R.id.widget_empty,
          context.getString(emptyText),
          Sizes.EMPTY,
          R.color.widget_foreground,
          wrap = true,
        )
      // the card slots are drawn here and travel as bitmaps, because the launcher would fall
      // back to a system font. The sizes are the ones the layout used to declare
      // every one of the five truncates and none of them shrinks, which is the ios card: five
      // Text with .lineLimit(1) and not one .minimumScaleFactor, the price included
      is Content.Card -> {
        val room = contentPx(context, widgetId)
        views.slot(context, R.id.widget_title, content.title, Sizes.TITLE, R.color.widget_foreground, room = room)
        views.slot(context, R.id.widget_detail, content.detail, Sizes.DETAIL, R.color.widget_secondary, room = room)
        views.slot(context, R.id.widget_small, content.small, Sizes.CHANGE, content.smallColor, room = room)
        views.slot(context, R.id.widget_big, content.big, Sizes.VALUE, content.bigColor, room = room)
        views.slot(context, R.id.widget_date, content.date, Sizes.DATE, R.color.widget_secondary, room = room)
      }
      is Content.Rows -> {
        val room = contentPx(context, widgetId)
        SLOTS.forEachIndexed { slot, ids ->
          val row = content.rows.getOrNull(slot)
          // a slot without a rate stays invisible and not gone, so the rows that do have one
          // keep their place. Invisible holds the size a view measured, and a row of ImageViews
          // with no bitmap measures nothing, so the blank one is filled with a space at the same
          // sizes: it is what ios does, two Text(" ") at 16 and 11 for every slot it is short
          val visibility = if (row == null) View.INVISIBLE else View.VISIBLE
          views.setViewVisibility(ids[0], visibility)
          views.setViewVisibility(ids[1], visibility)
          if (row == null) {
            views.slot(context, ids[2], " ", Sizes.ROW_NAME, R.color.widget_foreground)
            views.slot(context, ids[3], " ", Sizes.ROW_VALUE, R.color.widget_foreground)
            views.slot(context, ids[4], " ", Sizes.DATE, R.color.widget_secondary)
            views.slot(context, ids[5], " ", Sizes.ROW_CHANGE, R.color.widget_secondary)
          } else {
            // every one of the four is measured against the whole card and not against what the
            // one beside it left over. Working out a leftover meant trusting the width the
            // launcher reports, and one ui reports some 45px less than it lays the card out at,
            // so the sums came out short and cut a name that had room to spare. Sharing the row
            // is the LinearLayout job and it does it with the width it really has, which is the
            // whole reason these are real views and not one drawn image
            views.slot(
              context,
              ids[2],
              row.name,
              Sizes.ROW_NAME,
              R.color.widget_foreground,
              room = room,
              floor = SHRINK_FLOOR,
            )
            views.slot(context, ids[3], row.price, Sizes.ROW_VALUE, R.color.widget_foreground, room = room)
            views.slot(
              context,
              ids[4],
              row.date,
              Sizes.DATE,
              R.color.widget_secondary,
              room = room,
              floor = SHRINK_FLOOR,
            )
            views.slot(context, ids[5], row.change, Sizes.ROW_CHANGE, row.changeColor, room = room)
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

  // the app already declares the ambito-dolar scheme with VIEW and BROWSABLE. The ios widgets
  // open a universal link instead, which android would need a verified assetlinks for
  private fun openApp(context: Context, widgetId: Int, type: String?): PendingIntent {
    val uri = "ambito-dolar://rates" + if (type != null) "/$type" else ""
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(context.packageName)
    return PendingIntent.getActivity(
      context,
      widgetId,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  companion object {
    // how many cards wide a text may be before it is cut, see contentPx
    private const val CEILING = 2

    // where setWidgetPreview starts existing
    private const val PREVIEW_SDK = 35

    // the trigger the periodic work reports, shared with it so renaming one cannot leave the
    // other comparing against a string nobody sends any more, which is exactly what happened
    const val PERIODIC = "worker"

    // ios lets a name and a date give a tenth of their size before the ellipsis takes over, and
    // declares it on those two only, .minimumScaleFactor(0.9) in RateWidgets.swift
    private const val SHRINK_FLOOR = 0.9f

    private const val TAG = "AmbitoWidgets"

    // row container, meta container, name, price, date and change of each list slot
    private val SLOTS =
      listOf(
        intArrayOf(R.id.widget_row0, R.id.widget_meta0, R.id.widget_name0, R.id.widget_price0, R.id.widget_date0, R.id.widget_change0),
        intArrayOf(R.id.widget_row1, R.id.widget_meta1, R.id.widget_name1, R.id.widget_price1, R.id.widget_date1, R.id.widget_change1),
        intArrayOf(R.id.widget_row2, R.id.widget_meta2, R.id.widget_name2, R.id.widget_price2, R.id.widget_date2, R.id.widget_change2),
      )
  }
}
