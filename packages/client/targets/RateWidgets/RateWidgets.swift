//
//  RateWidgets.swift
//  Ámbito Dólar
//
//  Created by outaTiME on 27/09/2022.
//

import WidgetKit
import SwiftUI
import AppIntents

// the three widgets reload in the same batch and every one of them asks for its timeline, its
// snapshot and its placeholder, which is one request each. Inside the window the first one pays
// and the rest read what it brought, which is still the real rates and not a sample, so the
// preview keeps showing live numbers
private let ratesCacheWindow: TimeInterval = 60

private func getWidgetUrl(id: String? = nil) -> URL? {
  if let id = id {
    return URL(string: "https://www.ambito-dolar.app/rates/" + id)
  }
  return URL(string: "https://www.ambito-dolar.app/rates")
}

private let placeholderPrice: Double = 1000

// placeholder is synchronous by protocol and Apple asks it to return immediately, so it never
// goes to the network. WidgetKit paints it as the widget content until the first timeline lands,
// so returning nothing shows the unavailable text right after an install. Equal and non zero
// prices on purpose: the spread widget divides one by the other
private func placeholderEntry(rateTypes: [RateType]) -> SimpleEntry {
  let stored = lookupRateValues(rates: storedRates(), rateTypes: rateTypes)
  if !stored.isEmpty {
    return SimpleEntry(date: Date(), rates: stored)
  }
  let rates = rateTypes.map { rateType in
    RateValue(
      id: rateType.id,
      name: rateType.displayString,
      change: formatRateChange(num: 0, type: .percentage),
      plainChange: formatRateChange(num: 0, type: .percentage, symbol: false),
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
}

struct RateProvider: AppIntentTimelineProvider {
  private func rateTypes(for configuration: SelectRateTypeIntent) -> [RateType] {
    [configuration.rateType]
  }
  func placeholder(in context: Context) -> SimpleEntry {
    placeholderEntry(rateTypes: [Helper.getDefaultRateType()])
  }
  func snapshot(for configuration: SelectRateTypeIntent, in context: Context) async -> SimpleEntry {
    let rates = lookupRateValues(rates: await getRates(cacheWindow: ratesCacheWindow), rateTypes: rateTypes(for: configuration), valueType: configuration.valueType)
    return SimpleEntry(date: Date(), rates: rates)
  }
  func timeline(for configuration: SelectRateTypeIntent, in context: Context) async -> Timeline<SimpleEntry> {
    let date = Date()
    let rates = lookupRateValues(rates: await getRates(cacheWindow: ratesCacheWindow), rateTypes: rateTypes(for: configuration), valueType: configuration.valueType)
    let entry = SimpleEntry(date: date, rates: rates)
    let reloadDate = Calendar.current.date(byAdding: .minute, value: 15, to: date)!
    return Timeline(entries: [entry], policy: .after(reloadDate))
  }
}

struct RateWidgetEntryView : View {
  @Environment(\.widgetFamily) var widgetFamily
  let entry: RateProvider.Entry
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
        .widgetURL(getWidgetUrl(id: rate.id))
        .widgetBackground()
      } else {
        ZStack {
          AccessoryWidgetBackground()
          VStack {
            Text("N/D")
              .font(.custom(fontName, size: 13))
              .lineLimit(1)
              .widgetAccentable()
          }
          .padding(.horizontal, 2)
        }
        .widgetURL(getWidgetUrl())
        .widgetBackground()
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
        .frame(
          maxWidth: .infinity,
          maxHeight: .infinity,
          alignment: .topLeading
        )
        .padding(16)
        .widgetURL(getWidgetUrl(id: rate.id))
        .widgetBackground()
      } else {
        VStack {
          Text("Cotización no disponible")
            .font(.custom(fontName, size: 14))
            .foregroundColor(fgColor)
            .multilineTextAlignment(.center)
        }
        .frame(
          maxWidth: .infinity,
          maxHeight: .infinity
        )
        .padding(16)
        .widgetURL(getWidgetUrl())
        .widgetBackground()
      }
    }
  }
}

struct RateWidget: Widget {
  let kind: String = "RateWidget"
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectRateTypeIntent.self, provider: RateProvider()) { entry in
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

struct ListRatesProvider: AppIntentTimelineProvider {
  private func rateTypes(for configuration: SelectRateTypesIntent) -> [RateType] {
    let selected = configuration.rateTypes
    return selected.isEmpty ? Helper.getDefaultRateTypes() : selected
  }
  func placeholder(in context: Context) -> SimpleEntry {
    placeholderEntry(rateTypes: Helper.getDefaultRateTypes())
  }
  func snapshot(for configuration: SelectRateTypesIntent, in context: Context) async -> SimpleEntry {
    let rates = lookupRateValues(rates: await getRates(cacheWindow: ratesCacheWindow), rateTypes: rateTypes(for: configuration), valueType: configuration.valueType)
    return SimpleEntry(date: Date(), rates: rates)
  }
  func timeline(for configuration: SelectRateTypesIntent, in context: Context) async -> Timeline<SimpleEntry> {
    let date = Date()
    let rates = lookupRateValues(rates: await getRates(cacheWindow: ratesCacheWindow), rateTypes: rateTypes(for: configuration), valueType: configuration.valueType)
    let entry = SimpleEntry(date: date, rates: rates)
    let reloadDate = Calendar.current.date(byAdding: .minute, value: 15, to: date)!
    return Timeline(entries: [entry], policy: .after(reloadDate))
  }
}

struct ListRatesWidgetEntryView : View {
  let entry: ListRatesProvider.Entry
  var body: some View {
    let rates = entry.rates
    if !rates.isEmpty {
      VStack(alignment: .leading) {
        ForEach(rates) { rate in
          HStack {
            Text(rate.name)
              .font(.custom(fontName, size: 14))
              .foregroundColor(fgColor)
              .minimumScaleFactor(0.9) // ~ 12.6
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
              .minimumScaleFactor(0.9) // ~ 9.9
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
      .frame(
        maxWidth: .infinity,
        maxHeight: .infinity,
        alignment: .topLeading
      )
      .padding(16)
      .widgetURL(getWidgetUrl())
      .widgetBackground()
    } else {
      VStack {
        Text("Cotizaciones no disponibles")
          .font(.custom(fontName, size: 14))
          .foregroundColor(fgColor)
          .multilineTextAlignment(.center)
      }
      .frame(
        maxWidth: .infinity,
        maxHeight: .infinity
      )
      .padding(16)
      .widgetURL(getWidgetUrl())
      .widgetBackground()
    }
  }
}

struct ListRatesWidget: Widget {
  let kind: String = "ListRatesWidget"
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectRateTypesIntent.self, provider: ListRatesProvider()) { entry in
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

struct SpreadProvider: AppIntentTimelineProvider {
  private func rateTypes(for configuration: SelectSpreadRateTypesIntent) -> [RateType] {
    let selected = configuration.rateTypes
    return selected.isEmpty ? Helper.getDefaultSpreadRateTypes() : selected
  }
  func placeholder(in context: Context) -> SimpleEntry {
    placeholderEntry(rateTypes: Helper.getDefaultSpreadRateTypes())
  }
  func snapshot(for configuration: SelectSpreadRateTypesIntent, in context: Context) async -> SimpleEntry {
    let rates = lookupRateValues(rates: await getRates(cacheWindow: ratesCacheWindow), rateTypes: rateTypes(for: configuration))
    return SimpleEntry(date: Date(), rates: rates)
  }
  func timeline(for configuration: SelectSpreadRateTypesIntent, in context: Context) async -> Timeline<SimpleEntry> {
    let date = Date()
    let rates = lookupRateValues(rates: await getRates(cacheWindow: ratesCacheWindow), rateTypes: rateTypes(for: configuration))
    let entry = SimpleEntry(date: date, rates: rates)
    let reloadDate = Calendar.current.date(byAdding: .minute, value: 15, to: date)!
    return Timeline(entries: [entry], policy: .after(reloadDate))
  }
}

struct SpreadWidgetEntryView : View {
  @Environment(\.widgetFamily) var widgetFamily
  let entry: SpreadProvider.Entry
  var body: some View {
    let rates = entry.rates
    // a rate that stopped coming back leaves the array short and a subscript would trap
    let firstRate = rates.first
    let secondRate = rates.dropFirst().first
    var spreadRate: RateValue? {
      if let firstRate = firstRate, let secondRate = secondRate {
        let detail =  "\(firstRate.name) → \(secondRate.name)"
        let value = firstRate.priceValue - secondRate.priceValue
        let price = formatRateChange(num: value, symbol: false)
        let rateChange = (firstRate.priceValue / secondRate.priceValue - 1) * 100
        let changeType = ChangeType.percentage
        let plainChange = formatRateChange(num: rateChange, type: changeType, symbol: false)
        let changeColor = getChangeColor(num: rateChange)
        let (date, dateValue) = {
          if (firstRate.dateValue > secondRate.dateValue) {
            return (firstRate.date, firstRate.dateValue)
          }
          return (secondRate.date, secondRate.dateValue)
        }()
        return RateValue(
          id: "spread",
          name: "Brecha",
          detail: detail,
          // the spread renders no arrow on either layout, so both carry the plain form
          change: plainChange,
          plainChange: plainChange,
          changeColor: changeColor,
          changeValue: rateChange,
          price: price,
          priceValue: value,
          date: date,
          dateValue: dateValue
        )
      }
      return nil
    }
    switch widgetFamily {
    case .accessoryCircular:
      if let spreadRate = spreadRate {
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
        .widgetURL(getWidgetUrl(id: firstRate!.id))
        .widgetBackground()
      } else {
        ZStack {
          AccessoryWidgetBackground()
          VStack {
            Text("N/D")
              .font(.custom(fontName, size: 13))
              .lineLimit(1)
              .widgetAccentable()
          }
          .padding(.horizontal, 2)
        }
        .widgetURL(getWidgetUrl())
        .widgetBackground()
      }
    default:
      if let spreadRate = spreadRate {
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
        .frame(
          maxWidth: .infinity,
          maxHeight: .infinity,
          alignment: .topLeading
        )
        .padding(16)
        .widgetURL(getWidgetUrl(id: firstRate!.id))
        .widgetBackground()
      } else {
        VStack {
          Text("Cotizaciones no disponibles")
            .font(.custom(fontName, size: 14))
            .foregroundColor(fgColor)
            .multilineTextAlignment(.center)
        }
        .frame(
          maxWidth: .infinity,
          maxHeight: .infinity
        )
        .padding(16)
        .widgetURL(getWidgetUrl())
        .widgetBackground()
      }
    }
  }
}

struct SpreadWidget: Widget {
  let kind: String = "SpreadWidget"
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectSpreadRateTypesIntent.self, provider: SpreadProvider()) { entry in
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
    if #available(iOS 18.0, *) {
      LaunchControlWidget()
    }
  }
}

struct RateWidgets_Previews: PreviewProvider {
  static var previews: some View {
    let entry = placeholderEntry(rateTypes: Helper.getDefaultRateTypes())
    Group {
      RateWidgetEntryView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .systemSmall))
        .previewDisplayName("RateWidget")
      RateWidgetEntryView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .accessoryCircular))
        .previewDisplayName("RateWidget (Lock screen)")
      ListRatesWidgetEntryView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .systemSmall))
        .previewDisplayName("ListRatesWidget")
      SpreadWidgetEntryView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .systemSmall))
        .previewDisplayName("SpreadWidget")
      SpreadWidgetEntryView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .accessoryCircular))
        .previewDisplayName("SpreadWidget (Lock screen)")
    }
  }
}
