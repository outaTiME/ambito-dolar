//
//  RateWidgets.swift
//  Ámbito Dólar
//
//  Created by outaTiME on 27/09/2022.
//

import WidgetKit
import SwiftUI
import AppIntents

// the widgets reload together, inside the window the first request serves the rest with live rates
private let ratesCacheWindow: TimeInterval = 60

// rates or markets on the same views like the app, the raw value is the route the widget opens
enum WidgetKind: String {
  case rates
  case markets
  var unavailable: String {
    self == .rates ? "Cotización no disponible" : "Indicador no disponible"
  }
  var unavailablePlural: String {
    self == .rates ? "Cotizaciones no disponibles" : "Indicadores no disponibles"
  }
}

private func getWidgetUrl(_ kind: WidgetKind = .rates, id: String? = nil) -> URL? {
  if let id = id {
    return URL(string: "https://www.ambito-dolar.app/\(kind.rawValue)/" + id)
  }
  return URL(string: "https://www.ambito-dolar.app/\(kind.rawValue)")
}

private let placeholderPrice: Double = 1000

// synchronous and never on the network, Apple asks it to return immediately
// painted until the first timeline lands, so it never comes back empty after an install
// equal non zero prices, the spread widget divides one by the other
private func placeholderEntry(rateTypes: [RateType]) -> SimpleEntry {
  let stored = lookupRateValues(rates: storedRates(), rateTypes: rateTypes)
  if !stored.isEmpty {
    return SimpleEntry(date: Date(), rates: stored)
  }
  let rates = rateTypes.map { rateType in
    RateValue(
      id: rateType.id,
      name: rateType.short ?? rateType.displayString,
      change: formatRateChange(num: 0, percent: true),
      plainChange: formatRateChange(num: 0, percent: true, symbol: false),
      changeColor: getChangeColor(num: 0),
      changeValue: 0,
      price: formatRateCurrency(num: placeholderPrice),
      priceValue: placeholderPrice,
      date: "",
      dateValue: 0
    )
  }
  return SimpleEntry(date: Date(), rates: rates)
}

// https://developer.apple.com/documentation/uikit/uicolor/ui_element_colors
private let fgColor = Color(UIColor.label)
private let fgSecondaryColor = Color(UIColor.secondaryLabel)

struct SimpleEntry: TimelineEntry {
  let date: Date
  let rates: [RateValue]
}

extension View {
  func widgetBackground() -> some View {
    containerBackground(Color.black, for: .widget)
  }
  // the frame, padding, tap target and background of every system widget
  func card(_ url: URL?, alignment: Alignment = .center) -> some View {
    frame(maxWidth: .infinity, maxHeight: .infinity, alignment: alignment)
      .padding(16)
      .widgetURL(url)
      .widgetBackground()
  }
}

private func unavailable(_ text: String, url: URL?) -> some View {
  Text(text)
    .font(.custom(fontName, size: 14))
    .foregroundColor(fgColor)
    .multilineTextAlignment(.center)
    .card(url)
}

private func circularUnavailable(url: URL?) -> some View {
  ZStack {
    AccessoryWidgetBackground()
    Text("N/D")
      .font(.custom(fontName, size: 13))
      .lineLimit(1)
      .widgetAccentable()
      .padding(.horizontal, 2)
  }
  .widgetURL(url)
  .widgetBackground()
}

// one provider for every widget, the intent says which types and how to show them
struct RateTypesProvider<Intent: RateTypesIntent>: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    placeholderEntry(rateTypes: Intent.defaultTypes)
  }
  func snapshot(for configuration: Intent, in context: Context) async -> SimpleEntry {
    let rates = lookupRateValues(rates: await getRates(cacheWindow: ratesCacheWindow), rateTypes: configuration.types, valueType: configuration.valueType)
    return SimpleEntry(date: Date(), rates: rates)
  }
  func timeline(for configuration: Intent, in context: Context) async -> Timeline<SimpleEntry> {
    let date = Date()
    let rates = lookupRateValues(rates: await getRates(cacheWindow: ratesCacheWindow), rateTypes: configuration.types, valueType: configuration.valueType)
    let entry = SimpleEntry(date: date, rates: rates)
    let reloadDate = Calendar.current.date(byAdding: .minute, value: 15, to: date)!
    return Timeline(entries: [entry], policy: .after(reloadDate))
  }
}

struct RateWidgetEntryView : View {
  @Environment(\.widgetFamily) var widgetFamily
  let entry: SimpleEntry
  var kind = WidgetKind.rates
  var body: some View {
    let rates = entry.rates
    switch widgetFamily {
    case .accessoryCircular:
      if let rate = rates.first {
        ZStack {
          AccessoryWidgetBackground()
          VStack {
            Text(rate.name)
              .font(.custom(fontName, size: 10))
              .lineLimit(1)
              .padding(.horizontal, 8)
            Text(rate.price)
              .font(.custom(fontName, size: 13))
              .lineLimit(1)
              .contentTransition(.numericText(value: rate.priceValue))
              .padding(.horizontal, 2)
              .widgetAccentable()
            Text(rate.plainChange)
              .font(.custom(fontName, size: 10))
              .lineLimit(1)
              .contentTransition(.numericText(value: rate.changeValue))
              .padding(.horizontal, 8)
          }
        }
        .widgetURL(getWidgetUrl(kind, id: rate.id))
        .widgetBackground()
      } else {
        circularUnavailable(url: getWidgetUrl(kind))
      }
    default:
      if let rate = rates.first {
        VStack(alignment: .leading) {
          Text(rate.name)
            .font(.custom(fontName, size: 20))
            .foregroundColor(fgColor)
            .lineLimit(1)
          if let detail = rate.detail {
            Text(detail)
              .font(.custom(fontName, size: 14))
              .foregroundColor(fgSecondaryColor)
              .lineLimit(1)
          }
          Spacer()
          Text(rate.change)
            .font(.custom(fontName, size: 14))
            .foregroundColor(rate.changeColor)
            .lineLimit(1)
            .contentTransition(.numericText(value: rate.changeValue))
          Text(rate.price)
            .font(.custom(fontName, size: 26))
            .foregroundColor(fgColor)
            .lineLimit(1)
            .contentTransition(.numericText(value: rate.priceValue))
          Text(rate.date)
            .font(.custom(fontName, size: 11))
            .foregroundColor(fgSecondaryColor)
            .lineLimit(1)
            .contentTransition(.numericText(value: rate.dateValue))
        }
        .card(getWidgetUrl(kind, id: rate.id), alignment: .topLeading)
      } else {
        unavailable(kind.unavailable, url: getWidgetUrl(kind))
      }
    }
  }
}

struct RateWidget: Widget {
  let kind: String = "RateWidget"
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectRateTypeIntent.self, provider: RateTypesProvider<SelectRateTypeIntent>()) { entry in
      RateWidgetEntryView(entry: entry)
        .environment(\.colorScheme, .dark)
        .environment(\.sizeCategory, .large)
    }
    .configurationDisplayName("Cotizaciones")
    .description("Consultá las cotizaciones a lo largo del día.")
    .supportedFamilies([.systemSmall, .accessoryCircular])
    .contentMarginsDisabled()
  }
}

struct ListRatesWidgetEntryView : View {
  let entry: SimpleEntry
  var kind = WidgetKind.rates
  var body: some View {
    let rates = entry.rates
    if !rates.isEmpty {
      VStack(alignment: .leading) {
        ForEach(rates) { rate in
          HStack {
            Text(rate.name)
              .font(.custom(fontName, size: 14))
              .foregroundColor(fgColor)
              .lineLimit(1)
            Spacer()
            Text(rate.price)
              .font(.custom(fontName, size: 16))
              .foregroundColor(fgColor)
              .lineLimit(1)
              .contentTransition(.numericText(value: rate.priceValue))
          }
          HStack {
            Text(rate.date)
              .font(.custom(fontName, size: 11))
              .foregroundColor(fgSecondaryColor)
              .lineLimit(1)
              .contentTransition(.numericText(value: rate.dateValue))
            Spacer()
            Text(rate.change)
              .font(.custom(fontName, size: 11))
              .foregroundColor(rate.changeColor)
              .lineLimit(1)
              .contentTransition(.numericText(value: rate.changeValue))
          }
          if rate != rates.last {
            Spacer()
          } else {
            if (rates.count < 3) {
              // complete the remaining slots
              ForEach(0..<3-rates.count, id: \.self) { _ in
                Spacer()
                Text(" ")
                  .font(.custom(fontName, size: 16))
                  .lineLimit(1)
                Text(" ")
                  .font(.custom(fontName, size: 11))
                  .lineLimit(1)
              }
            }
          }
        }
      }
      .card(getWidgetUrl(kind), alignment: .topLeading)
    } else {
      unavailable(kind.unavailablePlural, url: getWidgetUrl(kind))
    }
  }
}

struct ListRatesWidget: Widget {
  let kind: String = "ListRatesWidget"
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectRateTypesIntent.self, provider: RateTypesProvider<SelectRateTypesIntent>()) { entry in
      ListRatesWidgetEntryView(entry: entry)
        .environment(\.colorScheme, .dark)
        .environment(\.sizeCategory, .large)
    }
    .configurationDisplayName("Lista de cotizaciones")
    .description("Consultá las cotizaciones a lo largo del día.")
    .supportedFamilies([.systemSmall])
    .contentMarginsDisabled()
  }
}

struct SpreadWidgetEntryView : View {
  @Environment(\.widgetFamily) var widgetFamily
  let entry: SimpleEntry
  var body: some View {
    let rates = entry.rates
    // a rate that stopped coming back leaves the array short and a subscript would trap
    let firstRate = rates.first
    let secondRate = rates.dropFirst().first
    var spreadRate: RateValue? {
      guard let firstRate, let secondRate else {
        return nil
      }
      let value = firstRate.priceValue - secondRate.priceValue
      let rateChange = (firstRate.priceValue / secondRate.priceValue - 1) * 100
      // the spread renders no arrow on either layout, so both carry the plain form
      let plainChange = formatRateChange(num: rateChange, percent: true, symbol: false)
      let latest = firstRate.dateValue > secondRate.dateValue ? firstRate : secondRate
      return RateValue(
        id: "spread",
        name: "Brecha",
        detail: "\(firstRate.name) → \(secondRate.name)",
        change: plainChange,
        plainChange: plainChange,
        changeColor: getChangeColor(num: rateChange),
        changeValue: rateChange,
        price: formatRateChange(num: value, symbol: false),
        priceValue: value,
        date: latest.date,
        dateValue: latest.dateValue
      )
    }
    switch widgetFamily {
    case .accessoryCircular:
      if let spreadRate, let firstRate {
        ZStack {
          AccessoryWidgetBackground()
          VStack {
            Text(spreadRate.name)
              .font(.custom(fontName, size: 10))
              .lineLimit(1)
              .padding(.horizontal, 8)
            Text(spreadRate.plainChange)
              .font(.custom(fontName, size: 13))
              .lineLimit(1)
              .contentTransition(.numericText(value: spreadRate.changeValue))
              .padding(.horizontal, 2)
              .widgetAccentable()
            Text(spreadRate.price)
              .font(.custom(fontName, size: 10))
              .lineLimit(1)
              .contentTransition(.numericText(value: spreadRate.priceValue))
              .padding(.horizontal, 8)
          }
        }
        .widgetURL(getWidgetUrl(id: firstRate.id))
        .widgetBackground()
      } else {
        circularUnavailable(url: getWidgetUrl())
      }
    default:
      if let spreadRate, let firstRate {
        VStack(alignment: .leading) {
          Text(spreadRate.name)
            .font(.custom(fontName, size: 20))
            .foregroundColor(fgColor)
            .lineLimit(1)
          if let detail = spreadRate.detail {
            Text(detail)
              .font(.custom(fontName, size: 14))
              .foregroundColor(fgSecondaryColor)
              .lineLimit(1)
          }
          Spacer()
          Text(spreadRate.price)
            .font(.custom(fontName, size: 14))
            .foregroundColor(fgColor)
            .lineLimit(1)
            .contentTransition(.numericText(value: spreadRate.priceValue))
          Text(spreadRate.plainChange)
            .font(.custom(fontName, size: 26))
            .foregroundColor(spreadRate.changeColor)
            .lineLimit(1)
            .contentTransition(.numericText(value: spreadRate.changeValue))
          Text(spreadRate.date)
            .font(.custom(fontName, size: 11))
            .foregroundColor(fgSecondaryColor)
            .lineLimit(1)
            .contentTransition(.numericText(value: spreadRate.dateValue))
        }
        .card(getWidgetUrl(id: firstRate.id), alignment: .topLeading)
      } else {
        unavailable(WidgetKind.rates.unavailablePlural, url: getWidgetUrl())
      }
    }
  }
}

struct SpreadWidget: Widget {
  let kind: String = "SpreadWidget"
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectSpreadRateTypesIntent.self, provider: RateTypesProvider<SelectSpreadRateTypesIntent>()) { entry in
      SpreadWidgetEntryView(entry: entry)
        .environment(\.colorScheme, .dark)
        .environment(\.sizeCategory, .large)
    }
    .configurationDisplayName("Brechas")
    .description("Consultá las brechas entre cotizaciones a lo largo del día.")
    .supportedFamilies([.systemSmall, .accessoryCircular])
    .contentMarginsDisabled()
  }
}

struct MarketWidget: Widget {
  let kind: String = "MarketWidget"
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectMarketTypeIntent.self, provider: RateTypesProvider<SelectMarketTypeIntent>()) { entry in
      RateWidgetEntryView(entry: entry, kind: .markets)
        .environment(\.colorScheme, .dark)
        .environment(\.sizeCategory, .large)
    }
    .configurationDisplayName("Indicadores")
    .description("Consultá los indicadores a lo largo del día.")
    .supportedFamilies([.systemSmall, .accessoryCircular])
    .contentMarginsDisabled()
  }
}

struct ListMarketsWidget: Widget {
  let kind: String = "ListMarketsWidget"
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectMarketTypesIntent.self, provider: RateTypesProvider<SelectMarketTypesIntent>()) { entry in
      ListRatesWidgetEntryView(entry: entry, kind: .markets)
        .environment(\.colorScheme, .dark)
        .environment(\.sizeCategory, .large)
    }
    .configurationDisplayName("Lista de indicadores")
    .description("Consultá los indicadores a lo largo del día.")
    .supportedFamilies([.systemSmall])
    .contentMarginsDisabled()
  }
}

@available(iOS 18.0, *)
struct LaunchControlWidget: ControlWidget {
  static let kind: String = "com.ambitodolar.controlwidget.launch"
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: Self.kind) {
      ControlWidgetButton(action: LaunchAppIntent()) {
        Label("Ámbito Dólar", image: "AppWidgetIcon")
      }
    }
    .displayName("Ámbito Dólar")
    .description("Control para abrir la app desde el Centro de Control.")
  }
}

@main
struct RateWidgets: WidgetBundle {
  @WidgetBundleBuilder
  var body: some Widget {
    RateWidget()
    ListRatesWidget()
    SpreadWidget()
    MarketWidget()
    ListMarketsWidget()
    if #available(iOS 18.0, *) {
      LaunchControlWidget()
    }
  }
}
