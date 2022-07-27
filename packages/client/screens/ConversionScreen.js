import AmbitoDolar from '@ambito-dolar/core';
import { useFocusEffect } from '@react-navigation/native';
import { compose } from '@reduxjs/toolkit';
import React from 'react';
import {
  ScrollView,
  View,
  TextInput,
  InteractionManager,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import DividerView from '../components/DividerView';
import SegmentedControlTab from '../components/SegmentedControlTab';
import withContainer from '../components/withContainer';
import withDividersOverlay from '../components/withDividersOverlay';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const CURRENCY_TYPES = [I18n.t('dolar'), I18n.t('peso')];
const CONVERSION_TYPES = [I18n.t('buy'), I18n.t('average'), I18n.t('sell')];

const DEFAULT_NUMBER = 1;

const ConversionScreen = ({
  headerHeight,
  tabBarheight,
  route: { params },
  navigation: { setParams },
}) => {
  const { theme, fonts } = Helper.useTheme();
  const [numberValue, setNumberValue] = React.useState(DEFAULT_NUMBER);
  const [currencyIndex, setCurrencyIndex] = React.useState(0);
  const [typeIndex, setTypeIndex] = React.useState(1);
  const inputTextRef = React.useRef();
  const onTextInputFocus = React.useCallback(() => {
    inputTextRef.current?.setNativeProps({ text: '' });
  }, []);
  const dispatch = useDispatch();
  const onTextInputBlur = React.useCallback(
    ({ nativeEvent: { text } }) => {
      let number = Helper.getNumber(text);
      if (!number) {
        // rollback when invalid
        number = numberValue;
      } else {
        // only when value updated
        dispatch(actions.registerApplicationConversion());
      }
      setNumberValue(number);
      inputTextRef.current?.setNativeProps({
        text: Helper.formatFloatingPointNumber(number),
      });
    },
    [numberValue]
  );
  const onTextInputChangeText = React.useCallback((text) => {
    inputTextRef.current?.setNativeProps({
      text: Helper.formatFloatingPointNumber(text),
    });
  }, []);
  const dismissKeyboard = React.useCallback(() => {
    inputTextRef.current?.blur();
  }, []);
  const handleCurrencyTypeChange = React.useCallback((index) => {
    dismissKeyboard();
    setCurrencyIndex(index);
  }, []);
  const handleConversionTypeChange = React.useCallback((index) => {
    dismissKeyboard();
    setTypeIndex(index);
  }, []);
  const getValueFromType = React.useCallback((rate, typeIndex) => {
    const value = rate[1];
    // use value from single changes
    const buy = Array.isArray(value) ? value[0] : value;
    const sell = Array.isArray(value) ? value[1] : value;
    if (typeIndex === 0) {
      return buy;
    } else if (typeIndex === 1) {
      return (buy + sell) / 2;
    }
    return sell;
  }, []);
  const rates = Helper.useRates();
  const rateTypes = React.useMemo(() => Object.keys(rates), [rates]);
  const getItemView = React.useCallback(
    (type) => {
      const stats = rates[type].stats;
      // took last one
      const rate = stats[stats.length - 1];
      const rate_value = getValueFromType(rate, typeIndex);
      return (
        <CardItemView
          key={type}
          containerStyle={{
            flexGrow: 1,
          }}
          title={AmbitoDolar.getRateTitle(type)}
          titleStyle={{
            color: Settings.getGrayColor(theme),
          }}
          useSwitch={false}
          value={Helper.getCurrency(
            currencyIndex === 0
              ? numberValue * rate_value
              : numberValue / rate_value,
            true,
            currencyIndex === 1
          )}
          valueStyle={fonts.title}
          selectable
        />
      );
    },
    [rates, typeIndex, theme, currencyIndex, numberValue, fonts]
  );
  useFocusEffect(
    React.useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (params?.focus === true) {
          inputTextRef.current?.focus();
          setParams({
            focus: false,
          });
        }
      });
      return () => task.cancel();
    }, [params])
  );
  const insets = useSafeAreaInsets();
  const indicatorStyle = Helper.useIndicatorStyle();
  return (
    <>
      <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
        <View
          style={[
            {
              alignItems: 'center',
              ...(Platform.OS === 'ios' && {
                paddingTop: headerHeight,
              }),
            },
          ]}
        >
          <View
            style={[
              {
                padding: Settings.CARD_PADDING,
                width: Math.min(
                  Settings.DEVICE_WIDTH,
                  Settings.MAX_DEVICE_WIDTH
                ),
              },
            ]}
          >
            <View
              style={{
                borderRadius: Settings.BORDER_RADIUS,
                borderWidth: Settings.BORDER_WIDTH,
                borderColor: Settings.getStrokeColor(theme),
                margin: Settings.CARD_PADDING,
                // perfect size using diff between the lineHeight and size of font
                padding: Settings.PADDING - (34 - 28) / 2,
                backgroundColor: Settings.getContentColor(theme),
              }}
            >
              <TextInput
                ref={inputTextRef}
                defaultValue={Helper.formatFloatingPointNumber(numberValue)}
                onFocus={onTextInputFocus}
                onEndEditing={onTextInputBlur}
                onChangeText={onTextInputChangeText}
                style={[
                  fonts.largeTitle,
                  {
                    // forced lineHeight required by android
                    // https://github.com/hectahertz/react-native-typography/blob/master/src/collections/human.js#L25
                    height: 34,
                  },
                ]}
                underlineColorAndroid="transparent"
                returnKeyType="done"
                keyboardType="numeric"
                maxLength={15}
                enablesReturnKeyAutomatically
                autoCorrect={false}
                textAlign="center"
              />
            </View>
            <SegmentedControlTab
              values={CURRENCY_TYPES}
              selectedIndex={currencyIndex}
              onTabPress={handleCurrencyTypeChange}
            />
            <SegmentedControlTab
              values={CONVERSION_TYPES}
              selectedIndex={typeIndex}
              onTabPress={handleConversionTypeChange}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
      <DividerView />
      <ScrollView
        scrollIndicatorInsets={{
          bottom: tabBarheight - insets.bottom,
        }}
        indicatorStyle={indicatorStyle}
        contentContainerStyle={[
          {
            flexGrow: 1,
            alignSelf: 'center',
            width: Math.min(Settings.DEVICE_WIDTH, Settings.MAX_DEVICE_WIDTH),
            // required when translucent bars
            ...(Platform.OS === 'ios' && {
              paddingBottom: tabBarheight,
            }),
          },
        ]}
        style={{
          backgroundColor: Settings.getContentColor(theme),
        }}
        onScrollBeginDrag={dismissKeyboard}
      >
        <View
          style={[
            {
              flex: 1,
              marginHorizontal: Settings.CARD_PADDING,
              marginVertical: -Settings.CARD_PADDING,
            },
          ]}
        >
          <CardView
            plain
            style={{
              flex: 1,
            }}
          >
            {rateTypes.map((type) => getItemView(type))}
          </CardView>
        </View>
      </ScrollView>
    </>
  );
};

export default compose(withContainer(), withDividersOverlay)(ConversionScreen);
