// @ts-nocheck
// android only, this screen runs in RNWidgetConfigurationActivity and pulls in
// @expo/ui/jetpack-compose, which crashes if evaluated on another platform.
// index.js requires it behind a Platform.OS guard, never import it from app code
import AmbitoDolar from '@ambito-dolar/core';
import { Host } from '@expo/ui';
import { ModalBottomSheet, RNHostView } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import * as _ from 'lodash';
import React from 'react';
import {
  View,
  Text,
  StatusBar,
  Pressable,
  ScrollView,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { ThemeProvider } from 'styled-components';

import CardItemView from '@/components/CardItemView';
import CardView from '@/components/CardView';
import ContentView from '@/components/ContentView';
import FixedScrollView from '@/components/FixedScrollView';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';
import Sentry from '@/utilities/Sentry';
import {
  WIDGETS,
  getConfig,
  getStorageKey,
  getWidgetProps,
  logWidget,
} from '@/widgets';
import WidgetCard from '@/widgets/WidgetCard';

// every other screen gets its status bar backdrop from the opaque native stack header,
// this one has no header so the scrolled content would run under the system clock
const StatusBarBackground = () => {
  const safeAreaInsets = useSafeAreaInsets();
  const { theme } = Helper.useTheme();
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: safeAreaInsets.top,
        backgroundColor: Settings.getBackgroundColor(theme),
      }}
    />
  );
};

// ios/RateWidgets/Base.lproj/RateWidgets.intentdefinition, same two parameter types
const RATE_OPTIONS = AmbitoDolar.getAvailableRateTypes().map((type) => ({
  value: type,
  label: AmbitoDolar.getRateTitle(type),
}));
const VALUE_OPTIONS = ['buy', 'average', 'sell'].map((type) => ({
  value: type,
  label: I18n.t(type),
}));

// native material sheet as the container, our own rows inside through RNHostView.
// picking closes it, and the drag handle, the scrim and back give three ways out,
// so it needs no confirm button
const PickerSheet = ({ title, options, selected, onSelect, onClose }) => {
  const { theme } = Helper.useTheme();
  // the host sits inside the content container, so it inherits CONTENT_WIDTH and the
  // sheet ends up narrower than the screen and pushed to the left
  const { width, height } = useWindowDimensions();
  // visibility follows mounting, so picking has to wait for the exit animation
  // before unmounting or the sheet snaps away
  const sheetRef = React.useRef(null);
  return (
    <Host style={{ position: 'absolute', width }}>
      <ModalBottomSheet
        ref={sheetRef}
        onDismissRequest={onClose}
        containerColor={Settings.getBackgroundColor(theme)}
        skipPartiallyExpanded
        showDragHandle
      >
        {/* without fillMaxWidth the host measures the rn content unconstrained and
            the card collapses to a third of the sheet */}
        <RNHostView matchContents modifiers={[fillMaxWidth()]}>
          {/* the sheet is a separate native window, gesture handler needs its own root */}
          <GestureHandlerRootView>
            <ThemeProvider theme={{ colorScheme: theme }}>
              {/* the sheet grows with its content and runs off both screen edges on
                  short devices, so the list caps itself and scrolls from there */}
              <ScrollView style={{ maxHeight: height * 0.75 }}>
                {/* the scroll views bring this everywhere else, its margin pairs with
                    the card one to make up PADDING */}
                <ContentView>
                  <CardView title={title} plain>
                    {options.map(({ value, label }) => (
                      <CardItemView
                        key={value}
                        title={label}
                        useSwitch={false}
                        chevron={false}
                        check={selected === value}
                        onAction={() => {
                          sheetRef.current
                            .hide()
                            .then(() => {
                              onSelect(value);
                            })
                            .catch(console.warn);
                        }}
                      />
                    ))}
                  </CardView>
                </ContentView>
              </ScrollView>
            </ThemeProvider>
          </GestureHandlerRootView>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  );
};

// N ordered slots over the same option list, each row opens the picker. One slot for
// the rate widget, two for spreads, three for the list, same for the value type
const SlotsSection = ({ title, options, values, onChange }) => {
  const [editing, setEditing] = React.useState(null);
  return (
    <>
      <CardView title={title} plain>
        {values.map((value, index) => (
          <CardItemView
            key={index}
            // a stored value can outlive its option, a retired rate type must not take
            // the screen down with it
            title={
              options.find((option) => option.value === value)?.label ?? value
            }
            useSwitch={false}
            onAction={() => {
              setEditing(index);
            }}
          />
        ))}
      </CardView>
      {editing !== null && (
        <PickerSheet
          title={title}
          options={options}
          selected={values[editing]}
          onSelect={(value) => {
            onChange(editing, value);
            setEditing(null);
          }}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
    </>
  );
};

// affirmative action, not a close button
// the activity sets RESULT_CANCELED on create, so leaving through back drops the widget
// plain Pressable instead of HeaderButton, this runs outside the router and the
// react-navigation header button needs a navigation theme
const DoneButton = (props) => {
  const safeAreaInsets = useSafeAreaInsets();
  const { theme, fonts } = Helper.useTheme();
  return (
    <View
      style={{
        marginTop: safeAreaInsets.top,
        marginHorizontal: Settings.CARD_PADDING,
        marginBottom: -Settings.CARD_PADDING,
        paddingVertical: Settings.CARD_PADDING,
        flexDirection: 'row',
        justifyContent: 'flex-end',
      }}
    >
      <Pressable
        onPress={() => {
          props.setResult('ok');
        }}
        android_ripple={{
          color: Settings.getRippleColor(theme),
          borderless: true,
        }}
        // prevents ripple cutoff on android
        style={{ padding: 8 }}
      >
        <Text
          style={{
            ...fonts.body,
            color: Settings.getForegroundColor(theme),
          }}
        >
          Listo
        </Text>
      </Pressable>
    </View>
  );
};

export const ConfigurationScreen = Sentry.wrap((props) => {
  const colorScheme = useColorScheme();
  const theme = { colorScheme };
  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(
      Settings.getBackgroundColor(colorScheme),
    ).catch(console.warn);
  }, [colorScheme]);
  // settings, config doubles as the ready gate
  const widgetInfo = props.widgetInfo;
  const storageKey = getStorageKey(widgetInfo);
  const [config, setConfig] = React.useState();
  React.useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        setConfig(JSON.parse(value ?? '{}'));
      })
      .catch((e) => {
        console.warn(e);
        setConfig({});
      });
  }, [storageKey]);
  const saveSetting = React.useCallback(
    (key, value) => {
      const newConfig = { ...config, [key]: value };
      if (!_.isEqual(config, newConfig)) {
        // only after the write lands, getWidgetProps reads the config back from storage
        // and a failed write would leave the screen showing what the widget does not
        AsyncStorage.setItem(storageKey, JSON.stringify(newConfig))
          .then(() => {
            setConfig(newConfig);
            // not optimistic, a failed fetch here would wipe a widget that is fine
            getWidgetProps(widgetInfo, false)
              .then((widgetProps) => {
                logWidget('CONFIG', widgetInfo, widgetProps);
                props.renderWidget(<WidgetCard {...widgetProps} />);
              })
              .catch((e) => {
                logWidget('CONFIG sin redibujar', widgetInfo);
                console.warn(e);
              });
          })
          .catch(console.warn);
      }
    },
    [config, storageKey],
  );
  // the widget entry says how many rate slots to show and whether it has a value type,
  // so the screen serves every widget without knowing any of them by name
  const widget = WIDGETS[widgetInfo.widgetName];
  const { rateTypes, value: valueType } = getConfig(
    widgetInfo.widgetName,
    config,
  );
  // picking a rate already used by another slot swaps them, so a widget never ends up
  // showing the same rate twice
  const saveRateType = React.useCallback(
    (index, type) => {
      const values = [...rateTypes];
      const previous = values.indexOf(type);
      if (previous !== -1) {
        values[previous] = values[index];
      }
      values[index] = type;
      saveSetting('rateTypes', values);
    },
    [rateTypes, saveSetting],
  );
  if (config) {
    return (
      <GestureHandlerRootView>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <ThemeProvider theme={theme}>
            <StatusBar
              barStyle={
                colorScheme === 'dark' ? 'light-content' : 'dark-content'
              }
            />
            <FixedScrollView isModal>
              <DoneButton {...props} />
              <SlotsSection
                // ios says Cotización only where the widget takes a single rate
                title={rateTypes.length > 1 ? I18n.t('rates') : 'Cotización'}
                options={RATE_OPTIONS}
                values={rateTypes}
                onChange={saveRateType}
              />
              {widget.value && (
                <SlotsSection
                  title="Mostrar"
                  options={VALUE_OPTIONS}
                  values={[valueType]}
                  onChange={(index, value) => {
                    saveSetting('value', value);
                  }}
                />
              )}
            </FixedScrollView>
            <StatusBarBackground />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }
  // TODO: add spinner ???
  // wait for resources
});
