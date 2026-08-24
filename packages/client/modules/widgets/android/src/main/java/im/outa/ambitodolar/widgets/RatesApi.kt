package im.outa.ambitodolar.widgets

import android.content.Context
import android.os.SystemClock
import android.util.Log
import java.io.IOException
import java.net.ConnectException
import java.net.HttpURLConnection
import java.net.URL
import java.net.UnknownHostException
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

  // enough to absorb the burst of three providers behind a service that is down, not enough to
  // sit on a failure once the network is back
  private const val FAILED_MS = 10_000L

  // measured over six updates on a real phone: the name lookup fails twice at around ten
  // milliseconds and the third try goes through, except once when it did not and the widget fell
  // back. So four attempts, waiting 800, 1600 and 2400 between them
  private const val ATTEMPTS = 4
  private const val RETRY_WAIT_MS = 800L

  // the sleeps alone are under five seconds, but a failure is only cheap when it comes back fast,
  // and nothing promises that. This caps the whole thing so a receiver, which gets about ten
  // seconds before it is killed, is never left waiting on a retry that will not make it
  private const val BUDGET_MS = 7_000L

  // an attempt never gets less than this, under it a connection is not worth opening, nor more
  // than this, which is all one attempt was ever allowed
  private const val MIN_TIMEOUT_MS = 1_000L

  private const val MAX_TIMEOUT_MS = 4_000L

  // characters, a couple of hundred times the payload the service really sends
  private const val MAX_BODY = 256 * 1024
  private var cached: Map<String, Rate>? = null

  // never, and not zero. elapsedRealtime counts from boot, so zero reads as a check made at boot
  // and the whole first minute of the phone answered from a cache that was never filled: no
  // request and not even the stored payload, right when a widget is coming back from a reboot
  private var checkedAt = Long.MIN_VALUE

  // every call to the service is counted and logged, so a run of adb logcat -s AmbitoWidgets
  // says how many went out and how many the cache absorbed. It resets when the process dies
  private var calls = 0

  @Synchronized
  fun fetch(context: Context): Map<String, Rate>? {
    // elapsed and not wall clock: the user moving the clock back would freeze the cache
    val now = SystemClock.elapsedRealtime()
    // a failure is held for less than an answer. Holding both the same meant that coming back
    // from no signal, the redraw that the network itself triggers found the failure still cached
    // and left the widget as it was for another minute
    val window = if (cached == null) FAILED_MS else CACHE_MS
    if (checkedAt != Long.MIN_VALUE && now - checkedAt < window) {
      Log.i(TAG, "rates from cache, ${(now - checkedAt) / 1000}s old, ${calls} calls so far")
      return cached
    }
    checkedAt = now
    calls++
    val started = SystemClock.elapsedRealtime()
    cached = request(context)
    Log.i(
      TAG,
      "call $calls to the service took ${SystemClock.elapsedRealtime() - started}ms, " +
        (cached?.let { "${it.size} rates" } ?: "failed"),
    )
    return cached
  }

  // a redraw that lands as the device wakes finds dns with no answer yet, throwing in
  // milliseconds instead of timing out, and the same call a moment later goes through. Only those
  // two classes are worth another go, a 4xx, a bad body or a timeout would repeat
  private fun request(context: Context): Map<String, Rate>? {
    val deadline = SystemClock.elapsedRealtime() + BUDGET_MS
    var attempt = 1
    while (true) {
      val left = deadline - SystemClock.elapsedRealtime()
      // an attempt that does not fit in what is left is not started. Without this the floor under
      // each timeout could hand a connection two more seconds than the budget had, which is the
      // budget promising something it does not keep
      if (left < 2 * MIN_TIMEOUT_MS) {
        break
      }
      try {
        fresh(context, left)?.let { return it }
        // it answered and parsed to nothing, which repeating would not change
        break
      } catch (e: Exception) {
        // the class and the message inline, a stack alone does not survive the logcat buffer
        Log.w(
          TAG,
          "rates fetch failed with ${e.javaClass.simpleName}: ${e.message}",
          e,
        )
        val transient = e is UnknownHostException || e is ConnectException
        val wait = RETRY_WAIT_MS * attempt
        if (attempt == ATTEMPTS ||
          !transient ||
          SystemClock.elapsedRealtime() + wait > deadline
        ) {
          break
        }
        Log.i(TAG, "attempt $attempt could not reach the service, retrying")
        Thread.sleep(wait)
        attempt++
      }
    }
    return last(context).also {
      Log.i(TAG, "fell back to the stored payload, " + (it?.let { r -> "${r.size} rates" } ?: "which is empty too"))
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

  // left is what is still inside the budget, and the caller does not come in here without at
  // least two timeouts worth of it. Before this the timeouts were a flat four seconds each and an
  // attempt starting near the deadline could run eight more, so the seven the budget promises
  // turned into fifteen and the receiver was killed at ten with nothing drawn
  private fun fresh(context: Context, left: Long): Map<String, Rate>? =
    run {
      val endpoint = context.getString(R.string.widget_api_url) + "/fetch"
      // connect and read run one after the other, so each gets half of what is left
      val timeout = (left / 2).coerceIn(MIN_TIMEOUT_MS, MAX_TIMEOUT_MS).toInt()
      val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
        connectTimeout = timeout
        readTimeout = timeout
      }
      try {
        // reading the status runs the request. Any 2xx is taken, which is what the ios getRates
        // does, and only the body decides whether it is usable. Anything else carries nothing
        // worth parsing, so it drops to the stored payload instead of throwing on an empty body
        if (connection.responseCode !in 200..299) {
          throw IOException("service answered ${connection.responseCode}")
        }
        // bounded. The endpoint is ours and the payload is around a kilobyte, but a bad deploy,
        // a proxy or a captive portal can answer anything, and readText takes all of it: the
        // string, the parser and the copy that goes to preferences all live at once, and an
        // OutOfMemoryError is an Error that no catch here would hold. The cap is a couple of
        // hundred times the real payload, so nothing valid ever reaches it
        val body =
          connection.inputStream.bufferedReader().use { reader ->
            val buffer = CharArray(MAX_BODY + 1)
            var read = 0
            // the clock is looked at in here too. A timeout only fires when nothing arrives, so a
            // service handing over a few characters at a time never trips it and the read runs as
            // long as it likes, which is the budget promising something the loop does not keep
            val until = SystemClock.elapsedRealtime() + left
            while (read < buffer.size) {
              if (SystemClock.elapsedRealtime() > until) {
                throw IOException("service took longer than the budget")
              }
              val n = reader.read(buffer, read, buffer.size - read)
              if (n < 0) {
                break
              }
              read += n
            }
            if (read > MAX_BODY) {
              throw IOException("service answered more than $MAX_BODY characters")
            }
            String(buffer, 0, read)
          }
        // a payload that parses to nothing is a failure, not an empty board. Treating it as
        // success would blank every widget that is showing good rates
        parse(JSONObject(body)).takeIf { it.isNotEmpty() }?.also {
          WidgetConfig.setLastPayload(context, body)
        }
      } finally {
        connection.disconnect()
      }
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
