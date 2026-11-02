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

// the app icon alone, scaled to the slot because the face caps a font in it
struct LaunchView: View {
  @Environment(\.widgetFamily) var family
  var body: some View {
    ZStack {
      if family == .accessoryCircular {
        AccessoryWidgetBackground()
      }
      Image("AppWidgetIcon", label: Text("Ámbito Dólar"))
        .resizable()
        .scaledToFit()
        .scaleEffect(family == .accessoryCorner ? 0.6 : 0.5)
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
