import AmbitoDolar from '@ambito-dolar/core';
import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { View } from 'react-native';
import { WidgetPreview } from 'react-native-android-widget';

import withContainer from '../components/withContainer';
import withRates from '../components/withRates';
import Helper from '../utilities/Helper';
import RateWidget from '../widgets/RateWidget';

const RateWidgetPreviewScreen = ({ rates, rateTypes }) => {
  const { theme } = Helper.useTheme();
  const type = rateTypes[0];
  const stats = rates[type].stats;
  const [timestamp, value, change] = React.useMemo(
    () => stats[stats.length - 1],
    [stats],
  );
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <WidgetPreview
        renderWidget={({ width }) => (
          <RateWidget
            {...{
              theme,
              preview: true,
              size: width,
              type,
              change,
              value: AmbitoDolar.getRateValue(value),
              timestamp,
            }}
          />
        )}
        width={130}
        height={130}
      />
    </View>
  );
};

export default compose(withContainer, withRates())(RateWidgetPreviewScreen);
