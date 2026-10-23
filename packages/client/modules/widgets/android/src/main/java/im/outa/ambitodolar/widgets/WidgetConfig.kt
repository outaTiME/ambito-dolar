package im.outa.ambitodolar.widgets

import android.content.Context
import android.util.Log

// per widget settings, the defaults belong to each widget like the ios intents
object WidgetConfig {
  private const val PREFS = "ambito_widgets"
  const val DEFAULT_VALUE = "sell"

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun key(slot: Int, widgetId: Int) = "rate${slot}_$widgetId"

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

  // the last payload that parsed, the fallback after a reboot or an app update like ios getRates()
  fun lastPayload(context: Context): String? = prefs(context).getString("last_payload", null)

  // commit and not apply, already off the main thread and apply could die with the process
  fun setLastPayload(context: Context, body: String) {
    if (!prefs(context).edit().putString("last_payload", body).commit()) {
      Log.w(TAG, "the payload did not persist, a failed fetch will find no fallback")
    }
  }

  // a restore hands out new ids, and allowBackup false does not cover a device to device transfer
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
