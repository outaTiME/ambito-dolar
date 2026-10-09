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

private let ratesCacheKey = "last_rates"
private let ratesCacheAtKey = "last_rates_at"
// the default is a minute, which is long enough for the system to kill the extension while it
// waits, the android widgets bound the same call to four seconds for the same reason
private let ratesSession: URLSession = {
  let configuration = URLSessionConfiguration.default
  configuration.timeoutIntervalForRequest = 4
  configuration.timeoutIntervalForResource = 4
  return URLSession(configuration: configuration)
}()

// an error body is valid json too, so taking any dictionary as success would blank the widgets
// and leave that body as the fallback for the next failure, which is what android avoids by
// requiring the parse to yield at least one rate.
// The shape is checked and not only the presence, because lookupRateValues reads this array by
// index and forces its casts: a short array or a string where a number goes takes the extension
// down with it
private func wellFormed(_ value: Any) -> Bool {
  guard let rate = value as? [Any], rate.count >= 3, rate[0] is String else {
    return false
  }
  // the value is a number on its own or a pair of them, the two shapes lookupRateValues reads
  let amount: Bool
  if rate[1] is NSNumber {
    amount = true
  } else if let pair = rate[1] as? [Any] {
    amount = pair.count >= 2 && pair.allSatisfy { $0 is NSNumber }
  } else {
    amount = false
  }
  return amount && rate[2] is NSNumber
}

// only the rates that are shaped the way lookupRateValues reads them, which is the android rule
// of dropping what does not parse instead of keeping it. Keeping the whole payload because one
// rate was fine let a malformed one through, and once it was persisted it came back to kill the
// extension on every later snapshot inside the cache window
private func usableRates(_ rates: [String: Any]) -> [String: Any] {
  var kept: [String: Any] = [:]
  for type in Helper.getRateTypes() {
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
  // a clock moved backwards makes the age negative, and negative passes any upper bound, which
  // would freeze the widget on the stored payload until the clock catches up
  let age = Date().timeIntervalSince1970 - UserDefaults.standard.double(forKey: ratesCacheAtKey)
  if age >= 0, age < cacheWindow, let fresh = storedRates() {
    return fresh
  }
  let url = URL(string: "https://api.ambito-dolar.app/fetch")!
  var rates: [String: Any]?
  // awaited, never waited on. snapshot and timeline are async since AppIntentTimelineProvider,
  // and Apple asks not to block on a semaphore from a task
  if let (data, response) = try? await ratesSession.data(from: url),
     // an error body is json too, so the status is what says whether this is rates at all
     let status = (response as? HTTPURLResponse)?.statusCode, (200..<300).contains(status),
     let parsed = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] {
    rates = parsed
  }
  // what is kept is what is well formed, so nothing that could be indexed by force ever reaches
  // lookupRateValues or the stored payload. An answer that yields nothing usable is a failure
  if let rates = rates {
    let kept = usableRates(rates)
    if !kept.isEmpty {
      // only replace the stored payload when there is one to store, set with nil removes the key
      // and would leave the fallback empty for the next failure
      if let data = try? JSONSerialization.data(withJSONObject: kept) {
        UserDefaults.standard.set(data, forKey: ratesCacheKey)
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: ratesCacheAtKey)
      }
      return kept
    }
  }
  // a failed call keeps the last payload instead of blanking the widget, which is what the
  // android one does by not calling updateAppWidget. No window here, whatever its age it beats
  // an empty card. A call that does succeed without the configured rate still falls through to
  // the unavailable text, same as before
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

// usableRates already dropped the unknown types, so a missing entry is a rate not available
func lookupRateValues(rates: [String: Any]?, rateTypes: [RateType], valueType: ValueType = ValueType.sell) -> [RateValue] {
  return rateTypes.compactMap { rateType in
    guard let rate = rates?[rateType.id] as? [Any] else {
      return nil
    }
    let rateValue = rate[1]
    let value: Double
    var detail: String?
    if rateValue is Double {
      value = rateValue as! Double
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
      detail = valueType.displayName
    }
    let rateChange = rate[2] as! Double
    // the default options reject fractional seconds, so a timestamp that grows milliseconds
    // parses to nil and unwrapping it would take the extension down, the android side drops
    // the rate instead
    guard let timestamp = rate[0] as? String,
          let rateDate = ISO8601DateFormatter().date(from: timestamp) else {
      return nil
    }
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "dd/MM HH:mm"
    return RateValue(
      id: rateType.id,
      name: rateType.displayString,
      detail: detail,
      change: formatRateChange(num: rateChange, type: .percentage),
      plainChange: formatRateChange(num: rateChange, type: .percentage, symbol: false),
      changeColor: getChangeColor(num: rateChange),
      changeValue: rateChange,
      price: formatRateCurrency(num: value),
      priceValue: value,
      date: dateFormatter.string(from: rateDate),
      dateValue: rateDate.timeIntervalSince1970 * 1000.0
    )
  }
}

func formatRateCurrency(num: Double) -> String {
  let nf = NumberFormatter()
  nf.numberStyle = .decimal
  nf.minimumFractionDigits = 2
  nf.maximumFractionDigits = 2
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

func formatRateChange(num: Double, type: ChangeType = .amount, symbol: Bool = true) -> String {
  let change = (num > 0 ? "+" : "") + formatRateCurrency(num: num) + (type == ChangeType.percentage ? "%" : "")
  if symbol == true {
    return change + " " + getChangeSymbol(num: num)
  }
  return change
}
