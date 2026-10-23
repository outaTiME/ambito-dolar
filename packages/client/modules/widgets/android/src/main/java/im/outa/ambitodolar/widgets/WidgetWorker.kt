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

// not updatePeriodMillis, an alarm that fires without network under doze
class WidgetWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    // the shared redraw thread, and waiting on it makes RatesApi.usable visible here
    Widgets.EXECUTOR
      .submit { Widgets.ALL.forEach { it.renderNow(applicationContext, trigger = WidgetProvider.PERIODIC) } }
      .get()
    // retry re-checks the constraint and backs off on its own, no count of our own
    return if (RatesApi.usable) Result.success() else Result.retry()
  }

  companion object {
    // unique, enqueueing again finds the one already there
    private const val NAME = "widgets"

    // what the google widget sample uses, no flex because it makes a skipped period more likely
    private const val PERIOD_MIN = 30L

    // called from every redraw, so an app update puts it back
    fun schedule(context: Context) {
      val request =
        PeriodicWorkRequestBuilder<WidgetWorker>(PERIOD_MIN, TimeUnit.MINUTES)
          .setConstraints(
            Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
          )
          .build()
      // UPDATE carries a changed period to placed widgets and unlike REPLACE does not restart it
      WorkManager.getInstance(context)
        .enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
    }

    fun cancel(context: Context) {
      WorkManager.getInstance(context).cancelUniqueWork(NAME)
    }
  }
}
