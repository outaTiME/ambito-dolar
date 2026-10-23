//
//  Rates.swift
//  Ámbito Dólar
//
//  Created by outaTiME on 07/10/2026.
//

import SwiftUI

// the /fetch payload, its validation and formatting, shared by the ios widgets and the watch app

// postscript name
let fontName = "FiraGO-Regular"

struct RateValue: Identifiable, Equatable {
  let id: String
  let name: String
  var detail: String? = nil
  let change: String
  let plainChange: String
  let changeColor: Color
  let changeValue: Double
  let price: String
  let priceValue: Double
  let date: String
  let dateValue: Double
}

// the API_URL of the build environment, the same the app and the android widgets read
private let apiUrl = (Bundle.main.object(forInfoDictionaryKey: "ApiUrl") as? String).flatMap(URL.init(string:))

private let ratesCacheKey = "last_rates"
private let ratesCacheAtKey = "last_rates_at"
// the default is a minute, long enough for the system to kill the extension while it waits
private let ratesSession: URLSession = {
  let configuration = URLSessionConfiguration.default
  configuration.timeoutIntervalForRequest = 4
  configuration.timeoutIntervalForResource = 4
  return URLSession(configuration: configuration)
}()

// lookupRateValues indexes this array and forces its casts, a bad shape would crash the extension
// checked as Double like the casts, an integer past 2^53 is an NSNumber that is not one
private func wellFormed(_ value: Any) -> Bool {
  guard let rate = value as? [Any], rate.count >= 3, rate[0] is String, rate[2] is Double else { return false }
  return rate[1] is Double || (rate[1] as? [Any]).map { $0.count >= 2 && $0.allSatisfy { $0 is Double } } == true
}

// drops what does not parse like android, a persisted malformed rate would crash every later read
private func usableRates(_ rates: [String: Any]) -> [String: Any] {
  var kept: [String: Any] = [:]
  for type in Helper.getRateTypes() + Helper.getMarketTypes() {
    if let rate = rates[type.id], wellFormed(rate) {
      kept[type.id] = rate
    }
  }
  return kept
}

func storedRates() -> [String: Any]? {
  guard let data = UserDefaults.standard.data(forKey: ratesCacheKey) else {
    return nil
  }
  // filtered like a fresh answer, a payload stored by an older build may predate usableRates
  guard let rates = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] else {
    return nil
  }
  return usableRates(rates)
}

// inside the window the stored payload is returned without a request
func getRates(cacheWindow: TimeInterval) async -> [String: Any]? {
  // a clock moved backwards makes the age negative, which would freeze the stored payload
  let age = Date().timeIntervalSince1970 - UserDefaults.standard.double(forKey: ratesCacheAtKey)
  if age >= 0, age < cacheWindow, let fresh = storedRates() {
    return fresh
  }
  // awaited and never blocked on a semaphore, as Apple asks from a task
  if let url = apiUrl?.appendingPathComponent("fetch"),
     let (data, response) = try? await ratesSession.data(from: url),
     // an error body is json too, so the status says whether this is rates
     let status = (response as? HTTPURLResponse)?.statusCode, (200..<300).contains(status),
     let parsed = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
     // an answer with nothing usable is a failure and never replaces the stored payload
     case let kept = usableRates(parsed), !kept.isEmpty {
    if let data = try? JSONSerialization.data(withJSONObject: kept) {
      UserDefaults.standard.set(data, forKey: ratesCacheKey)
      UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: ratesCacheAtKey)
    }
    return kept
  }
  // a failed call keeps the last payload whatever its age, like android skipping updateAppWidget
  return storedRates()
}

func getChangeColor(num: Double) -> Color {
  if num == 0 {
    return .blue
  } else if num > 0 {
    return .green
  }
  return .red
}

extension ValueType {
  var displayName: String {
    switch self {
    case .buy: "Compra"
    case .avg: "Promedio"
    case .sell: "Venta"
    }
  }
}

// display rules per market, the same as MARKETS in config/kinds.ts
private struct MarketFormat {
  enum Dated { case month, day }
  var decimals = 2
  // pts, pb and US$ are left out like the tickers do, only % and the M of reservas stay
  var suffix = ""
  // a percentage moves in points, the others in percent
  var points = false
  // up is bad news, so the colors swap
  var inverse = false
  var dated: Dated? = nil
}

private let marketFormats: [String: MarketFormat] = [
  "inflacion": MarketFormat(suffix: "%", points: true, inverse: true, dated: .month),
  "inflacion_interanual": MarketFormat(suffix: "%", points: true, inverse: true, dated: .month),
  "plazo_fijo": MarketFormat(suffix: "%", points: true, dated: .day),
  "uva": MarketFormat(dated: .day),
  "riesgo_pais": MarketFormat(decimals: 0, inverse: true),
  "merval": MarketFormat(decimals: 0),
  "reservas": MarketFormat(decimals: 0, suffix: " M", dated: .day),
]

// a time follows the device zone like android and the app, a day or a month stays in buenos aires
private func formatMarketDate(_ date: Date, _ dated: MarketFormat.Dated?) -> String {
  let formatter = DateFormatter()
  if dated != nil {
    formatter.timeZone = TimeZone(identifier: "America/Argentina/Buenos_Aires")
    formatter.locale = Locale(identifier: "es_AR")
  }
  switch dated {
  case .month:
    formatter.dateFormat = "MMMM"
    return formatter.string(from: date).capitalized
  case .day:
    formatter.dateFormat = "dd/MM"
  case nil:
    formatter.dateFormat = "dd/MM HH:mm"
  }
  return formatter.string(from: date)
}

// formatMarketValue and formatMarketChange of config/kinds.ts, the card form with its arrow
private func marketValue(_ rateType: RateType, _ format: MarketFormat, _ rate: [Any], _ value: Double, _ percentage: Double, _ date: Date) -> RateValue {
  // the close the change is measured against, given back by the percentage when it is missing
  let close = (rate.count > 3 ? rate[3] as? Double : nil) ?? value / (1 + percentage / 100)
  let scale = pow(10, Double(format.decimals))
  // rounded first, a float residue would truncate a whole step down
  let diff = ((value - close) * scale).rounded() / scale
  let text = format.points
    // a tiny negative residue rounds to -0, which would print with its sign
    ? (diff > 0 ? "+" : "") + formatRateCurrency(num: diff == 0 ? 0 : diff, cents: format.decimals > 0)
    : formatRateChange(num: percentage, percent: true, symbol: false)
  return RateValue(
    id: rateType.id,
    name: rateType.short ?? rateType.displayString,
    change: text + " " + getChangeSymbol(num: diff),
    plainChange: text,
    changeColor: getChangeColor(num: format.inverse ? -diff : diff),
    changeValue: diff,
    price: formatRateCurrency(num: value, cents: format.decimals > 0) + format.suffix,
    priceValue: value,
    date: formatMarketDate(date, format.dated),
    dateValue: date.timeIntervalSince1970 * 1000.0
  )
}

// usableRates already dropped the unknown types, so a missing entry is a rate not available
func lookupRateValues(rates: [String: Any]?, rateTypes: [RateType], valueType: ValueType = ValueType.sell) -> [RateValue] {
  return rateTypes.compactMap { rateType in
    guard let rate = rates?[rateType.id] as? [Any] else {
      return nil
    }
    let value: Double
    var detail: String?
    if let single = rate[1] as? Double {
      value = single
    } else {
      let pair = rate[1] as! [Double]
      switch valueType {
      case .buy: value = pair[0]
      case .avg: value = (pair[0] + pair[1]) / 2
      case .sell: value = pair[1]
      }
      detail = valueType.displayName
    }
    // the default options reject fractional seconds, such a timestamp drops the rate like android
    guard let timestamp = rate[0] as? String,
          let rateDate = ISO8601DateFormatter().date(from: timestamp) else {
      return nil
    }
    let rateChange = rate[2] as! Double
    if let format = marketFormats[rateType.id] {
      return marketValue(rateType, format, rate, value, rateChange, rateDate)
    }
    let plain = formatRateChange(num: rateChange, percent: true, symbol: false)
    return RateValue(
      id: rateType.id,
      name: rateType.short ?? rateType.displayString,
      detail: detail,
      change: plain + " " + getChangeSymbol(num: rateChange),
      plainChange: plain,
      changeColor: getChangeColor(num: rateChange),
      changeValue: rateChange,
      price: formatRateCurrency(num: value),
      priceValue: value,
      date: formatMarketDate(rateDate, nil),
      dateValue: rateDate.timeIntervalSince1970 * 1000.0
    )
  }
}

// the watch drops the cents of a whole list when its longest amount does not fit
func formatRateCurrency(num: Double, cents: Bool = true) -> String {
  let nf = NumberFormatter()
  nf.numberStyle = .decimal
  let digits = cents ? 2 : 0
  nf.minimumFractionDigits = digits
  nf.maximumFractionDigits = digits
  nf.roundingMode = .down
  return nf.string(for: num)!
}

private func getChangeSymbol(num: Double) -> String {
  if num == 0 {
    return "="
  } else if num > 0 {
    return "↑"
  }
  return "↓"
}

func formatRateChange(num: Double, percent: Bool = false, symbol: Bool = true) -> String {
  // a value that formats to zero loses its sign, like rateAmount on android
  let zero = formatRateCurrency(num: 0)
  let amount = num <= 0 && formatRateCurrency(num: -num) == zero ? zero : formatRateCurrency(num: num)
  let change = (num > 0 ? "+" : "") + amount + (percent ? "%" : "")
  return symbol ? change + " " + getChangeSymbol(num: num) : change
}
