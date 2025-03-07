//
//  RateWidgets.swift
//  Ámbito Dólar
//
//  Created by outaTiME on 27/09/2022.
//

import WidgetKit
import SwiftUI
import Intents

struct RateValue: Identifiable, Equatable {
  let id: String
  let name: String
  let detail: String?
  let change: String?
  let plainChange: String?
  let changeColor: Color?
  let changeValue: Double?
  let price: String
  let priceValue: Double
  let date: String
  let dateValue: Double
  init(id: String, name: String, detail: String? = nil, change: String?, plainChange: String?, changeColor: Color?, changeValue: Double?, price: String, priceValue: Double, date: String, dateValue: Double) {
    self.id = id
    self.name = name
    self.detail = detail
    self.change = change
    self.plainChange = plainChange
    self.changeColor = changeColor
    self.changeValue = changeValue
    self.price = price
    self.priceValue = priceValue
    self.date = date
    self.dateValue = dateValue
  }
}

private func getRates() -> [String: Any]? {
  // TODO: export fetch uri to env
  if let fetchRatesUri = ProcessInfo.processInfo.environment["FETCH_RATES_URI"] {
    print("fetchRatesUri: \(fetchRatesUri)")
  }
  let url = URL(string: "https://api.ambito-dolar.app/fetch")!
  let semaphore = DispatchSemaphore(value: 0)
  var rates: [String: Any]?
  let task = URLSession.shared.dataTask(with: url) { (data, response, error) in
    if let data = data {
      if let response = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
        rates = response
      }
    }
    semaphore.signal()
  }
  task.resume()
  semaphore.wait()
  return rates
}

private func formatNumber(num: Double) -> String {
  let nf = NumberFormatter()
  nf.numberStyle = .decimal
  nf.minimumFractionDigits = 2
  nf.maximumFractionDigits = 2
  nf.roundingMode = .down
  return nf.string(for: num)!
}

private func formatRateCurrency(num: Double) -> String {
  return formatNumber(num: num)
}

private func getChangeSymbol(num: Double) -> String {
  if num == 0 {
    return "="
  } else if num > 0 {
    return "↑"
  }
  return "↓"
}

private func formatRateChange(num: Double, type: ChangeType = .amount, symbol: Bool = true) -> String {
  let change = (num > 0 ? "+" : "") + formatRateCurrency(num: num) + (type == ChangeType.percentage ? "%" : "")
  if symbol == true {
    return change + " " + getChangeSymbol(num: num)
  }
  return change
}

private func getChangeColor(num: Double) -> Color {
  if num == 0 {
    return Color(UIColor.systemBlue);
  } else if num > 0 {
    return Color(UIColor.systemGreen);
  }
  return Color(UIColor.systemRed);
}

private func getWidgetUrl(id: String? = nil) -> URL? {
  if let id = id {
    return URL(string: "ambito-dolar://rate?type=" + id)
  }
  return URL(string: "ambito-dolar://rates")
}

extension ValueType {
  var displayName: String? {
    let mapping: [ValueType: String] = [
      .buy: "Compra",
      .avg: "Promedio",
      .sell: "Venta"
    ]
    // unknown case returns nil
    return mapping[self]
  }
}

private func lookupRateValues(rateTypes: [RateType] = Helper.getDefaultRateTypes(), valueType: ValueType = ValueType.sell, changeType: ChangeType = ChangeType.percentage ) -> [RateValue]? {
  let rates = getRates()
  return rateTypes.map {
    if let type = $0.identifier {
      let name = $0.displayString
      // check if the rate is available
      if Helper.getRateTypes().contains(where: { $0.identifier == type }), rates != nil, let rate = rates![type] as? [Any] {
        let rateValue = rate[1]
        let value: Double
        let amount: Double
        var detail: String?
        if rateValue is Double {
          value = rateValue as! Double
          amount = value
        } else {
          var arr = [Double]()
          for item in rateValue as! NSArray {
            arr.append(item as! Double)
          }
          let buy = arr[0]
          let sell = arr[1]
          if valueType == ValueType.buy {
            value = buy
          } else if valueType == ValueType.avg {
            value = (buy + sell) / 2
          } else {
            value = sell
          }
          amount = sell
          detail = valueType.displayName
        }
        let price = formatRateCurrency(num: value)
        var rateChange = rate[2] as! Double
        if (changeType == ChangeType.amount) {
          rateChange = amount - (rate[3] as! Double)
        }
        let change = formatRateChange(num: rateChange, type: changeType)
        let plainChange = formatRateChange(num: rateChange, type: changeType, symbol: false)
        let changeColor = getChangeColor(num: rateChange)
        let rateDate = ISO8601DateFormatter().date(from: rate[0] as! String)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "dd/MM HH:mm"
        let date = dateFormatter.string(from: rateDate!)
        return RateValue(
          id: type,
          name: name,
          detail: detail,
          change: change,
          plainChange: plainChange,
          changeColor: changeColor,
          changeValue: rateChange,
          price: price,
          priceValue: value,
          date: date,
          dateValue: rateDate!.timeIntervalSince1970 * 1000.0
        )
      }
    }
    return nil
  }.compactMap{ $0 }
}

struct SimpleEntry: TimelineEntry {
  let date: Date
  let rates: [RateValue]?
}

extension View {
  @ViewBuilder
  func widgetBackground(backgroundView: some View = Color.black) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      containerBackground(for: .widget) {
        backgroundView
      }
    } else {
      background(backgroundView)
    }
  }
  @ViewBuilder
  func conditionalContentTransition(value: Double? = nil) -> some View {
    if #available(iOS 17.0, *), let value = value {
      self.contentTransition(.numericText(value: value))
    } else if #available(iOS 16.0, *) {
      self.contentTransition(.numericText())
    } else {
      self
    }
  }
}

extension WidgetConfiguration {
  func contentMarginsDisabledIfAvailable() -> some WidgetConfiguration {
    if #available(iOSApplicationExtension 17.0, *) {
      return self.contentMarginsDisabled()
    } else {
      return self
    }
  }
  func disfavoredLocationsIfAvailable() -> some WidgetConfiguration {
    if #available(iOS 17, *) {
      return self.disfavoredLocations([.lockScreen, .standBy], for: [.systemSmall])
    } else {
      return self
    }
  }
}

struct RateProvider: IntentTimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    let rates = lookupRateValues()
    return SimpleEntry(date: Date(), rates: rates)
  }
  func getSnapshot(for configuration: SelectRateTypeIntent, in context: Context, completion: @escaping (SimpleEntry) -> ()) {
    let rates = lookupRateValues(rateTypes: [configuration.rateType!], valueType: configuration.valueType)
    let entry = SimpleEntry(date: Date(), rates: rates)
    completion(entry)
  }
  func getTimeline(for configuration: SelectRateTypeIntent, in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    var entries: [SimpleEntry] = []
    let date = Date()
    let rates = lookupRateValues(rateTypes: [configuration.rateType!], valueType: configuration.valueType)
    let entry = SimpleEntry(date: date, rates: rates)
    entries.append(entry)
    let reloadDate = Calendar.current.date(byAdding: .minute, value: 5, to: date)!
    let timeline = Timeline(entries: entries, policy: .after(reloadDate))
    completion(timeline)
  }
}

struct RateWidgetEntryView : View {
  @Environment(\.widgetFamily) var widgetFamily
  let entry: RateProvider.Entry
  // postscript name
  let fontName = "FiraGO-Regular"
  // https://developer.apple.com/documentation/uikit/uicolor/ui_element_colors
  let fgColor = Color(UIColor.label)
  let fgSecondaryColor = Color(UIColor.secondaryLabel)
  var body: some View {
    let rates = entry.rates
    switch widgetFamily {
    case .accessoryCircular:
      if #available(iOSApplicationExtension 16.0, *) {
        if rates?.isEmpty == false, let rate = rates?[0] {
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
                .conditionalContentTransition(value: rate.priceValue)
                .padding(.horizontal, 2)
                .widgetAccentable()
              if let plainChange = rate.plainChange {
                Text(plainChange)
                  .font(.custom(fontName, size: 10))
                  .lineLimit(1)
                  .conditionalContentTransition(value: rate.changeValue)
                  .padding(.horizontal, 8)
              } else {
                Text(" ")
                  .font(.custom(fontName, size: 10))
                  .lineLimit(1)
              }
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
      }
    default:
      if rates?.isEmpty == false, let rate = rates?[0] {
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
          if let change = rate.change {
            Text(change)
              .font(.custom(fontName, size: 14))
              .foregroundColor(rate.changeColor)
              .lineLimit(1)
              .conditionalContentTransition(value: rate.changeValue)
          }
          Text(rate.price)
            .font(.custom(fontName, size: 26))
            .foregroundColor(fgColor)
            .lineLimit(1)
            .conditionalContentTransition(value: rate.priceValue)
          // Spacer().frame(height: 4)
          Text(rate.date)
            .font(.custom(fontName, size: 11))
            .foregroundColor(fgSecondaryColor)
            .lineLimit(1)
            .conditionalContentTransition(value: rate.dateValue)
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
  private var supportedFamilies: [WidgetFamily] {
    if #available(iOSApplicationExtension 16.0, *) {
      return [
        .systemSmall,
        .accessoryCircular,
      ]
    } else {
      return [
        .systemSmall,
      ]
    }
  }
  var body: some WidgetConfiguration {
    IntentConfiguration(kind: kind, intent: SelectRateTypeIntent.self, provider: RateProvider()) { entry in
      RateWidgetEntryView(entry: entry)
        .environment(\.colorScheme, .dark)
        .environment(\.sizeCategory, .large)
    }
    .configurationDisplayName("Cotizaciones")
    .description("Consulta las cotizaciones a lo largo del día.")
    .supportedFamilies(supportedFamilies)
    .contentMarginsDisabledIfAvailable()
    // .disfavoredLocationsIfAvailable()
  }
}

struct ListRatesProvider: IntentTimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    let rates = lookupRateValues()
    return SimpleEntry(date: Date(), rates: rates)
  }
  func getSnapshot(for configuration: SelectRateTypesIntent, in context: Context, completion: @escaping (SimpleEntry) -> ()) {
    let rates = lookupRateValues(rateTypes: configuration.rateTypes!, valueType: configuration.valueType)
    let entry = SimpleEntry(date: Date(), rates: rates)
    completion(entry)
  }
  func getTimeline(for configuration: SelectRateTypesIntent, in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    var entries: [SimpleEntry] = []
    let date = Date()
    let rates = lookupRateValues(rateTypes: configuration.rateTypes!, valueType: configuration.valueType)
    let entry = SimpleEntry(date: date, rates: rates)
    entries.append(entry)
    let reloadDate = Calendar.current.date(byAdding: .minute, value: 5, to: date)!
    let timeline = Timeline(entries: entries, policy: .after(reloadDate))
    completion(timeline)
  }
}

struct ListRatesWidgetEntryView : View {
  @Environment(\.widgetFamily) var widgetFamily
  let entry: ListRatesProvider.Entry
  // postscript name
  let fontName = "FiraGO-Regular"
  // https://developer.apple.com/documentation/uikit/uicolor/ui_element_colors
  let fgColor = Color(UIColor.label)
  let fgSecondaryColor = Color(UIColor.secondaryLabel)
  var body: some View {
    let rates = entry.rates
    switch widgetFamily {
    default:
      if rates?.isEmpty == false {
        VStack(alignment: .leading) {
          ForEach(rates!) { rate in
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
                .conditionalContentTransition(value: rate.priceValue)
            }
            HStack {
              Text(rate.date)
                .font(.custom(fontName, size: 11))
                .foregroundColor(fgSecondaryColor)
                .minimumScaleFactor(0.9) // ~ 9.9
                .lineLimit(1)
                .conditionalContentTransition(value: rate.dateValue)
              Spacer()
              if let change = rate.change {
                Text(change)
                  .font(.custom(fontName, size: 11))
                  .foregroundColor(rate.changeColor)
                  .lineLimit(1)
                  .conditionalContentTransition(value: rate.changeValue)
              }
            }
            if rate != rates?.last {
              Spacer()
            } else {
              if (rates!.count < 3) {
                // complete the remaining slots
                ForEach(0..<3-rates!.count, id: \.self) { _ in
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
}

struct ListRatesWidget: Widget {
  let kind: String = "ListRatesWidget"
  private var supportedFamilies: [WidgetFamily] {
    return [
      .systemSmall,
    ]
  }
  var body: some WidgetConfiguration {
    IntentConfiguration(kind: kind, intent: SelectRateTypesIntent.self, provider: ListRatesProvider()) { entry in
      ListRatesWidgetEntryView(entry: entry)
        .environment(\.colorScheme, .dark)
        .environment(\.sizeCategory, .large)
    }
    .configurationDisplayName("Lista de cotizaciones")
    .description("Consulta las cotizaciones a lo largo del día.")
    .supportedFamilies(supportedFamilies)
    .contentMarginsDisabledIfAvailable()
    // .disfavoredLocationsIfAvailable()
  }
}

struct SpreadProvider: IntentTimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    let rates = lookupRateValues()
    return SimpleEntry(date: Date(), rates: rates)
  }
  func getSnapshot(for configuration: SelectSpreadRateTypesIntent, in context: Context, completion: @escaping (SimpleEntry) -> ()) {
    let rates = lookupRateValues(rateTypes: configuration.rateTypes!)
    let entry = SimpleEntry(date: Date(), rates: rates)
    completion(entry)
  }
  func getTimeline(for configuration: SelectSpreadRateTypesIntent, in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    var entries: [SimpleEntry] = []
    let date = Date()
    let rates = lookupRateValues(rateTypes: configuration.rateTypes!)
    let entry = SimpleEntry(date: date, rates: rates)
    entries.append(entry)
    let reloadDate = Calendar.current.date(byAdding: .minute, value: 5, to: date)!
    let timeline = Timeline(entries: entries, policy: .after(reloadDate))
    completion(timeline)
  }
}

struct SpreadWidgetEntryView : View {
  @Environment(\.widgetFamily) var widgetFamily
  let entry: SpreadProvider.Entry
  // postscript name
  let fontName = "FiraGO-Regular"
  // https://developer.apple.com/documentation/uikit/uicolor/ui_element_colors
  let fgColor = Color(UIColor.label)
  let fgSecondaryColor = Color(UIColor.secondaryLabel)
  var body: some View {
    let rates = entry.rates
    let firstRate = rates?[0]
    let secondRate = rates?[1]
    var spreadRate: RateValue? {
      if let firstRate = firstRate, let secondRate = secondRate {
        let detail =  "\(firstRate.name) → \(secondRate.name)"
        let value = firstRate.priceValue - secondRate.priceValue
        let price = formatRateChange(num: value, symbol: false)
        let rateChange = (firstRate.priceValue / secondRate.priceValue - 1) * 100
        let changeType = ChangeType.percentage
        let change = formatRateChange(num: rateChange, type: changeType)
        let plainChange = formatRateChange(num: rateChange, type: changeType, symbol: false)
        let changeColor = getChangeColor(num: rateChange)
        let (date, dateValue) = {
          if (firstRate.date > secondRate.date) {
            return (firstRate.date, firstRate.dateValue)
          }
          return (secondRate.date, secondRate.dateValue)
        }()
        return RateValue(
          id: "spread",
          name: "Brecha",
          detail: detail,
          change: change,
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
      if #available(iOSApplicationExtension 16.0, *) {
        if let spreadRate = spreadRate {
          ZStack {
            AccessoryWidgetBackground()
            VStack {
              Text(spreadRate.name)
                .font(.custom(fontName, size: 10))
                .lineLimit(1)
                .padding(.horizontal, 8)
              Text(spreadRate.plainChange!)
                .font(.custom(fontName, size: 13))
                .lineLimit(1)
                .conditionalContentTransition(value: spreadRate.changeValue)
                .padding(.horizontal, 2)
                .widgetAccentable()
              Text(spreadRate.price)
                .font(.custom(fontName, size: 10))
                .lineLimit(1)
                .conditionalContentTransition(value: spreadRate.priceValue)
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
            .conditionalContentTransition(value: spreadRate.priceValue)
          if let change = spreadRate.plainChange {
            Text(change)
              .font(.custom(fontName, size: 26))
              .foregroundColor(spreadRate.changeColor)
              .lineLimit(1)
              .conditionalContentTransition(value: spreadRate.changeValue)
          }
          // Spacer().frame(height: 4)
          Text(spreadRate.date)
            .font(.custom(fontName, size: 11))
            .foregroundColor(fgSecondaryColor)
            .lineLimit(1)
            .conditionalContentTransition(value: spreadRate.dateValue)
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
  private var supportedFamilies: [WidgetFamily] {
    if #available(iOSApplicationExtension 16.0, *) {
      return [
        .systemSmall,
        .accessoryCircular,
      ]
    } else {
      return [
        .systemSmall,
      ]
    }
  }
  var body: some WidgetConfiguration {
    IntentConfiguration(kind: kind, intent: SelectSpreadRateTypesIntent.self, provider: SpreadProvider()) { entry in
      SpreadWidgetEntryView(entry: entry)
        .environment(\.colorScheme, .dark)
        .environment(\.sizeCategory, .large)
    }
    .configurationDisplayName("Brechas")
    .description("Consulta las brechas entre cotizaciones a lo largo del día.")
    .supportedFamilies(supportedFamilies)
    .contentMarginsDisabledIfAvailable()
    // .disfavoredLocationsIfAvailable()
  }
}

@main
struct RateWidgets: WidgetBundle {
  @WidgetBundleBuilder
  var body: some Widget {
    RateWidget()
    ListRatesWidget()
    SpreadWidget()
  }
}

@available(iOS 16.0, *)
struct RateWidgets_Previews: PreviewProvider {
  static var previews: some View {
    let rates = lookupRateValues()
    let entry = SimpleEntry(date: Date(), rates: rates)
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
