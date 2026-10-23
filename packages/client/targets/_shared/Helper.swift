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
      RateType(identifier: "futuro", display: "Futuro")
    ]
  }
  // same titles and default order as core getMarketTitle and getAvailableMarketTypes
  static func getMarketTypes() -> [RateType] {
    [
      RateType(identifier: "inflacion", display: "Inflación"),
      RateType(identifier: "inflacion_interanual", display: "Inflación interanual", short: "Interanual"),
      RateType(identifier: "plazo_fijo", display: "Plazo fijo"),
      RateType(identifier: "uva", display: "UVA"),
      RateType(identifier: "riesgo_pais", display: "Riesgo país"),
      RateType(identifier: "merval", display: "Merval"),
      RateType(identifier: "reservas", display: "Reservas")
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
