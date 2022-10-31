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
      RateType(identifier: "informal", display: "Blue"),
      RateType(identifier: "turista", display: "Tarjeta"),
      RateType(identifier: "ahorro", display: "Ahorro"),
      RateType(identifier: "qatar", display: "Qatar"),
      RateType(identifier: "ccl", display: "CCL"),
      RateType(identifier: "mep", display: "MEP"),
      RateType(identifier: "ccb", display: "Cripto"),
      RateType(identifier: "mayorista", display: "Mayorista")
    ]
  }
  static func getDefaultRateTypes() -> [RateType] {
    Array(getRateTypes().prefix(3))
  }
  static func getDefaultRateType() -> RateType {
    getRateTypes().first!
  }
}
