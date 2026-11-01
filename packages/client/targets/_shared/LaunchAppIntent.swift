//
//  LaunchAppIntent.swift
//  Ámbito Dólar
//
//  Created by Ariel Falduto on 14/07/2025.
//

import AppIntents
import SwiftUI
import WidgetKit

// a control runs on its own device, so the phone and the watch each have one with the same face
@available(iOS 18.0, watchOS 26.0, *)
struct LaunchControlWidget: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "com.ambitodolar.controlwidget.launch") {
      ControlWidgetButton(action: LaunchAppIntent()) {
        Label("Ámbito Dólar", image: "AppWidgetIcon")
      }
    }
    .displayName("Ámbito Dólar")
    .description("Control para abrir la app desde el Centro de Control.")
  }
}

#if os(iOS)
@available(iOS 18.0, *)
struct LaunchAppIntent: ControlConfigurationIntent {
  static let title: LocalizedStringResource = "Ámbito Dólar"
  static let description = IntentDescription("Control para abrir la app desde el Centro de Control.")
  static let isDiscoverable = false
  static let openAppWhenRun = true
  @MainActor
  func perform() async throws -> some IntentResult & OpensIntent {
    return .result(opensIntent: OpenURLIntent(URL(string: "https://www.ambito-dolar.app/rates")!))
  }
}
#elseif os(watchOS)
// opens the watch app where it was left, like the complication
@available(watchOS 26.0, *)
struct LaunchAppIntent: AppIntent {
  static let title: LocalizedStringResource = "Ámbito Dólar"
  static let isDiscoverable = false
  static let supportedModes: IntentModes = .foreground
  func perform() async throws -> some IntentResult {
    .result()
  }
}
#endif
