//
//  RateWatchComplications.swift
//  Ámbito Dólar
//

import SwiftUI
import WidgetKit

// a launcher only, nothing to fetch, so one entry that never reloads
struct LaunchEntry: TimelineEntry {
  let date = Date()
}

struct LaunchProvider: TimelineProvider {
  func placeholder(in context: Context) -> LaunchEntry {
    LaunchEntry()
  }
  func getSnapshot(in context: Context, completion: @escaping (LaunchEntry) -> Void) {
    completion(LaunchEntry())
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<LaunchEntry>) -> Void) {
    completion(Timeline(entries: [LaunchEntry()], policy: .never))
  }
}

// the app icon on the slot background, scaled because the face caps a font in it
struct LaunchView: View {
  @Environment(\.widgetFamily) var family
  var body: some View {
    ZStack {
      AccessoryWidgetBackground()
      Image("AppWidgetIcon", label: Text("Ámbito Dólar"))
        .resizable()
        .scaledToFit()
        .scaleEffect(0.6)
        // the face draws the system launchers dimmer in the corner, white in the circle
        .opacity(family == .accessoryCorner ? 0.75 : 1)
    }
  }
}

// no widgetURL, a tap opens the app where it was left
struct LaunchComplication: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "LaunchComplication", provider: LaunchProvider()) { _ in
      LaunchView()
        .containerBackground(.clear, for: .widget)
    }
    .configurationDisplayName("Ámbito Dólar")
    .description("Complicación para abrir la app desde la esfera.")
    .supportedFamilies([.accessoryCircular, .accessoryCorner])
  }
}

@main
struct RateWatchComplications: WidgetBundle {
  var body: some Widget {
    LaunchComplication()
    if #available(watchOS 26.0, *) {
      LaunchControlWidget()
    }
  }
}
