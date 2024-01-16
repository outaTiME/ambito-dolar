import ExpoModulesCore
import WidgetKit

public class ExpoWidgetKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoWidgetKit")

    Function("reloadAllTimelines") { () in
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}

