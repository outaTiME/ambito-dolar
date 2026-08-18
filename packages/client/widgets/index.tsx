// @ts-nocheck
import AmbitoDolar from '@ambito-dolar/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import * as _ from 'lodash';
import { requestWidgetUpdate } from 'react-native-android-widget';

import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';
import WidgetCard from '@/widgets/WidgetCard';

const RATE_TYPES = AmbitoDolar.getAvailableRateTypes();

const DEFAULT_VALUE = 'sell';

// android cannot repaint a widget on a system theme change, so every surface that
// renders a card is dark, same as the forced color scheme on ios
const THEME = 'dark';

export const getStorageKey = (widgetInfo) =>
  `${widgetInfo.widgetName}:${widgetInfo.widgetId}:config`;

// one line per redraw, tells which instance, what triggered it and what it ended up
// showing, the logcat timestamp already gives when it happened
export const logWidget = (trigger, widgetInfo, widgetProps = {}) => {
  if (!__DEV__) {
    return;
  }
  const { title, detail, big, rows } = widgetProps;
  const content = rows
    ? rows.map((row) => `${row.name} ${row.price}`).join(', ')
    : big && `${title}${detail ? ` (${detail})` : ''} ${big}`;
  Helper.debug(
    `🧩 ${widgetInfo.widgetName}#${widgetInfo.widgetId}`,
    trigger,
    `${widgetInfo.width}x${widgetInfo.height}`,
    content || 'sin datos',
  );
};

const getRateValue = (value, type) => {
  // use value from single changes
  const buy = Array.isArray(value) ? value[0] : value;
  const sell = Array.isArray(value) ? value[1] : value;
  if (type === 'buy') {
    return buy;
  } else if (type === 'average') {
    return (buy + sell) / 2;
  }
  return sell;
};

// one rate resolved into the pieces the widgets show, they only differ in which slot
// each piece lands on
const resolveRate = (type, config, rates) => {
  const [timestamp, value, change] = rates[type];
  return {
    name: AmbitoDolar.getRateTitle(type),
    price: Helper.getInlineRateValue(getRateValue(value, config.value)),
    timestamp,
    // eslint-disable-next-line no-sparse-arrays
    change: AmbitoDolar.getRateChange([, , change], true),
    changeColor: Helper.getRgbaColor(Helper.getChangeColor(change, THEME)),
    // only rates with a buy/sell pair have a value type to show, same as ios
    hasPair: Array.isArray(value),
  };
};

const buildRateProps = (config, rates) => {
  const [type] = config.rateTypes;
  const rate = resolveRate(type, config, rates);
  return {
    timestamp: rate.timestamp,
    title: rate.name,
    detail: rate.hasPair ? I18n.t(config.value) : undefined,
    small: rate.change,
    smallColor: rate.changeColor,
    big: rate.price,
    bigColor: '#FFF',
    uri: `ambito-dolar://rates/${type}`,
  };
};

// same formula as the app spreads section (screens/RateDetailScreen.tsx) and ios
const buildSpreadProps = (config, rates) => {
  const [first, second] = config.rateTypes;
  const firstValue = AmbitoDolar.getRateValue(rates[first]);
  const secondValue = AmbitoDolar.getRateValue(rates[second]);
  const change = (firstValue / secondValue - 1) * 100;
  return {
    // the later of the two, same as ios
    timestamp:
      rates[first][0] > rates[second][0] ? rates[first][0] : rates[second][0],
    title: 'Brecha',
    detail: `${AmbitoDolar.getRateTitle(first)} → ${AmbitoDolar.getRateTitle(second)}`,
    small: AmbitoDolar.formatRateChange(firstValue - secondValue, false),
    smallColor: '#FFF',
    big: AmbitoDolar.formatRateChange(change),
    bigColor: Helper.getRgbaColor(Helper.getChangeColor(change, THEME)),
    uri: `ambito-dolar://rates/${first}`,
  };
};

// what is left of a row once its rate stops coming from the service
const BLANK_ROW = { name: ' ', price: ' ', change: ' ', changeColor: '#FFF' };

// one row per configured rate, each with its own timestamp. An unresolved slot stays
// blank so the rest keep their place instead of spreading over the card, same as ios
const buildListProps = (config, rates) => ({
  rows: _.times(WIDGETS.List.rateTypes.length, (index) => {
    const type = config.rateTypes[index];
    return type ? resolveRate(type, config, rates) : BLANK_ROW;
  }),
  uri: 'ambito-dolar://rates',
});

// one entry per widget, in ios bundle order (RateWidgets.swift). Everything that differs
// between widgets lives here: how many rates it takes, how few it can still render,
// whether it has a value type to pick, what it says with no data, and how it fills the
// card. Adding a widget means one entry plus its app.config.ts declaration, nothing else
export const WIDGETS = {
  Rate: {
    // ios/RateWidgets/Utils/Helper.swift
    rateTypes: RATE_TYPES.slice(0, 1),
    min: 1,
    value: true,
    // ios/RateWidgets/RateWidgets.swift, singular where a single rate is shown
    empty: 'Cotización no disponible',
    build: buildRateProps,
  },
  List: {
    rateTypes: RATE_TYPES.slice(0, 3),
    // ios pads the slots it could not resolve and shows the rest
    min: 1,
    value: true,
    empty: 'Cotizaciones no disponibles',
    build: buildListProps,
  },
  Spread: {
    rateTypes: [RATE_TYPES[2], RATE_TYPES[1]],
    // a spread needs both sides
    min: 2,
    // a spread compares two whole rates, there is no buy or sell to pick
    value: false,
    empty: 'Cotizaciones no disponibles',
    build: buildSpreadProps,
  },
};

// the launcher picker sorts by label and ignores this order
export const WIDGET_NAMES = Object.keys(WIDGETS);

// the only props a widget can still render once there is nothing to show
const getEmptyProps = (widgetInfo) => ({
  // keep the card square, the cell is taller than wide on some launchers
  size: Math.min(widgetInfo.width, widgetInfo.height),
  empty: WIDGETS[widgetInfo.widgetName].empty,
});

// the widget defaults filled in over what was stored, every surface reads the config
// through here so they cannot drift apart
export const getConfig = (widgetName, stored) => ({
  rateTypes: stored?.rateTypes ?? WIDGETS[widgetName].rateTypes,
  value: stored?.value ?? DEFAULT_VALUE,
});

// the store keeps the whole series, the widgets only ever show the last one
const lastStats = (rates) => _.mapValues(rates, (rate) => _.last(rate.stats));

// same props the widget would get with its defaults, for the in app preview and for
// the picker images built from it
export const getPreviewProps = (widgetName, rates) =>
  WIDGETS[widgetName].build(getConfig(widgetName), lastStats(rates));

export const getWidgetProps = async (
  widgetInfo,
  optimistic,
  { rates } = {},
) => {
  // AppContainer does this on foreground, but the headless task and the configuration
  // activity never mount it and would format with the core defaults instead
  const locale = Localization.getLocales()?.[0];
  AmbitoDolar.setDelimiters({
    thousands: locale?.digitGroupingSeparator,
    decimal: locale?.decimalSeparator,
  });
  const emptyProps = getEmptyProps(widgetInfo);
  try {
    const stored = await AsyncStorage.getItem(getStorageKey(widgetInfo))
      .then((value) => JSON.parse(value ?? '{}'))
      .catch(console.warn);
    const widget = WIDGETS[widgetInfo.widgetName];
    const config = getConfig(widgetInfo.widgetName, stored);
    if (!rates) {
      rates = await Helper.getJson(Settings.API_URL + '/fetch');
    } else {
      // use store data to avoid service call (same as fetch service)
      rates = lastStats(rates);
    }
    // a retired rate type stops coming from the service, ios drops it and renders what
    // is left instead of taking the widget down
    config.rateTypes = config.rateTypes.filter((type) => rates[type]);
    if (config.rateTypes.length < widget.min) {
      return emptyProps;
    }
    return {
      ...emptyProps,
      ...widget.build(config, rates),
    };
  } catch (e) {
    if (optimistic === true) {
      return emptyProps;
    }
    throw e;
  }
};

export async function taskHandler(props) {
  const widgetInfo = props.widgetInfo;
  switch (props.widgetAction) {
    // the layout is derived from the reported size, a resize needs a fresh render too
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      await getWidgetProps(widgetInfo, props.widgetAction === 'WIDGET_ADDED')
        .then((widgetProps) => {
          logWidget(props.widgetAction, widgetInfo, widgetProps);
          props.renderWidget(<WidgetCard {...widgetProps} />);
        })
        .catch((e) => {
          logWidget(`${props.widgetAction} sin redibujar`, widgetInfo);
          console.warn(e);
        });
      break;
    case 'WIDGET_DELETED':
      logWidget(props.widgetAction, widgetInfo);
      await AsyncStorage.removeItem(getStorageKey(widgetInfo)).catch(
        console.warn,
      );
      break;
    default:
      break;
  }
}

export const reloadWidgets = (data) =>
  WIDGET_NAMES.forEach((widgetName) =>
    requestWidgetUpdate({
      widgetName,
      renderWidget: (widgetInfo) =>
        getWidgetProps(widgetInfo, false, data)
          .then((widgetProps) => {
            logWidget('APP', widgetInfo, widgetProps);
            return <WidgetCard {...widgetProps} />;
          })
          .catch((e) => {
            logWidget('APP sin datos', widgetInfo);
            console.warn(e);
            // renderWidget must always return a tree, undefined breaks requestWidgetUpdate
            return <WidgetCard {...getEmptyProps(widgetInfo)} />;
          }),
    }),
  );
