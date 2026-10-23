package im.outa.ambitodolar.widgets

import java.util.concurrent.Executors

// one tag for the whole module, which is what adb logcat AmbitoWidgets:I *:S filters on
internal const val TAG = "AmbitoWidgets"

// every redraw shares one thread so bursts never overlap
object Widgets {
  val EXECUTOR = Executors.newSingleThreadExecutor()

  val ALL = listOf(RateWidget(), ListWidget(), SpreadWidget(), MarketWidget(), MarketListWidget())
}
