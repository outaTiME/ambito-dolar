//
//  Intents.swift
//  Ámbito Dólar
//
//  Created by outaTiME on 27/08/2026.
//

import AppIntents

// replaces the RateType INObject that RateWidgets.intentdefinition used to generate
struct RateType: AppEntity {
  let id: String
  let displayString: String
  // what the widgets and the watch show when the full name does not fit their rows
  let short: String?
  init(identifier: String, display: String, short: String? = nil) {
    self.id = identifier
    self.displayString = display
    self.short = short
  }
  static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Cotización")
  static let defaultQuery = RateTypeQuery()
  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(displayString)")
  }
}

// EntityQuery requires init() and a stored default would be lost, so one query type per widget
protocol RateTypeCatalogQuery: EntityStringQuery {
  static var catalog: [RateType] { get }
}

extension RateTypeCatalogQuery where Entity == RateType {
  static var catalog: [RateType] {
    Helper.getRateTypes()
  }
  // in the order asked for, the list widget order is the configuration
  func entities(for identifiers: [String]) async throws -> [RateType] {
    identifiers.compactMap { id in Self.catalog.first { $0.id == id } }
  }
  func entities(matching string: String) async throws -> [RateType] {
    Self.catalog.filter { $0.displayString.localizedStandardContains(string) }
  }
  func suggestedEntities() async throws -> [RateType] {
    Self.catalog
  }
}

struct RateTypeQuery: RateTypeCatalogQuery {
  typealias Entity = RateType
  func defaultResult() async -> RateType? {
    Helper.getDefaultRateType()
  }
}

// DefaultValue is per query, so each list shape needs its own to keep its defaults
struct ListRateTypesQuery: RateTypeCatalogQuery {
  typealias Entity = RateType
  typealias DefaultValue = [RateType]
  func defaultResult() async -> [RateType]? {
    Helper.getDefaultRateTypes()
  }
}

struct SpreadRateTypesQuery: RateTypeCatalogQuery {
  typealias Entity = RateType
  typealias DefaultValue = [RateType]
  func defaultResult() async -> [RateType]? {
    Helper.getDefaultSpreadRateTypes()
  }
}

// the markets widgets pick from their own catalog, never mixed with the rates like the app tabs
struct MarketTypeQuery: RateTypeCatalogQuery {
  typealias Entity = RateType
  static var catalog: [RateType] {
    Helper.getMarketTypes()
  }
  func defaultResult() async -> RateType? {
    Helper.getMarketTypes().first
  }
}

struct ListMarketTypesQuery: RateTypeCatalogQuery {
  typealias Entity = RateType
  typealias DefaultValue = [RateType]
  static var catalog: [RateType] {
    Helper.getMarketTypes()
  }
  func defaultResult() async -> [RateType]? {
    Array(Helper.getMarketTypes().prefix(3))
  }
}

// raw values match the intentdefinition case names, so stored configurations migrate
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

// what a provider reads from its intent, so one provider serves every widget
@available(iOS 17.0, *)
protocol RateTypesIntent: WidgetConfigurationIntent {
  var types: [RateType] { get }
  var valueType: ValueType { get }
  // what the placeholder draws before there is a configuration
  static var defaultTypes: [RateType] { get }
}

// not discoverable or these intents land in the Shortcuts app as user facing actions
// non optional parameters, or the system never asks their query for a default
@available(iOS 17.0, *)
struct SelectRateTypeIntent: RateTypesIntent, CustomIntentMigratedAppIntent {
  static let intentClassName = "SelectRateTypeIntent"
  static let isDiscoverable = false
  static let title: LocalizedStringResource = "Select Rate Type"
  static let description = IntentDescription("Seleccionar cotización")
  @Parameter(title: "Cotización")
  var rateType: RateType
  @Parameter(title: "Mostrar", default: .sell)
  var valueType: ValueType
  var types: [RateType] { [rateType] }
  static var defaultTypes: [RateType] { [Helper.getDefaultRateType()] }
}

@available(iOS 17.0, *)
struct SelectRateTypesIntent: RateTypesIntent, CustomIntentMigratedAppIntent {
  static let intentClassName = "SelectRateTypesIntent"
  static let isDiscoverable = false
  static let title: LocalizedStringResource = "Select Rate Types"
  static let description = IntentDescription("Seleccionar cotizaciones")
  @Parameter(title: "Cotizaciones", size: [.systemSmall: 3, .systemMedium: 4, .systemLarge: 8, .systemExtraLarge: 12, .accessoryInline: 1, .accessoryCorner: 1, .accessoryCircular: 1, .accessoryRectangular: 2], query: ListRateTypesQuery())
  var rateTypes: [RateType]
  @Parameter(title: "Mostrar", default: .sell)
  var valueType: ValueType
  var types: [RateType] { rateTypes.isEmpty ? Self.defaultTypes : rateTypes }
  static var defaultTypes: [RateType] { Helper.getDefaultRateTypes() }
}

@available(iOS 17.0, *)
struct SelectSpreadRateTypesIntent: RateTypesIntent, CustomIntentMigratedAppIntent {
  static let intentClassName = "SelectSpreadRateTypesIntent"
  static let isDiscoverable = false
  static let title: LocalizedStringResource = "Select Spread Rate Types"
  static let description = IntentDescription("Seleccionar cotizaciones")
  @Parameter(title: "Cotizaciones", size: [.systemSmall: 2, .systemMedium: 4, .systemLarge: 8, .systemExtraLarge: 12, .accessoryInline: 1, .accessoryCorner: 1, .accessoryCircular: 2, .accessoryRectangular: 2], query: SpreadRateTypesQuery())
  var rateTypes: [RateType]
  var valueType: ValueType { .sell }
  var types: [RateType] { rateTypes.isEmpty ? Self.defaultTypes : rateTypes }
  static var defaultTypes: [RateType] { Helper.getDefaultSpreadRateTypes() }
}

// a market is a single value, so there is nothing to choose to show
@available(iOS 17.0, *)
struct SelectMarketTypeIntent: RateTypesIntent {
  static let isDiscoverable = false
  static let title: LocalizedStringResource = "Select Market Type"
  static let description = IntentDescription("Seleccionar indicador")
  @Parameter(title: "Indicador", query: MarketTypeQuery())
  var marketType: RateType
  var valueType: ValueType { .sell }
  var types: [RateType] { [marketType] }
  static var defaultTypes: [RateType] { [Helper.getMarketTypes()[0]] }
}

@available(iOS 17.0, *)
struct SelectMarketTypesIntent: RateTypesIntent {
  static let isDiscoverable = false
  static let title: LocalizedStringResource = "Select Market Types"
  static let description = IntentDescription("Seleccionar indicadores")
  @Parameter(title: "Indicadores", size: [.systemSmall: 3], query: ListMarketTypesQuery())
  var marketTypes: [RateType]
  var valueType: ValueType { .sell }
  var types: [RateType] { marketTypes.isEmpty ? Self.defaultTypes : marketTypes }
  static var defaultTypes: [RateType] { Array(Helper.getMarketTypes().prefix(3)) }
}
