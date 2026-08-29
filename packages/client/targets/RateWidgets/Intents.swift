//
//  Intents.swift
//  Ámbito Dólar
//
//  Created by outaTiME on 27/08/2026.
//

import AppIntents

// replaces the RateType INObject that RateWidgets.intentdefinition used to generate.
// `identifier` stays as an alias over `id` so Helper and lookupRateValues keep reading the
// same shape they read from the generated class
struct RateType: AppEntity {
  let id: String
  let displayString: String
  var identifier: String? { id }
  init(identifier: String, display: String) {
    self.id = identifier
    self.displayString = display
  }
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Cotización")
  static let defaultQuery = RateTypeQuery()
  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(displayString)")
  }
}

// replaces the three provide*OptionsCollection of the RateIntents extension, same source
// EntityStringQuery and not EntityQuery: being able to search is what makes the system present
// the full sheet with a search field instead of a compact menu, which is the picker SiriKit gave
struct RateTypeQuery: EntityStringQuery {
  // resolves in the order asked for, not in Helper order: the list widget lets the user drag
  // its rates around and that order is the configuration
  func entities(for identifiers: [String]) async throws -> [RateType] {
    let known = Helper.getRateTypes()
    return identifiers.compactMap { id in known.first { $0.id == id } }
  }
  func entities(matching string: String) async throws -> [RateType] {
    Helper.getRateTypes().filter { $0.displayString.localizedStandardContains(string) }
  }
  func suggestedEntities() async throws -> [RateType] {
    Helper.getRateTypes()
  }
  func defaultResult() async -> RateType? {
    Helper.getDefaultRateType()
  }
}

// the raw values match the case names of the ValueType enum in the intentdefinition, which is
// what lets CustomIntentMigratedAppIntent carry the stored configuration over
enum ValueType: String, AppEnum {
  case buy
  case avg
  case sell
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Mostrar")
  static let caseDisplayRepresentations: [ValueType: DisplayRepresentation] = [
    .buy: "Compra",
    .avg: "Promedio",
    .sell: "Venta",
  ]
}

// ChangeType was declared in the intentdefinition but never used as a parameter, only as a
// plain enum from formatRateChange, so it does not need to be an AppEnum
enum ChangeType {
  case percentage
  case amount
}

// isDiscoverable mirrors the "Configurable in Shortcuts" checkbox the intentdefinition had
// unchecked, without it these three land in the Shortcuts app as user facing actions
struct SelectRateTypeIntent: WidgetConfigurationIntent, CustomIntentMigratedAppIntent {
  static let intentClassName = "SelectRateTypeIntent"
  static let isDiscoverable = false
  static let title: LocalizedStringResource = "Select Rate Type"
  static let description = IntentDescription("Seleccionar cotización")
  @Parameter(title: "Cotización")
  var rateType: RateType?
  @Parameter(title: "Mostrar", default: .sell)
  var valueType: ValueType
}

struct SelectRateTypesIntent: WidgetConfigurationIntent, CustomIntentMigratedAppIntent {
  static let intentClassName = "SelectRateTypesIntent"
  static let isDiscoverable = false
  static let title: LocalizedStringResource = "Select Rate Types"
  static let description = IntentDescription("Seleccionar cotizaciones")
  @Parameter(title: "Cotizaciones", size: [.systemSmall: 3])
  var rateTypes: [RateType]?
  @Parameter(title: "Mostrar", default: .sell)
  var valueType: ValueType
}

struct SelectSpreadRateTypesIntent: WidgetConfigurationIntent, CustomIntentMigratedAppIntent {
  static let intentClassName = "SelectSpreadRateTypesIntent"
  static let isDiscoverable = false
  static let title: LocalizedStringResource = "Select Spread Rate Types"
  static let description = IntentDescription("Seleccionar cotizaciones")
  @Parameter(title: "Cotizaciones", size: [.systemSmall: 2, .accessoryCircular: 2])
  var rateTypes: [RateType]?
}
