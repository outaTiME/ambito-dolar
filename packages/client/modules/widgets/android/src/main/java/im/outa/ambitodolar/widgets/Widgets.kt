package im.outa.ambitodolar.widgets

import java.util.concurrent.Executors

// one tag for the whole module, which is what adb logcat AmbitoWidgets:I *:S filters on
internal const val TAG = "AmbitoWidgets"

// the providers cannot be looked up by class alone, the config screen only knows the name the
// launcher gave it, and every redraw shares one thread so bursts never overlap
object Widgets {
  val EXECUTOR = Executors.newSingleThreadExecutor()

  val ALL = listOf(RateWidget(), ListWidget(), SpreadWidget())

  fun byName(className: String?): WidgetProvider? = ALL.firstOrNull { it.javaClass.name == className }
}
