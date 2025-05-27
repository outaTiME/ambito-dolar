import AmbitoDolar from '@ambito-dolar/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StatusBar from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as _ from 'lodash';
import React from 'react';
import { View, ScrollView, useColorScheme } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from 'styled-components';

import RateWidget from './RateWidget';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import ContentView from '../components/ContentView';
import HeaderButton from '../components/HeaderButton';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';
import Sentry from '../utilities/Sentry';

const nameToWidget = {
  Rate: RateWidget,
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

export const getWidgetProps = async (
  widgetInfo,
  optimistic,
  { rates } = {},
) => {
  const size = widgetInfo.width;
  try {
    const storageKey = `${widgetInfo.widgetName}:${widgetInfo.widgetId}:config`;
    const config = await AsyncStorage.getItem(storageKey)
      .then((value) => JSON.parse(value ?? '{}'))
      .catch(console.warn);
    const rateTypes = AmbitoDolar.getAvailableRateTypes();
    const type = config?.rate ?? rateTypes[0];
    if (!rates) {
      // TODO: export fetch uri to env
      rates = await Helper.getJson('https://api.ambito-dolar.app/fetch');
    } else {
      // use store data to avoid service call (same as fetch service)
      rates = Object.entries(rates).reduce((obj, [type, rate]) => {
        obj[type] = _.last(rate.stats);
        return obj;
      }, {});
    }
    /* const [timestamp, value, change] = [
      '2024-04-25T15:45:24-03:00',
      [1010, 1040],
      0,
      1040,
      1040,
      '3ac8a499f49d9a2bb52b212720659168',
    ]; */
    // const [timestamp, value, change] = [];
    const [timestamp, value, change] = rates[type];
    return {
      size,
      type,
      change,
      value: getRateValue(value, config?.value),
      // timestamp,
      timestamp: Date.now(),
    };
  } catch (e) {
    if (optimistic === true) {
      // optimistic update
      return {
        size,
      };
    }
    throw e;
  }
};

export async function taskHandler(props) {
  const widgetInfo = props.widgetInfo;
  const Widget = nameToWidget[widgetInfo.widgetName];
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
      console.log(
        '>>> taskHandler (renderWidget) (before)',
        props.widgetAction,
        widgetInfo,
      );
      await getWidgetProps(widgetInfo, props.widgetAction === 'WIDGET_ADDED')
        .then((widgetProps) => {
          console.log(
            '>>> taskHandler (renderWidget) (after)',
            AmbitoDolar.getTimezoneDate().format(),
            props.widgetAction,
            widgetProps,
          );
          props.renderWidget(<Widget {...widgetProps} />);
        })
        .catch((e) => {
          console.warn(e);
          // trace and ignore render
        });
      break;
    default:
      break;
  }
}

// TODO: same maxFontSizeMultiplier as defined in the app ???
export const ConfigurationScreen = Sentry.wrap((props) => {
  const colorScheme = useColorScheme();
  const theme = { colorScheme };
  React.useEffect(() => {
    async function prepare() {
      try {
        const statusBarStyle = Helper.getInvertedTheme(colorScheme);
        StatusBar.setStatusBarStyle(statusBarStyle);
        const backgroundColor = Settings.getBackgroundColor(colorScheme);
        await SystemUI.setBackgroundColorAsync(backgroundColor);
        // additional async stuff here
      } catch (e) {
        console.warn(e);
      }
    }
    prepare();
  }, [colorScheme]);
  // resources
  const [appIsReady, setAppIsReady] = React.useState(false);
  const appIsLoading = !appIsReady;
  // settings
  const widgetInfo = props.widgetInfo;
  const storageKey = React.useMemo(
    () => `${widgetInfo.widgetName}:${widgetInfo.widgetId}:config`,
    [widgetInfo.widgetName, widgetInfo.widgetId],
  );
  const [config, setConfig] = React.useState();
  React.useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        setConfig(JSON.parse(value ?? '{}'));
      })
      .catch(console.warn)
      .finally(() => {
        setAppIsReady(true);
      });
  }, [storageKey]);
  const rateTypes = AmbitoDolar.getAvailableRateTypes();
  const Widget = nameToWidget[widgetInfo.widgetName];
  const saveSetting = React.useCallback(
    (key, value) => {
      const newConfig = { ...config, [key]: value };
      if (!_.isEqual(config, newConfig)) {
        AsyncStorage.setItem(storageKey, JSON.stringify(newConfig))
          .catch(console.warn)
          .finally(() => {
            setConfig(newConfig);
            getWidgetProps(widgetInfo, true).then((widgetProps) => {
              console.log(
                '>>> ConfigurationScreen (renderWidget)',
                AmbitoDolar.getTimezoneDate().format(),
                widgetProps,
              );
              props.renderWidget(<Widget {...widgetProps} />);
            });
          });
      }
    },
    [config, storageKey],
  );
  if (appIsLoading === false) {
    return (
      <GestureHandlerRootView>
        <SafeAreaProvider>
          <ThemeProvider theme={theme}>
            <ScrollView>
              <ContentView contentContainerStyle={{ flex: 1 }}>
                <View
                  style={{
                    // backgroundColor: 'red',
                    paddingVertical: Settings.CARD_PADDING,
                    // marginHorizontal: -(Settings.CARD_PADDING * 2),
                    marginHorizontal: Settings.CARD_PADDING,
                    // paddingHorizontal: Settings.PADDING,
                    flexDirection: 'row',
                    ...(true && {
                      marginBottom: -Settings.CARD_PADDING,
                      justifyContent: 'flex-end',
                    }),
                  }}
                >
                  <HeaderButton.Icon
                    iconName="close"
                    onPress={() => {
                      props.setResult('ok');
                    }}
                  />
                </View>
                <CardView title="Cotización" plain>
                  {rateTypes.map((type, index) => (
                    <CardItemView
                      key={type}
                      title={AmbitoDolar.getRateTitle(type)}
                      useSwitch={false}
                      chevron={false}
                      check={
                        config.rate === type || (!config.rate && index === 0)
                      }
                      onAction={() => {
                        saveSetting('rate', type);
                      }}
                    />
                  ))}
                </CardView>
                <CardView title="Mostrar" plain>
                  {['buy', 'average', 'sell'].map((type, index) => (
                    <CardItemView
                      key={type}
                      title={I18n.t(type)}
                      useSwitch={false}
                      chevron={false}
                      check={
                        config.value === type || (!config.value && index === 2)
                      }
                      onAction={() => {
                        saveSetting('value', type);
                      }}
                    />
                  ))}
                </CardView>
              </ContentView>
            </ScrollView>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }
  // TODO: add spinner ???
  // wait for resources
});

export const reloadWidgets = (data) =>
  requestWidgetUpdate({
    widgetName: 'Rate',
    renderWidget: (widgetInfo) =>
      getWidgetProps(widgetInfo, false, data)
        .then((widgetProps) => {
          console.log(
            '>>> reloadWidgets (renderWidget)',
            AmbitoDolar.getTimezoneDate().format(),
            widgetProps,
          );
          return <RateWidget {...widgetProps} />;
        })
        .catch(console.warn),
  });
