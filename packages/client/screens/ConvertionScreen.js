import AmbitoDolar from '@ambito-dolar/core';
import React from 'react';
import { View, TextInput } from 'react-native';
import { useSelector } from 'react-redux';
import { compose } from 'redux';

import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import SegmentedControlTab from '../components/SegmentedControlTab';
import withContainer from '../components/withContainer';
import withScreenshotShareSheet from '../components/withScreenshotShareSheet';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const CURRENCY_TYPES = ['Dólar', 'Peso'];
const CONVERTION_TYPES = ['Compra', 'Promedio', 'Venta'];

const DEFAULT_NUMBER = 1;

const ConvertionScreen = () => {
  const { theme, fonts } = Helper.useTheme();
  const [numberValue, setNumberValue] = React.useState(DEFAULT_NUMBER);
  const [currencyIndex, setCurrencyIndex] = React.useState(0);
  const [typeIndex, setTypeIndex] = React.useState(1);
  const inputTextRef = React.useRef();
  const onTextInputFocus = React.useCallback(() => {
    inputTextRef.current?.setNativeProps({ text: '' });
  }, []);
  const onTextInputBlur = React.useCallback(
    ({ nativeEvent: { text } }) => {
      let number = Helper.getNumber(text);
      if (!number) {
        // rollback when invalid
        number = numberValue;
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
  const handleCurrencyTypeChange = React.useCallback((index) => {
    setCurrencyIndex(index);
  }, []);
  const handleConvertionTypeChange = React.useCallback((index) => {
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
  const rateTypes = AmbitoDolar.getAvailableRateTypes();
  const rates = useSelector((state) => state.rates?.rates);
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
  return (
    <>
      <View
        style={{
          borderRadius: Settings.BORDER_RADIUS,
          borderWidth: Settings.BORDER_WIDTH,
          borderColor: Settings.getStrokeColor(theme),
          minHeight: 70,
          margin: Settings.CARD_PADDING,
          paddingHorizontal: Settings.PADDING,
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
              textAlign: 'center',
              flex: 1,
            },
          ]}
          underlineColorAndroid="transparent"
          returnKeyType="done"
          keyboardType="numeric"
          maxLength={15}
          enablesReturnKeyAutomatically
          autoCorrect={false}
        />
      </View>
      <SegmentedControlTab
        values={CURRENCY_TYPES}
        selectedIndex={currencyIndex}
        onTabPress={handleCurrencyTypeChange}
      />
      <SegmentedControlTab
        values={CONVERTION_TYPES}
        selectedIndex={typeIndex}
        onTabPress={handleConvertionTypeChange}
      />
      <CardView style={{ flex: 1 }} plain>
        {rateTypes.map((type) => getItemView(type))}
      </CardView>
    </>
  );
};

export default compose(
  withContainer(),
  // withScreenshotShareSheet('Compartir resultados')
  withScreenshotShareSheet
)(ConvertionScreen);
