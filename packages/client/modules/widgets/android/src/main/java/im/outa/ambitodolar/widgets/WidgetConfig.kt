package im.outa.ambitodolar.widgets

import android.content.Context
import android.util.Log

// per widget instance settings. What the defaults are belongs to each widget, the same way the
// ios intents carry their own default values
object WidgetConfig {
  private const val TAG = "AmbitoWidgets"

  private const val PREFS = "ambito_widgets"
  const val DEFAULT_VALUE = "sell"

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  // slot zero keeps the plain key, so a widget configured before the second slot existed reads back
  private fun key(slot: Int, widgetId: Int) =
    if (slot == 0) "rate_$widgetId" else "rate${slot}_$widgetId"

  fun rateType(context: Context, widgetId: Int, slot: Int, default: String): String =
    prefs(context).getString(key(slot, widgetId), default) ?: default

  fun setRateType(context: Context, widgetId: Int, slot: Int, type: String) {
    prefs(context).edit().putString(key(slot, widgetId), type).apply()
  }

  fun valueType(context: Context, widgetId: Int): String =
    prefs(context).getString("value_$widgetId", DEFAULT_VALUE) ?: DEFAULT_VALUE

  fun setValueType(context: Context, widgetId: Int, value: String) {
    prefs(context).edit().putString("value_$widgetId", value).apply()
  }

  // the last payload that parsed, so a widget re-inflated after a reboot or an app update whose
  // first call fails still has something to draw. The ios getRates() falls back the same way
  fun lastPayload(context: Context): String? = prefs(context).getString("last_payload", null)

  // commit and not apply: this is the fallback the widget draws from when a fetch fails, so it
  // is worth the synchronous write. We are already on the goAsync executor, off the main thread,
  // and apply would only promise the value in memory, which dies with the process
  fun setLastPayload(context: Context, body: String) {
    if (!prefs(context).edit().putString("last_payload", body).commit()) {
      Log.w(TAG, "the payload did not persist, a failed fetch will find no fallback")
    }
  }

  // a restore hands the widgets new ids, so what was saved under the old ones has to move or the
  // widget comes back on its defaults and the old keys stay forever. Android gives the mapping in
  // onRestored and this is the only chance to use it.
  // allowBackup is false, which used to mean this could never run, but from android 12 that flag
  // stopped covering a device to device transfer: that one is dataExtractionRules and there is
  // none here, so the default applies and the widgets do come across
  fun move(context: Context, from: Int, to: Int, slots: Int) {
    val prefs = prefs(context)
    val editor = prefs.edit()
    repeat(slots) { slot ->
      prefs.getString(key(slot, from), null)?.let { editor.putString(key(slot, to), it) }
      editor.remove(key(slot, from))
    }
    prefs.getString("value_$from", null)?.let { editor.putString("value_$to", it) }
    editor.remove("value_$from")
    editor.apply()
  }

  fun clear(context: Context, widgetId: Int, slots: Int) {
    val editor = prefs(context).edit().remove("value_$widgetId")
    repeat(slots) { editor.remove(key(it, widgetId)) }
    editor.apply()
  }
}
