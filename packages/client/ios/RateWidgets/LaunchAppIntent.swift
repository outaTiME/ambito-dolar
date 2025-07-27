//
//  LaunchAppIntent.swift
//  Ámbito Dólar
//
//  Created by Ariel Falduto on 14/07/2025.
//

import AppIntents
// import SwiftUICore

@available(iOS 18.0, *)
struct LaunchAppIntent: ControlConfigurationIntent {
  static let title: LocalizedStringResource = "Ámbito Dólar"
  static let description = IntentDescription("Control para abrir la app desde el Centro de Control.")
  static let isDiscoverable = true
  static let openAppWhenRun = true
  @MainActor
  func perform() async throws -> some IntentResult & OpensIntent {
    // https://stackoverflow.com/a/78978941
    // EnvironmentValues().openURL(URL(string: "ambito-dolar://rates")!)
    // return .result(opensIntent: OpenURLIntent(URL(string: "ambito-dolar://rates")!))
    return .result(opensIntent: OpenURLIntent(URL(string: "https://ambito-dolar.app/rates")!))
  }
}

