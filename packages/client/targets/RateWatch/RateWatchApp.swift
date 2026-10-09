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

// FiraGO at the size of a system text style
// only the rate rows use it, for the arrows
private func firaFont(_ style: UIFont.TextStyle) -> Font {
  Font.custom(fontName, fixedSize: UIFont.preferredFont(forTextStyle: style).pointSize)
}

// every catalog rate excluded, left by a release that retires the only rate on, reads as none
private func excludedSet(_ raw: String) -> Set<String> {
  let excluded = Set(raw.split(separator: ",").map(String.init))
  return Helper.getRateTypes().allSatisfy { excluded.contains($0.id) } ? [] : excluded
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
  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}

struct ContentView: View {
  @StateObject private var model = RatesModel()
  @AppStorage(excludedRatesKey) private var excludedRates = ""
  @AppStorage(valueTypeKey) private var valueType = ValueType.sell
  @Environment(\.scenePhase) private var scenePhase
  @State private var showSettings = false

  var body: some View {
    NavigationStack {
      content
        .toolbar {
          // nothing to customize until there are rates, like the error screen of the app
          if model.rates != nil {
            ToolbarItem(placement: .topBarTrailing) {
              // the title of the app screen it opens, read by voiceover, the toolbar shows the icon only
              Button("Personalizar", systemImage: "line.3.horizontal.decrease") {
                showSettings = true
              }
            }
          }
        }
    }
    // a sheet like the settings of the watch apps, the system adds the close button and the
    // stack is what the Mostrar picker pushes its options on
    .sheet(isPresented: $showSettings) {
      NavigationStack {
        SettingsView()
      }
    }
    .onChange(of: scenePhase, initial: true) { _, phase in
      if phase == .active {
        Task { await model.refresh() }
      }
    }
  }

  @ViewBuilder
  private var content: some View {
    let excluded = excludedSet(excludedRates)
    // the selection comes from the catalog, a selected rate the payload lacks is left out
    let selected = Helper.getRateTypes().filter { !excluded.contains($0.id) }
    let rows = lookupRateValues(rates: model.rates, rateTypes: selected, valueType: valueType)
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
      // same text as the list widget when none of its rates came back
      retry("Cotizaciones no disponibles") {
        // the stored payload is what came back without these rates, so this one skips it
        Task { await model.refresh(cacheWindow: 0) }
      }
    } else {
      // the title goes with the list only, the other states center on the screen without it
      List(rows) { rate in
        RateRow(rate: rate)
      }
      .navigationTitle("Cotizaciones")
    }
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

// the two lines of the list widget, name and price, then date and change
struct RateRow: View {
  let rate: RateValue
  // the fonts read the text size on render, this redraws the row when it changes
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  var body: some View {
    VStack(alignment: .leading) {
      HStack(alignment: .firstTextBaseline) {
        Text(rate.name)
          .minimumScaleFactor(0.9)
        Spacer()
        Text(rate.price)
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

  var body: some View {
    List {
      // same options and default as the Mostrar parameter of the widgets
      Picker("Mostrar", selection: $valueType) {
        ForEach(ValueType.allCases, id: \.self) { type in
          Text(type.displayName)
        }
      }
      Section("Cotizaciones") {
        ForEach(Helper.getRateTypes()) { type in
          Toggle(isOn: visible(type.id)) {
            Text(type.displayString)
              .lineLimit(1)
          }
          // the last rate on stays on, so the selection is never emptied by hand
          .disabled(isLastVisible(type.id))
        }
      }
      // back to every rate and the default end, an action and not a row, so a capsule like the
      // Reordenar button of the Workout settings
      Section {
        Button("Restablecer") {
          excludedRates = ""
          valueType = .sell
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
        var excluded = excludedSet(excludedRates)
        if isVisible {
          excluded.remove(id)
        } else {
          excluded.insert(id)
        }
        excludedRates = excluded.sorted().joined(separator: ",")
      }
    )
  }
}
