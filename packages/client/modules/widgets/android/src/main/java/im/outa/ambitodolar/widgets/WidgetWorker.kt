package im.outa.ambitodolar.widgets

import android.content.Context
import android.util.Log
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
// so it waits for the maintenance window instead of burning the slot.
//
// WorkManager and not a JobScheduler of our own, which is what google points at for a widget that
// needs the network. The same thing was written by hand here once: unique periodic work, coming
// back after a reboot, the network constraint, cancelling, telling one run from the next, and a
// version stamp to notice a changed spec. All of that is what this class gets for free now
class WidgetWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    // through the same single thread every other redraw goes through, so a periodic run and a
    // broadcast never draw at once. Waiting on it is what keeps the worker alive until it is done
    Widgets.EXECUTOR
      .submit {
        Widgets.ALL.forEach {
          if (!isStopped) {
            it.renderNow(applicationContext, trigger = WidgetProvider.PERIODIC, alive = { !isStopped })
          }
        }
      }
      .get()
    // a fetch that fails already leaves the widgets as they were and falls back to the stored
    // payload, so there is nothing here worth asking WorkManager to retry sooner
    return Result.success()
  }

  companion object {
    private const val TAG = "AmbitoWidgets"

    // the name is the work: enqueueing it again finds the one already there instead of stacking
    private const val NAME = "widgets"

    // ios asks for 15 but widgetkit budgets it out to somewhere between 15 and 60, while work in
    // the active bucket runs close to what it says, so 30 is what lands on the same cadence
    private const val PERIOD_MIN = 30L

    // without a flex the run may land anywhere inside its period, which leaves two redraws up to
    // two periods apart. This pins it to the last third and keeps the cadence at 20 to 40
    private const val FLEX_MIN = 10L

    // called from every redraw, so an app update puts it back even if something dropped it. A
    // reboot is WorkManager's own business and it needs nothing from us for that
    fun schedule(context: Context) {
      val request =
        PeriodicWorkRequestBuilder<WidgetWorker>(
            PERIOD_MIN,
            TimeUnit.MINUTES,
            FLEX_MIN,
            TimeUnit.MINUTES,
          )
          .setConstraints(
            Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
          )
          .build()
      // UPDATE and not KEEP: a changed period or constraint reaches a widget that is already out
      // there, and unlike REPLACE it does not restart the period on every redraw, which would
      // push the next run away forever. Telling a live one from a stale one used to be a version
      // stamp of ours in the job extras, and it silently failed to deploy twice
      WorkManager.getInstance(context)
        .enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
      Log.i(TAG, "periodic work every $PERIOD_MIN min behind a network constraint")
    }

    fun cancel(context: Context) {
      WorkManager.getInstance(context).cancelUniqueWork(NAME)
      Log.i(TAG, "no widgets left, periodic work cancelled")
    }
  }
}
