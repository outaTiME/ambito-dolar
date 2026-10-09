//
//  LaunchAppIntent.swift
//  Ámbito Dólar
//
//  Created by Ariel Falduto on 14/07/2025.
//

// controls exist on ios only and this folder also reaches the watch app
#if os(iOS)
import AppIntents

@available(iOS 18.0, *)
struct LaunchAppIntent: ControlConfigurationIntent {
  static let title: LocalizedStringResource = "Ámbito Dólar"
  static let description = IntentDescription("Control para abrir la app desde el Centro de Control.")
  static let isDiscoverable = true
  static let openAppWhenRun = true
  @MainActor
  func perform() async throws -> some IntentResult & OpensIntent {
    return .result(opensIntent: OpenURLIntent(URL(string: "https://www.ambito-dolar.app/rates")!))
  }
}
#endif
