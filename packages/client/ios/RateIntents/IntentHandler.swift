//
//  IntentHandler.swift
//  Ámbito Dólar
//
//  Created by outaTiME on 27/09/2022.
//

import Intents

class IntentHandler: INExtension, SelectRateTypeIntentHandling, SelectRateTypesIntentHandling {
  
  // FIXME: took rates from remote
  
  func defaultRateType(for intent: SelectRateTypeIntent) -> RateType? {
    Helper.getDefaultRateType()
  }
  
  func provideRateTypeOptionsCollection(for intent: SelectRateTypeIntent, with completion: @escaping (INObjectCollection<RateType>?, Error?) -> Void) {
    let rateTypes = Helper.getRateTypes()
    let collection = INObjectCollection(items: rateTypes)
    completion(collection, nil)
  }
  
  func defaultRateTypes(for intent: SelectRateTypesIntent) -> [RateType]? {
    Helper.getDefaultRateTypes()
  }
  
  func provideRateTypesOptionsCollection(for intent: SelectRateTypesIntent, with completion: @escaping (INObjectCollection<RateType>?, Error?) -> Void) {
    let rateTypes = Helper.getRateTypes()
    let collection = INObjectCollection(items: rateTypes)
    completion(collection, nil)
  }
  
}
