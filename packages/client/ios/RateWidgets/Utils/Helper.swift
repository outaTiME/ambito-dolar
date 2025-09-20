//
//  Helper.swift
//  Ámbito Dólar
//
//  Created by outaTiME on 27/09/2022.
//

import Foundation

struct Helper {
  static func getRateTypes() -> [RateType] {
    [
      RateType(identifier: "oficial", display: "Oficial"),
      RateType(identifier: "bna", display: "BNA"),
      RateType(identifier: "informal", display: "Blue"),
      RateType(identifier: "turista", display: "Tarjeta"),
      // RateType(identifier: "qatar", display: "Qatar"),
      // RateType(identifier: "ahorro", display: "Ahorro"),
      RateType(identifier: "ccl", display: "CCL"),
      RateType(identifier: "mep", display: "MEP"),
      RateType(identifier: "ccb", display: "Cripto"),
      RateType(identifier: "mayorista", display: "Mayorista"),
      RateType(identifier: "euro", display: "Euro"),
      RateType(identifier: "euro_informal", display: "Euro Blue"),
      RateType(identifier: "real", display: "Real"),
      // RateType(identifier: "futuros", display: "Futuros")
    ]
  }
  static func getDefaultRateType() -> RateType {
    getRateTypes().first!
  }
  static func getDefaultRateTypes() -> [RateType] {
    Array(getRateTypes().prefix(3))
  }
  static func getDefaultSpreadRateTypes() -> [RateType] {
    let rateTypes = getRateTypes()
    return [rateTypes[2], rateTypes[1]]
  }
}
