package im.outa.ambitodolar.widgets

import android.content.Context
import android.os.SystemClock
import android.util.Log
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

// one rate as the service sends it: [timestamp, value, change, previous], where value is either a
// number or a [buy, sell] pair
data class Rate(val timestamp: String, val buy: Double?, val sell: Double, val change: Double) {
  val hasPair: Boolean
    get() = buy != null

  fun value(type: String): Double =
    when {
      buy == null -> sell
      type == "buy" -> buy
      // halved before adding, which cannot overflow the way adding first can
      type == "average" -> buy / 2 + sell / 2
      else -> sell
    }
}

// the widget brings its own data, same as the ios one which does its own URLSession call
object RatesApi {
  // collapses a burst into one call, the three providers of a periodic run included. Counted from
  // the start of the request, so it is not a guarantee, only what a burst takes. Has to stay under
  // WorkManager's 30s minimum backoff or the first retry lands inside it and reports success on
  // stale data without asking the service
  private const val CACHE_MS = 10_000L

  // connect and read each get this, the same four the ios extension uses
  private const val TIMEOUT_MS = 4_000

  // characters and not bytes, a couple of hundred times what the service sends. A cap and not a
  // guess: an OutOfMemoryError is an Error no catch here would hold, so a runaway body would take
  // the process down instead of failing the fetch
  private const val MAX_BODY = 256 * 1024

  // the last call that came back, only ever replaced by another one that came back: nothing a
  // failed call finds can take rates off a widget
  private var cached: Map<String, Rate>? = null

  // elapsed and not wall clock: the user moving the clock back would freeze the cache
  private var nextCallAt = 0L

  // whether the last call produced rates worth keeping, which is not whether there is something
  // to draw: a call that failed still answers with what is cached or stored. Only the worker asks
  var usable = true
    private set

  @Synchronized
  fun fetch(context: Context): Map<String, Rate>? {
    val now = SystemClock.elapsedRealtime()
    if (now >= nextCallAt) {
      val fresh = request(context)
      usable = fresh != null
      nextCallAt = now + CACHE_MS
      Log.i(TAG, "fetch took ${SystemClock.elapsedRealtime() - now}ms, ${fresh?.size ?: "failed"}")
      fresh?.let { cached = it }
    }
    // the stored payload is only reached when this process never got an answer, which is a reboot
    // or an app update. The ios getRates() falls back the same way
    return cached ?: last(context)
  }

  // one attempt, null when it did not come back. The retry is WorkManager's
  private fun request(context: Context): Map<String, Rate>? =
    try {
      val endpoint = context.getString(R.string.widget_api_url) + "/fetch"
      val connection =
        (URL(endpoint).openConnection() as HttpURLConnection).apply {
          connectTimeout = TIMEOUT_MS
          readTimeout = TIMEOUT_MS
        }
      try {
        // reading the status runs the request. Any 2xx is taken, which is what the ios getRates
        // does, and only the body decides whether it is usable
        if (connection.responseCode !in 200..299) {
          throw IOException("service answered ${connection.responseCode}")
        }
        val body = body(connection)
        // a payload that parses to nothing is a failure and not an empty board, so the worker
        // gets to come back
        parse(JSONObject(body)).takeIf { it.isNotEmpty() }?.also {
          WidgetConfig.setLastPayload(context, body)
        }
      } finally {
        connection.disconnect()
      }
    } catch (e: Exception) {
      // the class and the message inline, a stack alone does not survive the logcat buffer
      Log.w(TAG, "rates fetch failed with ${e.javaClass.simpleName}: ${e.message}", e)
      null
    }

  // whatever the service left us with, as long as it parses to at least one rate
  private fun last(context: Context): Map<String, Rate>? =
    WidgetConfig.lastPayload(context)?.let {
      try {
        parse(JSONObject(it)).takeIf { rates -> rates.isNotEmpty() }
      } catch (e: Exception) {
        null
      }
    }

  // capped, for the Error above. Time is bounded by connectTimeout and readTimeout, each of which
  // covers one stalled read rather than the whole response, which is what every google sample does
  private fun body(connection: HttpURLConnection): String =
    connection.inputStream.bufferedReader().use { reader ->
      val text = StringBuilder()
      val buffer = CharArray(8 * 1024)
      while (text.length <= MAX_BODY) {
        val read = reader.read(buffer)
        if (read < 0) {
          return text.toString()
        }
        text.append(buffer, 0, read)
      }
      throw IOException("service answered more than $MAX_BODY characters")
    }

  private fun parse(json: JSONObject): Map<String, Rate> {
    val rates = mutableMapOf<String, Rate>()
    for (type in json.keys()) {
      if (!Format.isKnown(type)) {
        continue
      }
      val stat = json.optJSONArray(type) ?: continue
      // a timestamp that does not parse would render as a blank date and, worse, get persisted
      // as the last good payload
      val timestamp = stat.optString(0).takeIf { Format.instant(it) != null } ?: continue
      // no default: a missing change comes back as NaN and the finite check drops the rate,
      // instead of drawing a blue zero that reads as a rate that did not move
      val change = stat.optDouble(2).takeIf { it.isFinite() } ?: continue
      // a missing or non numeric value comes back as NaN and would render as the literal text
      when (val value = stat.opt(1)) {
        is JSONArray -> {
          // opt(n) and not optDouble: optDouble coerces a numeric string and the scalar branch
          // below does not, so a pair of strings was kept while a single one was dropped. ios
          // requires NSNumber on both and is the reference
          val buy = (value.opt(0) as? Number)?.toDouble() ?: Double.NaN
          val sell = (value.opt(1) as? Number)?.toDouble() ?: Double.NaN
          if (buy.isFinite() && sell.isFinite()) {
            rates[type] = Rate(timestamp, buy, sell, change)
          }
        }
        is Number ->
          value.toDouble().takeIf { it.isFinite() }?.let {
            rates[type] = Rate(timestamp, null, it, change)
          }
      }
    }
    return rates
  }
}
