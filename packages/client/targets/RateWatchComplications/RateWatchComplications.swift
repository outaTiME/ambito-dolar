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

// the app icon, the corner also names the app
struct LaunchView: View {
  @Environment(\.widgetFamily) var family
  var body: some View {
    if family == .accessoryCorner {
      // the label already names the app
      Image(decorative: "AppWidgetIcon")
        .font(.title2)
        .widgetLabel("Ámbito Dólar")
    } else {
      ZStack {
        AccessoryWidgetBackground()
        Image("AppWidgetIcon", label: Text("Ámbito Dólar"))
          .font(.title2)
      }
    }
  }
}

// no widgetURL, a tap opens the app where it was left
@main
struct RateWatchComplications: Widget {
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
