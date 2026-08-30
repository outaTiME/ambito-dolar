//
//  Intents.swift
//  Ámbito Dólar
//
//  Created by outaTiME on 27/08/2026.
//

import AppIntents

// replaces the RateType INObject that RateWidgets.intentdefinition used to generate. AppEntity
// wants a non optional `id` while INObject.identifier was optional, so the optional alias stays:
// it is what keeps lookupRateValues and usableRates compiling unchanged against the original
@available(iOS 16.0, *)
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

// the lookup is the same for the three queries, they differ only in what defaultResult seeds.
// EntityQuery requires init(), so the system builds a query itself and a stored default would be
// lost: the type is what carries the distinction, which is why there are three of them
@available(iOS 16.0, *)
extension EntityStringQuery where Entity == RateType {
  // resolves in the order asked for, not in Helper order: the list widget lets the user drag its
  // rates around and that order is the configuration
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
}

// replaces the three provide*OptionsCollection of the RateIntents extension, same source.
// all three are EntityStringQuery so that every rate picker gets its search field
@available(iOS 16.0, *)
struct RateTypeQuery: EntityStringQuery {
  typealias Entity = RateType
  func defaultResult() async -> RateType? {
    Helper.getDefaultRateType()
  }
}

// a non optional collection parameter has to be given a value, and this is what the system asks
// for it. DefaultValue is per query, so each list shape needs its own to keep its own defaults
@available(iOS 16.0, *)
struct ListRateTypesQuery: EntityStringQuery {
  typealias Entity = RateType
  typealias DefaultValue = [RateType]
  func defaultResult() async -> [RateType]? {
    Helper.getDefaultRateTypes()
  }
}

@available(iOS 16.0, *)
struct SpreadRateTypesQuery: EntityStringQuery {
  typealias Entity = RateType
  typealias DefaultValue = [RateType]
  func defaultResult() async -> [RateType]? {
    Helper.getDefaultSpreadRateTypes()
  }
}

// the raw values match the case names of the ValueType enum in the intentdefinition, which is
// what lets CustomIntentMigratedAppIntent carry the stored configuration over
@available(iOS 16.0, *)
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
// unchecked, without it these three land in the Shortcuts app as user facing actions.
// the three rate parameters are non optional so the system asks their query for a default
@available(iOS 17.0, *)
struct SelectRateTypeIntent: WidgetConfigurationIntent, CustomIntentMigratedAppIntent {
  static let intentClassName = "SelectRateTypeIntent"
  static let isDiscoverable = false
  static let title: LocalizedStringResource = "Select Rate Type"
  static let description = IntentDescription("Seleccionar cotización")
  @Parameter(title: "Cotización")
  var rateType: RateType
  @Parameter(title: "Mostrar", default: .sell)
  var valueType: ValueType
}

@available(iOS 17.0, *)
struct SelectRateTypesIntent: WidgetConfigurationIntent, CustomIntentMigratedAppIntent {
  static let intentClassName = "SelectRateTypesIntent"
  static let isDiscoverable = false
  static let title: LocalizedStringResource = "Select Rate Types"
  static let description = IntentDescription("Seleccionar cotizaciones")
  @Parameter(title: "Cotizaciones", size: [.systemSmall: 3, .systemMedium: 4, .systemLarge: 8, .systemExtraLarge: 12, .accessoryInline: 1, .accessoryCorner: 1, .accessoryCircular: 1, .accessoryRectangular: 2], query: ListRateTypesQuery())
  var rateTypes: [RateType]
  @Parameter(title: "Mostrar", default: .sell)
  var valueType: ValueType
}

@available(iOS 17.0, *)
struct SelectSpreadRateTypesIntent: WidgetConfigurationIntent, CustomIntentMigratedAppIntent {
  static let intentClassName = "SelectSpreadRateTypesIntent"
  static let isDiscoverable = false
  static let title: LocalizedStringResource = "Select Spread Rate Types"
  static let description = IntentDescription("Seleccionar cotizaciones")
  @Parameter(title: "Cotizaciones", size: [.systemSmall: 2, .systemMedium: 4, .systemLarge: 8, .systemExtraLarge: 12, .accessoryInline: 1, .accessoryCorner: 1, .accessoryCircular: 2, .accessoryRectangular: 2], query: SpreadRateTypesQuery())
  var rateTypes: [RateType]
}
