package im.outa.ambitodolar.widgets

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// what reloadAllTimelines is on ios, and the providers are called directly because
// APPWIDGET_UPDATE is protected and an app cannot send it
class AmbitoWidgetsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AmbitoWidgets")

    Function("reloadWidgets") {
      // the redraw outlives the call, so it holds the application context and not the activity
      appContext.reactContext?.applicationContext?.let { context ->
        Widgets.ALL.forEach { it.refresh(context) }
      }
    }
  }
}
