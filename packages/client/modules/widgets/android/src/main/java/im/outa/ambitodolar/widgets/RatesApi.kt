package im.outa.ambitodolar.widgets

import android.content.Context
import android.os.SystemClock
import android.util.Log
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

// [timestamp, value, change, previous] as the service sends it, value a number or a [buy, sell] pair
// only the markets read the previous value
data class Rate(
  val timestamp: String,
  val buy: Double?,
  val sell: Double,
  val change: Double,
  val close: Double? = null,
) {
  fun value(type: String): Double =
    when {
      buy == null -> sell
      type == "buy" -> buy
      // halved before adding so it cannot overflow
      type == "average" -> buy / 2 + sell / 2
      else -> sell
    }
}

// the widget fetches on its own like the ios URLSession call
object RatesApi {
  // collapses a burst into one call, under WorkManager's 30s backoff or a retry reads stale data as success
  private const val CACHE_MS = 10_000L

  // connect and read each, the four seconds of the ios extension
  private const val TIMEOUT_MS = 4_000

  // characters and not bytes, far above any real payload, a runaway body would raise an OutOfMemoryError no catch here holds
  private const val MAX_BODY = 256 * 1024

  // only replaced by another call that came back, so a failure never takes rates off a widget
  private var cached: Map<String, Rate>? = null

  // elapsed and not wall clock, moving the clock back would freeze the cache
  private var nextCallAt = 0L

  // whether the last call came back, a failed one still answers with the cache, only the worker asks
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
    // disk only when this process never got an answer, like the ios getRates()
    return cached ?: last(context)
  }

  // one attempt, the retry is WorkManager's
  private fun request(context: Context): Map<String, Rate>? =
    try {
      val endpoint = context.getString(R.string.widget_api_url).trimEnd('/') + "/fetch"
      val connection =
        (URL(endpoint).openConnection() as HttpURLConnection).apply {
          connectTimeout = TIMEOUT_MS
          readTimeout = TIMEOUT_MS
        }
      try {
        // any 2xx like the ios getRates, the body decides whether it is usable
        if (connection.responseCode !in 200..299) {
          throw IOException("service answered ${connection.responseCode}")
        }
        val body = body(connection)
        // a payload that parses to nothing is a failure, so the worker comes back
        parse(JSONObject(body)).takeIf { it.isNotEmpty() }?.also {
          WidgetConfig.setLastPayload(context, body)
        }
      } finally {
        connection.disconnect()
      }
    } catch (e: Exception) {
      // inline, a stack alone does not survive the logcat buffer
      Log.w(TAG, "rates fetch failed with ${e.javaClass.simpleName}: ${e.message}", e)
      null
    }

  private fun last(context: Context): Map<String, Rate>? =
    WidgetConfig.lastPayload(context)?.let {
      try {
        parse(JSONObject(it)).takeIf { rates -> rates.isNotEmpty() }
      } catch (e: Exception) {
        null
      }
    }

  // capped by MAX_BODY, the timeouts cover each stalled read like the google samples
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
      // an unparsable timestamp would draw a blank date and be persisted as the last good payload
      val timestamp = stat.optString(0).takeIf { Format.instant(it) != null } ?: continue
      // a missing change is NaN and drops the rate instead of drawing a blue zero
      val change = stat.optDouble(2).takeIf { it.isFinite() } ?: continue
      // a missing or non numeric value would render NaN as text
      when (val value = stat.opt(1)) {
        is JSONArray -> {
          // opt and not optDouble, which coerces a numeric string where ios requires NSNumber
          val buy = (value.opt(0) as? Number)?.toDouble() ?: Double.NaN
          val sell = (value.opt(1) as? Number)?.toDouble() ?: Double.NaN
          if (buy.isFinite() && sell.isFinite()) {
            rates[type] = Rate(timestamp, buy, sell, change)
          }
        }
        is Number ->
          value.toDouble().takeIf { it.isFinite() }?.let {
            rates[type] = Rate(timestamp, null, it, change, stat.optDouble(3).takeIf { it.isFinite() })
          }
      }
    }
    return rates
  }
}
