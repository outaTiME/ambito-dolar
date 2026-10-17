//
//  RateWatchApp.swift
//  Ámbito Dólar
//
//  Created by outaTiME on 07/10/2026.
//

import SwiftUI

// the /fetch TTL on cloudfront, asking again before it ends brings the same rates
private let ratesCacheWindow: TimeInterval = 300
// same key as the app setting, a comma separated list since AppStorage takes no arrays
private let excludedRatesKey = "excluded_rates"
// the end shown for a buy and sell pair, the Mostrar parameter of the widgets
private let valueTypeKey = "value_type"
// same keys and values as the app order settings
private let rateOrderKey = "rate_order"
private let rateOrderDirectionKey = "rate_order_direction"
private let rateTypesKey = "rate_types"

// the orders of the app, with its texts
enum RateOrder: String, CaseIterable {
  case `default`, name, price, change, update, custom

  var displayName: String {
    switch self {
    case .default: "Predeterminado"
    case .name: "Nombre"
    case .price: "Valor"
    case .change: "Variación"
    case .update: "Actualización"
    case .custom: "Manual"
    }
  }
}

enum OrderDirection: String {
  case asc, desc
}

// FiraGO at the size of a system text style
// the rate rows use it for the arrows, the other amounts so they read the same
private func firaFont(_ style: UIFont.TextStyle) -> Font {
  Font.custom(fontName, fixedSize: UIFont.preferredFont(forTextStyle: style).pointSize)
}

// every catalog rate excluded, left by a release that retires the only rate on, reads as none
private func excludedSet(_ raw: String) -> Set<String> {
  let excluded = Set(raw.split(separator: ",").map(String.init))
  return Helper.getRateTypes().allSatisfy { excluded.contains($0.id) } ? [] : excluded
}

// the position in the manual order, a rate missing from it goes last
private func manualIndex(_ id: String, _ rateTypes: String) -> Int {
  let manual = rateTypes.split(separator: ",").map(String.init)
  return manual.firstIndex(of: id) ?? manual.count
}

// getSortedRates of the app, descending flips the comparison so ties keep their place like orderBy
private func sortedRates(_ rates: [RateValue], order: RateOrder, direction: OrderDirection, rateTypes: String) -> [RateValue] {
  func by<T: Comparable>(_ key: (RateValue) -> T) -> [RateValue] {
    rates.sorted { direction == .desc ? key($0) > key($1) : key($0) < key($1) }
  }
  return switch order {
  case .default: direction == .desc ? rates.reversed() : rates
  case .name: by(\.name)
  case .price: by(\.priceValue)
  case .change: by(\.changeValue)
  case .update: by(\.dateValue)
  case .custom: by { manualIndex($0.id, rateTypes) }
  }
}

// the selection comes from the catalog, a selected rate the payload lacks is left out
private func visibleRates(_ rates: [String: Any]?, excludedRates: String, valueType: ValueType, order: RateOrder, direction: OrderDirection, rateTypes: String) -> [RateValue] {
  let excluded = excludedSet(excludedRates)
  let values = lookupRateValues(rates: rates, rateTypes: Helper.getRateTypes().filter { !excluded.contains($0.id) }, valueType: valueType)
  return sortedRates(values, order: order, direction: direction, rateTypes: rateTypes)
}

@MainActor
final class RatesModel: ObservableObject {
  @Published var rates: [String: Any]? = storedRates()
  @Published var failed = false
  // a second activation while the first call waits would request again, both see an old payload
  private var refreshing = false

  // inside the window this is the stored payload and no request, so reopening the app is free
  func refresh(cacheWindow: TimeInterval = ratesCacheWindow) async {
    guard !refreshing else {
      return
    }
    refreshing = true
    defer { refreshing = false }
    failed = false
    let fresh = await getRates(cacheWindow: cacheWindow)
    // animated so the numeric transitions of the rows run, a widget gets that from the system
    withAnimation {
      rates = fresh
    }
    failed = rates == nil
  }
}

@main
struct RateWatchApp: App {
  @StateObject private var model = RatesModel()
  @Environment(\.scenePhase) private var scenePhase

  var body: some Scene {
    WindowGroup {
      // the converter a swipe away, one stack around both for the titles
      NavigationStack {
        TabView {
          ContentView(model: model)
          ConverterView(model: model)
        }
        .tabViewStyle(.page)
      }
      .onChange(of: scenePhase, initial: true) { _, phase in
        if phase == .active {
          Task { await model.refresh() }
        }
      }
    }
  }
}

struct ContentView: View {
  @ObservedObject var model: RatesModel
  @AppStorage(excludedRatesKey) private var excludedRates = ""
  @AppStorage(valueTypeKey) private var valueType = ValueType.sell
  @AppStorage(rateOrderKey) private var order = RateOrder.default
  @AppStorage(rateOrderDirectionKey) private var direction = OrderDirection.asc
  @AppStorage(rateTypesKey) private var rateTypes = ""
  @State private var showSettings = false
  @State private var trim = false

  var body: some View {
    content
      // a sheet like the watch apps settings, its stack is where Mostrar and Orden push
      .sheet(isPresented: $showSettings) {
        NavigationStack {
          SettingsView()
        }
      }
  }

  @ViewBuilder
  private var content: some View {
    let rows = visibleRates(model.rates, excludedRates: excludedRates, valueType: valueType, order: order, direction: direction, rateTypes: rateTypes)
    if model.rates == nil {
      if model.failed {
        // same message and action as InitialScreen in the app
        retry("Imposible obtener las cotizaciones.") {
          Task { await model.refresh() }
        }
      } else {
        ProgressView()
      }
    } else if rows.isEmpty {
      // same text as the list widget when none of its rates came back, other rates can be picked
      VStack {
        retry("Cotizaciones no disponibles") {
          // the stored payload is what came back without these rates, so this one skips it
          Task { await model.refresh(cacheWindow: 0) }
        }
        settingsButton
      }
    } else {
      // the title goes with the list only, the other states center on the screen without it
      // the most characters stands for the widest row, close enough for a proportional font
      let longest = rows.max { ($0.name + $0.price).count < ($1.name + $1.price).count }
      List {
        Section {
          ForEach(rows) { rate in
            RateRow(rate: rate, cents: !trim)
              .background {
                if let longest {
                  CentsProbe(name: longest.name, value: longest.price, trim: $trim)
                }
              }
          }
        } footer: {
          // not in the corner, a trailing toolbar item centers the time on watchOS 10 to 26 and truncates the title
          settingsButton
        }
      }
      .navigationTitle("Cotizaciones")
    }
  }

  // small and secondary so it goes with the rates, the whole 44pt row is the target and its air
  private var settingsButton: some View {
    Button {
      showSettings = true
    } label: {
      Label("Personalizar", systemImage: "line.3.horizontal.decrease")
        .frame(maxWidth: .infinity, minHeight: 44)
        .contentShape(Rectangle())
    }
    .font(.footnote)
    .foregroundStyle(.secondary)
    .buttonStyle(.borderless)
  }

  // a plain stack the system centers, ContentUnavailableView anchors to the top on watchOS
  private func retry(_ message: String, action: @escaping () -> Void) -> some View {
    VStack {
      Text(message)
        .multilineTextAlignment(.center)
      Button("Reintentar", action: action)
    }
  }
}

// a list drops every cent once its longest row no longer fits, measured with the cents so the answer
// never feeds itself, and on every row since a List only lays out the visible ones
struct CentsProbe: View {
  let name: String
  let value: String
  @Binding var trim: Bool
  // the fonts read the text size on render, this redraws the probe when it changes
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  var body: some View {
    // the child shown changes when the fit does, its onAppear is the answer
    ViewThatFits(in: .horizontal) {
      HStack {
        Text(name)
        Spacer()
        Text(value)
      }
      .lineLimit(1)
      .hidden()
      .onAppear { trim = false }
      Color.clear
        .onAppear { trim = true }
    }
    // a background does not inherit the font of the row it measures
    .font(firaFont(.body))
  }
}

// a name and its value on one line, on a small watch the value goes under the name on the trailing edge
private func fittingLine(_ name: String, _ value: String) -> some View {
  ViewThatFits(in: .horizontal) {
    HStack(alignment: .firstTextBaseline) {
      Text(name)
      Spacer()
      Text(value)
    }
    VStack(alignment: .leading) {
      Text(name)
      Text(value)
        .minimumScaleFactor(0.6)
        .frame(maxWidth: .infinity, alignment: .trailing)
    }
  }
  .font(firaFont(.body))
  .lineLimit(1)
  .accessibilityElement(children: .combine)
}

// the two lines of the list widget, name and price, then date and change
struct RateRow: View {
  let rate: RateValue
  var cents: Bool
  // the fonts read the text size on render, this redraws the row when it changes
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  var body: some View {
    VStack(alignment: .leading) {
      HStack(alignment: .firstTextBaseline) {
        Text(rate.name)
          .minimumScaleFactor(0.9)
        Spacer()
        Text(cents ? rate.price : formatRateCurrency(num: rate.priceValue, cents: false))
          .layoutPriority(1)
          .contentTransition(.numericText(value: rate.priceValue))
      }
      .font(firaFont(.body))
      HStack(alignment: .firstTextBaseline) {
        Text(rate.date)
          .foregroundStyle(.secondary)
          .contentTransition(.numericText(value: rate.dateValue))
        Spacer()
        Text(rate.change)
          .foregroundStyle(rate.changeColor)
          .layoutPriority(1)
          .contentTransition(.numericText(value: rate.changeValue))
      }
      .font(firaFont(.footnote))
    }
    .lineLimit(1)
    // one element for voiceover, the name, price, date and change read in order
    .accessibilityElement(children: .combine)
  }
}

struct SettingsView: View {
  @AppStorage(excludedRatesKey) private var excludedRates = ""
  @AppStorage(valueTypeKey) private var valueType = ValueType.sell
  @AppStorage(rateOrderKey) private var order = RateOrder.default
  @AppStorage(rateOrderDirectionKey) private var direction = OrderDirection.asc
  @AppStorage(rateTypesKey) private var rateTypes = ""

  var body: some View {
    // the app customize screen, the rates in the manual order whatever the order shown
    let types = Helper.getRateTypes().sorted { manualIndex($0.id, rateTypes) < manualIndex($1.id, rateTypes) }
    List {
      // same options and default as the Mostrar parameter of the widgets
      Picker("Mostrar", selection: $valueType) {
        ForEach(ValueType.allCases, id: \.self) { type in
          Text(type.displayName)
        }
      }
      // a row like Mostrar that opens the app rate order screen
      NavigationLink {
        OrderView()
      } label: {
        VStack(alignment: .leading) {
          Text("Orden")
          Text(order.displayName)
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      }
      Section {
        ForEach(types) { type in
          Toggle(isOn: visible(type.id)) {
            Text(type.displayString)
              .lineLimit(1)
          }
          // the last rate on stays on, so the selection is never emptied by hand
          .disabled(isLastVisible(type.id))
        }
        // a move leaves the order manual and ascending like the app
        .onMove { from, to in
          var ids = types.map(\.id)
          ids.move(fromOffsets: from, toOffset: to)
          // a drop where it was changes nothing, like the app
          guard ids != types.map(\.id) else {
            return
          }
          rateTypes = ids.joined(separator: ",")
          order = .custom
          direction = .asc
        }
      } header: {
        Text("Cotizaciones")
      } footer: {
        Text("Mantené presionada una cotización y arrastrala para ordenarla.")
      }
      // an action and not a row, a capsule like Reordenar in the Workout settings
      Section {
        Button("Restablecer") {
          excludedRates = ""
          valueType = .sell
          order = .default
          direction = .asc
          rateTypes = ""
        }
        .buttonStyle(.bordered)
        .listRowBackground(Color.clear)
      }
    }
  }

  private func isLastVisible(_ id: String) -> Bool {
    let excluded = excludedSet(excludedRates)
    return !excluded.contains(id) && Helper.getRateTypes().allSatisfy { $0.id == id || excluded.contains($0.id) }
  }

  private func visible(_ id: String) -> Binding<Bool> {
    Binding(
      get: { !excludedSet(excludedRates).contains(id) },
      set: { isVisible in
        let excluded = excludedSet(excludedRates)
        let next = isVisible ? excluded.subtracting([id]) : excluded.union([id])
        excludedRates = next.sorted().joined(separator: ",")
      }
    )
  }
}

// the app rate order screen, the criteria and the direction with its texts
struct OrderView: View {
  @AppStorage(rateOrderKey) private var order = RateOrder.default
  @AppStorage(rateOrderDirectionKey) private var direction = OrderDirection.asc

  var body: some View {
    List {
      // no header, the title already says Orden like the app
      Picker("Orden", selection: $order) {
        ForEach(RateOrder.allCases, id: \.self) { order in
          Text(order.displayName)
        }
      }
      .labelsHidden()
      Picker("Dirección", selection: $direction) {
        Text("Ascendente").tag(OrderDirection.asc)
        Text("Descendente").tag(OrderDirection.desc)
      }
    }
    .pickerStyle(.inline)
    .navigationTitle("Orden")
  }
}

// the app conversion screen, a tap on the amount opens the keypad and one on the direction swaps it
struct ConverterView: View {
  @ObservedObject var model: RatesModel
  @AppStorage(excludedRatesKey) private var excludedRates = ""
  @AppStorage(valueTypeKey) private var valueType = ValueType.sell
  @AppStorage(rateOrderKey) private var order = RateOrder.default
  @AppStorage(rateOrderDirectionKey) private var direction = OrderDirection.asc
  @AppStorage(rateTypesKey) private var rateTypes = ""
  // the fonts read the text size on render, this redraws the rows when it changes
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @State private var amount: Double = 1
  @State private var toPeso = true
  @State private var editing = false
  @State private var trim = false

  var body: some View {
    List {
      // the number alone and centered like the app input, a tap opens the keypad
      Button {
        editing = true
      } label: {
        // two decimals at most, rounded down like the rates
        Text(amount.formatted(.number.precision(.fractionLength(0...2)).rounded(rule: .down)))
          .font(firaFont(.title3))
          .lineLimit(1)
          .minimumScaleFactor(0.5)
          .frame(maxWidth: .infinity)
      }
      // the Divisa and Peso tabs of the app as one toggle, the text says the direction it shows
      Button {
        toPeso.toggle()
      } label: {
        Text(toPeso ? "Divisa → Peso" : "Peso → Divisa")
          .frame(maxWidth: .infinity)
      }
      Section("Cotizaciones") {
        let rates = visibleRates(model.rates, excludedRates: excludedRates, valueType: valueType, order: order, direction: direction, rateTypes: rateTypes)
        let longest = rates.max { ($0.name + converted($0)).count < ($1.name + converted($1)).count }
        ForEach(rates) { rate in
          fittingLine(rate.name, converted(rate, cents: !trim))
            .background {
              if let longest {
                CentsProbe(name: longest.name, value: converted(longest), trim: $trim)
              }
            }
        }
      }
    }
    // the 44pt default left a short token in a tall platter, 40 matches the air of the list cards
    .environment(\.defaultMinListRowHeight, 40)
    .navigationTitle("Conversor")
    .sheet(isPresented: $editing) {
      AmountKeypad(amount: $amount)
    }
  }

  // formatCurrency of the app, the symbol of the side the amount turns into
  private func converted(_ rate: RateValue, cents: Bool = true) -> String {
    if toPeso {
      return "$" + formatRateCurrency(num: amount * rate.priceValue, cents: cents)
    }
    let symbol = switch rate.id {
    case "euro", "euro_informal": "€"
    case "real": "R$"
    default: "US$"
    }
    return symbol + formatRateCurrency(num: amount / rate.priceValue, cents: cents)
  }
}

// a keypad like Calculator, watchOS has no numeric keyboard, empty at first like the app input
struct AmountKeypad: View {
  @Binding var amount: Double
  @Environment(\.dismiss) private var dismiss
  // the fonts read the text size on render, this redraws the amount when it changes
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  // typed with a dot whatever the region, the separators are only for display
  @State private var input = ""
  private let separator = NumberFormatter().decimalSeparator ?? "."

  var body: some View {
    NavigationStack {
      VStack(spacing: 4) {
        Text(formatInput(input))
          .font(firaFont(.title3))
          .foregroundStyle(input.isEmpty ? .secondary : .primary)
          .lineLimit(1)
          .minimumScaleFactor(0.5)
          .frame(maxWidth: .infinity, alignment: .trailing)
          .scenePadding(.horizontal)
        keypad
      }
      // a title keeps the amount below the corner buttons
      .navigationTitle("Monto")
      .toolbar {
        ToolbarItem(placement: .confirmationAction) {
          Button("Listo", systemImage: "checkmark") {
            amount = Double(input) ?? amount
            dismiss()
          }
          // available once there is an amount, the X keeps the previous one
          .disabled((Double(input) ?? 0) == 0)
        }
      }
    }
  }

  private var keypad: some View {
    Grid(horizontalSpacing: 4, verticalSpacing: 4) {
      ForEach([["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], [".", "0", "⌫"]], id: \.self) { row in
        GridRow {
          ForEach(row, id: \.self) { key in
            // plain keys, a system button is a whole row and too tall for a keypad
            Button {
              type(key)
            } label: {
              Group {
                if key == "⌫" {
                  Image(systemName: "delete.left")
                    .accessibilityLabel("Borrar")
                } else {
                  Text(key == "." ? separator : key)
                }
              }
              .font(.title3)
              .frame(maxWidth: .infinity, maxHeight: .infinity)
              .background(.quaternary, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)
          }
        }
      }
    }
  }

  private func type(_ key: String) {
    if key == "⌫" {
      input = String(input.dropLast())
    } else if key == "." {
      if !input.contains(".") {
        input = (input.isEmpty ? "0" : input) + "."
      }
    } else if let dot = input.firstIndex(of: ".") {
      // two decimals, like the app
      if input[dot...].count <= 2 {
        input += key
      }
    } else if input.count < 12 {
      input = input == "0" ? key : input + key
    }
  }

  // the integer part grouped as the device does, the decimals as typed so a trailing zero shows
  private func formatInput(_ input: String) -> String {
    let parts = input.split(separator: ".", omittingEmptySubsequences: false)
    let nf = NumberFormatter()
    nf.numberStyle = .decimal
    let head = nf.string(for: Double(parts.first ?? "") ?? 0) ?? "0"
    return parts.count > 1 ? head + separator + parts[1] : head
  }
}
