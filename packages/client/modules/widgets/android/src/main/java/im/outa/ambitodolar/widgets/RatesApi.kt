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
      // halved before adding, not added before halving: two values that are each fine on their
      // own can add up past what a double holds, and an infinite average would be drawn as a rate
      type == "average" -> buy / 2 + sell / 2
      else -> sell
    }
}

// the widget brings its own data, same as the ios one which does its own URLSession call
object RatesApi {
  private const val TAG = "AmbitoWidgets"

  // collapses bursts into one call, failures included so a down service is not hammered
  private const val CACHE_MS = 60_000L

  // a failure is held for less than an answer. Holding both the same meant that coming back from
  // no signal, the redraw the network itself triggers found the failure still cached and left the
  // widget as it was for another minute
  private const val FAILED_MS = 10_000L

  // connect and read each get this, and the read loop adds its own deadline, so the worst case is
  // connect plus the deadline plus one last blocking read, around three times this. The same four
  // the ios extension uses
  private const val TIMEOUT_MS = 4_000

  // characters, a couple of hundred times what the service really sends
  private const val MAX_BODY = 256 * 1024

  private const val BUFFER = 8 * 1024

  private var cached: Map<String, Rate>? = null

  // never, and not zero. elapsedRealtime counts from boot, so zero reads as a check made at boot
  // and the whole first minute of the phone answered from a cache that was never filled: no
  // request and not even the stored payload, right when a widget is coming back from a reboot
  private var checkedAt = Long.MIN_VALUE

  // whether the last call came back, which is not the same as whether there is something to
  // draw: a failed call still answers with the payload on disk, so the caller cannot tell one
  // from the other by the return value. Only the worker asks, to decide whether to retry
  var reached = true
    private set

  @Synchronized
  fun fetch(context: Context): Map<String, Rate>? {
    // elapsed and not wall clock: the user moving the clock back would freeze the cache
    val now = SystemClock.elapsedRealtime()
    // por si la ultima llamada salio bien y no por si hay algo que devolver: una llamada fallida
    // igual deja el payload de disco en cached, asi que mirar cached daba los 60 siempre y el
    // reintento del worker, que llega a los 30, volvia del cache sin tocar la red
    val window = if (reached) CACHE_MS else FAILED_MS
    if (checkedAt != Long.MIN_VALUE && now - checkedAt < window) {
      return cached
    }
    checkedAt = now
    val started = now
    cached = request(context)
    Log.i(
      TAG,
      "call to the service took ${SystemClock.elapsedRealtime() - started}ms, " +
        (cached?.let { "${it.size} rates" } ?: "failed"),
    )
    return cached
  }

  // one attempt and then the stored payload. A redraw that lands as the device wakes can find dns
  // with no answer yet and fail in milliseconds, and what comes back for that is WorkManager: it
  // is the periodic run that wakes into doze, and asking it to retry backs off on its own, waits
  // for the network constraint again and survives the process dying. A sleep in here did none of
  // that and spent the ten seconds the receiver had. The other triggers fire with the device awake
  // and fall back to the payload on disk, so they draw rates that are stale, never a blank card
  private fun request(context: Context): Map<String, Rate>? {
    try {
      fresh(context)?.let {
        reached = true
        return it
      }
      // it answered with nothing usable, which is a bad deploy or a proxy in the way, so it
      // counts as not reached and the worker gets to come back
      Log.w(TAG, "the service answered nothing usable")
    } catch (e: Exception) {
      // the class and the message inline, a stack alone does not survive the logcat buffer
      Log.w(TAG, "rates fetch failed with ${e.javaClass.simpleName}: ${e.message}", e)
    }
    reached = false
    return last(context).also {
      Log.i(
        TAG,
        "fell back to the stored payload, " +
          (it?.let { r -> "${r.size} rates" } ?: "which is empty too"),
      )
    }
  }

  // whatever the service left us with, as long as it parses to at least one rate
  private fun last(context: Context): Map<String, Rate>? =
    WidgetConfig.lastPayload(context)?.let {
      try {
        parse(JSONObject(it)).takeIf { rates -> rates.isNotEmpty() }
      } catch (e: Exception) {
        Log.w(TAG, "stored payload does not parse: ${e.javaClass.simpleName}: ${e.message}")
        null
      }
    }

  private fun fresh(context: Context): Map<String, Rate>? =
    run {
      val endpoint = context.getString(R.string.widget_api_url) + "/fetch"
      val connection =
        (URL(endpoint).openConnection() as HttpURLConnection).apply {
          connectTimeout = TIMEOUT_MS
          readTimeout = TIMEOUT_MS
        }
      try {
        // reading the status runs the request. Any 2xx is taken, which is what the ios getRates
        // does, and only the body decides whether it is usable. Anything else carries nothing
        // worth parsing, so it drops to the stored payload instead of throwing on an empty body
        if (connection.responseCode !in 200..299) {
          throw IOException("service answered ${connection.responseCode}")
        }
        val body = body(connection)
        // a payload that parses to nothing is a failure, not an empty board. Treating it as
        // success would blank every widget that is showing good rates
        parse(JSONObject(body)).takeIf { it.isNotEmpty() }?.also {
          WidgetConfig.setLastPayload(context, body)
        }
      } finally {
        connection.disconnect()
      }
    }

  // bounded in both size and time. readTimeout only fires when nothing arrives at all, so a
  // service handing over a few characters at a time never trips it and readText would run as
  // long as it likes on the one thread every redraw shares. The cap is a couple of hundred times
  // the real payload, and it is a cap and not a guess: an OutOfMemoryError is an Error that no
  // catch here would hold, so it would take the process down instead of failing the fetch
  private fun body(connection: HttpURLConnection): String {
    val deadline = SystemClock.elapsedRealtime() + TIMEOUT_MS
    val text = StringBuilder()
    val buffer = CharArray(BUFFER)
    connection.inputStream.bufferedReader().use { reader ->
      while (true) {
        if (SystemClock.elapsedRealtime() > deadline) {
          throw IOException("service took longer than $TIMEOUT_MS ms to answer")
        }
        val read = reader.read(buffer)
        if (read < 0) {
          break
        }
        text.append(buffer, 0, read)
        if (text.length > MAX_BODY) {
          throw IOException("service answered more than $MAX_BODY characters")
        }
      }
    }
    return text.toString()
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
          val buy = value.optDouble(0)
          val sell = value.optDouble(1)
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
