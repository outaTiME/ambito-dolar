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
  let name: String
  let change: String?
  let plainChange: String?
  let changeColor: Color?
  let price: String
  let date: String
  init(name: String, change: String?, plainChange: String?, changeColor: Color?, price: String, date: String) {
    self.name = name
    self.change = change
    self.plainChange = plainChange
    self.changeColor = changeColor
    self.price = price
    self.date = date
  }
  var id: String { name }
}

private func getRates() -> [String: Any]? {
  // TODO: export fetch uri
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
        // rate = response[type] as? [Any]
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
  nf.usesGroupingSeparator = true
  nf.minimumFractionDigits = 2
  // nf.maximumFractionDigits = 2
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

private func formatRateChange(num: Double, type: ChangeType, symbol: Bool = true) -> String {
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

private func lookupRateValues(rateTypes: [RateType] = Helper.getDefaultRateTypes(), valueType: ValueType = ValueType.sell, changeType: ChangeType = ChangeType.percentage ) -> [RateValue]? {
  let rates = getRates()
  return rateTypes.map {
    let type = $0.identifier
    let name = $0.displayString
    if rates != nil, let rate = rates![type!] as? [Any] {
      let rateValue = rate[1]
      let value: Double
      let amount: Double
      if rateValue is Double {
        value = rateValue as! Double
        amount = value
        // price = formatRateCurrency(num: rateValue as! Double)
      } else {
        /* var arr = [String]()
         for item in rateValue as! NSArray {
         arr.append(formatRateCurrency(num: item as! Double))
         }
         price = arr.joined(separator: "–") */
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
        // price = formatRateCurrency(num: arr.max()!)
      }
      let price = formatRateCurrency(num: value)
      var rateChange = rate[2] as! Double
      if (changeType == ChangeType.amount) {
        rateChange = amount - (rate[3] as! Double)
      }
      let change = formatRateChange(num: rateChange, type: changeType)
      let plainChange = formatRateChange(num: rateChange, type: changeType, symbol: false )
      let changeColor = getChangeColor(num: rateChange)
      let rateDate = ISO8601DateFormatter().date(from: rate[0] as! String)
      let dateFormatter = DateFormatter()
      dateFormatter.dateFormat = "dd/MM HH:mm"
      let date = dateFormatter.string(from: rateDate!)
      return RateValue(name: name, change: change, plainChange: plainChange, changeColor: changeColor, price: price, date: date)
    }
    return nil
  }.compactMap{ $0 }
}

struct SimpleEntry: TimelineEntry {
  let date: Date
  let rates: [RateValue]?
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
  let fontName = "FiraGO"
  // https://developer.apple.com/documentation/uikit/uicolor/ui_element_colors
  let bgColor = Color(UIColor.systemBackground)
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
              // .minimumScaleFactor(0.5)
                .lineLimit(1)
              Text(rate.price)
                .font(.custom(fontName, size: 20))
                .minimumScaleFactor(0.5)
                .lineLimit(1)
                .widgetAccentable()
              if rate.plainChange != nil {
                Text((rate.plainChange)!)
                  .font(.custom(fontName, size: 10))
                // .minimumScaleFactor(0.5)
                  .lineLimit(1)
              }
            }
            .padding(8)
          }
          // .background(bgColor)
          .background(.ultraThinMaterial)
        } else {
          ZStack {
            AccessoryWidgetBackground()
            VStack {
              Text("N/D")
                .font(.custom(fontName, size: 14))
                .lineLimit(1)
                .widgetAccentable()
              /* Image(systemName: "xmark.icloud.fill")
               .font(.custom(fontName, size: 20))
               .widgetAccentable() */
            }
            .padding(8)
          }
          // .background(bgColor)
          .background(.ultraThinMaterial)
        }
      }
    default:
      if rates?.isEmpty == false, let rate = rates?[0] {
        VStack(alignment: .leading) {
          Text(rate.name)
            .font(.custom(fontName, size: 20))
          // .fontWeight(.regular)
            .foregroundColor(fgColor)
          // .minimumScaleFactor(0.5)
            .lineLimit(1)
          Spacer()
          if rate.change != nil {
            Text((rate.change)!)
              .font(.custom(fontName, size: 14))
            // .fontWeight(.medium)
              .foregroundColor(rate.changeColor!)
            // .minimumScaleFactor(0.5)
              .lineLimit(1)
          }
          Text(rate.price)
            .font(.custom(fontName, size: 28))
          // .fontWeight(.semibold)
            .foregroundColor(fgColor)
          // .minimumScaleFactor(0.5)
            .lineLimit(1)
          Spacer().frame(height: 8)
          // (Text("Actualizado ") + Text(entry.date, style: .time))
          Text(rate.date)
            .font(.custom(fontName, size: 10))
          // .fontWeight(.medium)
            .foregroundColor(fgSecondaryColor)
            .lineLimit(1)
          // .frame(height: 8, alignment: .bottom)
        }
        .frame(
          maxWidth: .infinity,
          maxHeight: .infinity,
          alignment: .topLeading
        )
        .padding(16)
        .background(bgColor)
      } else {
        VStack {
          Text("Sin cotización disponible")
            .font(.custom(fontName, size: 14))
          // .fontWeight(.regular)
            .foregroundColor(fgColor)
          // .minimumScaleFactor(0.5)
          // .lineLimit(2)
            .multilineTextAlignment(.center)
        }
        .frame(
          maxWidth: .infinity,
          maxHeight: .infinity
        )
        .padding(16)
        .background(bgColor)
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
    /* return [
     .systemSmall,
     ] */
  }
  var body: some WidgetConfiguration {
    IntentConfiguration(kind: kind, intent: SelectRateTypeIntent.self, provider: RateProvider()) { entry in
      RateWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Cotizaciones")
    .description("Mantenete al tanto de las cotizaciones durante el transcurso del día.")
    .supportedFamilies(supportedFamilies)
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
  let fontName = "FiraGO"
  // https://developer.apple.com/documentation/uikit/uicolor/ui_element_colors
  let bgColor = Color(UIColor.systemBackground)
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
              // .fontWeight(.regular)
                .foregroundColor(fgColor)
              // .minimumScaleFactor(0.5)
                .lineLimit(1)
              Spacer()
              Text(rate.price)
                .font(.custom(fontName, size: 14))
              // .fontWeight(.medium)
                .foregroundColor(fgColor)
                .lineLimit(1)
              // .frame(height: 8, alignment: .bottom)
            }
            HStack {
              Text(rate.date)
                .font(.custom(fontName, size: 10))
              // .fontWeight(.regular)
                .foregroundColor(fgSecondaryColor)
              // .minimumScaleFactor(0.5)
                .lineLimit(1)
              Spacer()
              if rate.change != nil {
                Text(rate.change!)
                  .font(.custom(fontName, size: 10))
                // .fontWeight(.medium)
                  .foregroundColor(rate.changeColor)
                // .minimumScaleFactor(0.5)
                  .lineLimit(1)
              }
            }
            if rate != rates?.last {
              Spacer()
            }
          }
        }
        .frame(
          maxWidth: .infinity,
          maxHeight: .infinity,
          alignment: .topLeading
        )
        .padding(16)
        .background(bgColor)
      } else {
        VStack {
          Text("Sin cotizaciones disponibles")
            .font(.custom(fontName, size: 14))
          // .fontWeight(.regular)
            .foregroundColor(fgColor)
          // .minimumScaleFactor(0.5)
          // .lineLimit(2)
            .multilineTextAlignment(.center)
        }
        .frame(
          maxWidth: .infinity,
          maxHeight: .infinity
        )
        .padding(16)
        .background(bgColor)
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
    }
    .configurationDisplayName("Lista de cotizaciones")
    .description("Mantenete al tanto de las cotizaciones durante el transcurso del día.")
    .supportedFamilies(supportedFamilies)
  }
}

@main
struct RateWidgets: WidgetBundle {
  @WidgetBundleBuilder
  var body: some Widget {
    RateWidget()
    ListRatesWidget()
  }
}

@available(iOSApplicationExtension 16.0, *)
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
    }
  }
}
