// @ts-nocheck
import AmbitoDolar from '@ambito-dolar/core';
import { compose } from '@reduxjs/toolkit';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Platform, View, TouchableWithoutFeedback } from 'react-native';
import { useDispatch } from 'react-redux';

import * as actions from '@/actions';
import ActionButton from '@/components/ActionButton';
import CardItemView from '@/components/CardItemView';
import CardView from '@/components/CardView';
import ContentView from '@/components/ContentView';
import DividerView from '@/components/DividerView';
import MessageView from '@/components/MessageView';
import ScrollView from '@/components/ScrollView';
import SegmentedControlTab from '@/components/SegmentedControl';
import TextInput from '@/components/TextInput';
import withContainer from '@/components/withContainer';
import withRates from '@/components/withRates';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';
import {
  clearRouteParam,
  goToCustomizeRatesModal,
} from '@/utilities/Navigation';

const CURRENCY_TYPES = [I18n.t('currency'), I18n.t('peso')];
const CONVERSION_TYPES = [I18n.t('buy'), I18n.t('average'), I18n.t('sell')];

const DEFAULT_NUMBER = 1;

const ConversionScreen = ({ rates, rateTypes, backgroundColor }) => {
  const params = useLocalSearchParams();
  const { theme, fonts } = Helper.useTheme();
  const headerHeight = Helper.usePreciseHeaderHeight();
  const [numberValue, setNumberValue] = React.useState(DEFAULT_NUMBER);
  const [inputText, setInputText] = React.useState(
    Helper.formatFloatingPointNumber(DEFAULT_NUMBER),
  );
  const [currencyIndex, setCurrencyIndex] = React.useState(0);
  const [typeIndex, setTypeIndex] = React.useState(1);
  const inputTextRef = React.useRef();
  const onTextInputFocus = React.useCallback(() => {
    setInputText('');
  }, []);
  const dispatch = useDispatch();
  const onTextInputBlur = React.useCallback(() => {
    let number = Helper.getNumber(inputText);
    if (!number) {
      number = numberValue;
    } else {
      dispatch(actions.registerApplicationConversion());
    }
    setNumberValue(number);
    setInputText(Helper.formatFloatingPointNumber(number));
  }, [numberValue, inputText, dispatch]);
  const onTextInputChangeText = React.useCallback((text) => {
    const formatted = Helper.formatFloatingPointNumber(text);
    setInputText((prev) => (prev === formatted ? prev : formatted));
  }, []);
  const dismissKeyboard = React.useCallback(() => {
    inputTextRef.current?.blur();
  }, []);
  const handleCurrencyTypeChange = React.useCallback(
    (index) => {
      dismissKeyboard();
      setCurrencyIndex(index);
    },
    [dismissKeyboard],
  );
  const handleConversionTypeChange = React.useCallback(
    (index) => {
      dismissKeyboard();
      setTypeIndex(index);
    },
    [dismissKeyboard],
  );
  const getValueFromType = React.useCallback((rate, typeIndex) => {
    const value = rate[1];
    const buy = Array.isArray(value) ? value[0] : value;
    const sell = Array.isArray(value) ? value[1] : value;
    if (typeIndex === 0) {
      return buy;
    } else if (typeIndex === 1) {
      return (buy + sell) / 2;
    }
    return sell;
  }, []);
  const containerStyle = React.useMemo(() => ({ flexGrow: 1 }), []);
  const titleStyle = React.useMemo(
    () => ({ color: Settings.getGrayColor(theme) }),
    [theme],
  );
  const getItemView = (type) => {
    const stats = rates[type].stats;
    const rate = stats[stats.length - 1];
    const rate_value = getValueFromType(rate, typeIndex);
    return (
      <CardItemView
        key={type}
        containerStyle={containerStyle}
        title={AmbitoDolar.getRateTitle(type)}
        titleStyle={titleStyle}
        useSwitch={false}
        value={Helper.getCurrency(
          currencyIndex === 0
            ? numberValue * rate_value
            : numberValue / rate_value,
          true,
          currencyIndex === 1,
          type,
        )}
        valueStyle={fonts.title}
        selectable
      />
    );
  };
  useFocusEffect(
    React.useCallback(() => {
      if (params?.focus !== 'true') {
        return;
      }
      const timeoutId = setTimeout(() => {
        inputTextRef.current?.focus();
        clearRouteParam('focus');
      }, 0);
      return () => clearTimeout(timeoutId);
    }, [params?.focus]),
  );
  return (
    <View
      style={{
        flex: 1,
        backgroundColor,
        // android header is solid (not transparent), native layout handles offset
        paddingTop: Platform.OS === 'android' ? 0 : headerHeight,
      }}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
        <View style={{ alignItems: 'center' }}>
          <ContentView
            contentContainerStyle={Settings.CONTENT_TOP_SHRINK_STYLE}
          >
            <View
              style={{
                borderRadius: Settings.BORDER_RADIUS,
                borderCurve: 'continuous',
                borderWidth: Settings.BORDER_WIDTH,
                borderColor: Settings.getStrokeColor(theme),
                margin: Settings.CARD_PADDING,
                padding:
                  Settings.PADDING - (34 - 28) / 2 - Settings.BORDER_WIDTH * 2,
                backgroundColor: Settings.getContentColor(theme),
              }}
            >
              <TextInput
                ref={inputTextRef}
                value={inputText}
                onFocus={onTextInputFocus}
                onEndEditing={onTextInputBlur}
                onChangeText={onTextInputChangeText}
                style={[
                  fonts.largeTitle,
                  { includeFontPadding: false, padding: 0 },
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
              animated
              showDirectionalArrow
            />
            <SegmentedControlTab
              values={CONVERSION_TYPES}
              selectedIndex={typeIndex}
              onTabPress={handleConversionTypeChange}
              animated
            />
          </ContentView>
        </View>
      </TouchableWithoutFeedback>
      <DividerView />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        // explicit value disables broken auto-inset calculation for partial-screen ScrollViews
        scrollIndicatorInsets={{ top: 0, bottom: 0.1 }}
        style={{
          flex: 1,
          backgroundColor: Settings.getContentColor(theme),
        }}
        onScrollBeginDrag={dismissKeyboard}
        keyboardShouldPersistTaps="handled"
      >
        <ContentView
          contentContainerStyle={{ marginVertical: -Settings.CONTENT_MARGIN }}
        >
          {rateTypes.length === 0 ? (
            <View style={{ justifyContent: 'center' }}>
              <MessageView
                style={{ marginBottom: Settings.PADDING }}
                message={I18n.t('no_selected_rates')}
              />
              <ActionButton
                handleOnPress={() => {
                  goToCustomizeRatesModal();
                }}
                title={I18n.t('select_rates')}
                alternativeBackground
              />
            </View>
          ) : (
            <CardView plain>
              {rateTypes.map((type) => getItemView(type))}
            </CardView>
          )}
        </ContentView>
      </ScrollView>
    </View>
  );
};

export default compose(withContainer, withRates(true))(ConversionScreen);
