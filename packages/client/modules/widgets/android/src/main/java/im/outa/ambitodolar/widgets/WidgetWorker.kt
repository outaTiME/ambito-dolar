package im.outa.ambitodolar.widgets

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

// updatePeriodMillis is an alarm and an alarm fires whether or not the app has network, while
// doze suspends network for an idle app, which is why those redraws died in milliseconds without
// a round trip. Work behind a network constraint does not run until the app really has network,
// which is what google points a widget that needs the network at
class WidgetWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    // through the same single thread every other redraw goes through, so a periodic run and a
    // broadcast never draw at once. Waiting on it holds the worker until the redraw is done, and
    // it is also what makes the flag below visible on this thread
    Widgets.EXECUTOR
      .submit { Widgets.ALL.forEach { it.renderNow(applicationContext, trigger = WidgetProvider.PERIODIC) } }
      .get()
    // retry re-evaluates the constraint before running again and backs off on its own, 30s and
    // doubling up to five hours, so this already means come back when there is network and it
    // survives the process dying. There is no count of our own: the backoff is the throttle
    return if (RatesApi.usable) Result.success() else Result.retry()
  }

  companion object {
    // the name is the work: enqueueing it again finds the one already there instead of stacking
    private const val NAME = "widgets"

    // ios asks for 15 but widgetkit budgets it out to somewhere between 15 and 60, and 30 is what
    // the google widget sample uses. No flex: it narrows the window a constrained run has to land
    // in, so it makes a skipped period more likely, not less
    private const val PERIOD_MIN = 30L

    // called from every redraw, so an app update puts it back even if something dropped it
    fun schedule(context: Context) {
      val request =
        PeriodicWorkRequestBuilder<WidgetWorker>(PERIOD_MIN, TimeUnit.MINUTES)
          .setConstraints(
            Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
          )
          .build()
      // UPDATE and not KEEP: a changed period or constraint reaches a widget that is already out
      // there, and unlike REPLACE it does not restart the period on every redraw, which would
      // push the next run away forever
      WorkManager.getInstance(context)
        .enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
    }

    fun cancel(context: Context) {
      WorkManager.getInstance(context).cancelUniqueWork(NAME)
    }
  }
}
