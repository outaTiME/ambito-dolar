import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { compose } from 'redux';

import { MaterialHeaderButtons } from '../components/HeaderButtons';
import RateView from '../components/RateView';
import withContainer from '../components/withContainer';
import withScreenshotShareSheet from '../components/withScreenshotShareSheet';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const RefreshingIndicator = () => {
  const { theme } = Helper.useTheme();
  return (
    <MaterialHeaderButtons left>
      <View
        style={{
          // https://github.com/vonovak/react-navigation-header-buttons/blob/master/src/HeaderItems.js#L73
          width: Settings.ICON_SIZE + 11 * 2,
        }}
      >
        <ActivityIndicator
          animating
          color={Settings.getForegroundColor(theme)}
          size="small"
        />
      </View>
    </MaterialHeaderButtons>
  );
};

const MainScreen = ({ navigation }) => {
  const [updatingRates] = Helper.useSharedState('updatingRates');
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft:
        updatingRates === true ? () => <RefreshingIndicator /> : undefined,
    });
  }, [navigation, updatingRates]);
  const onRateSelected = React.useCallback(
    (type) => navigation.navigate('RateDetail', { type }),
    []
  );
  const rates = Helper.useRates();
  const rateTypes = React.useMemo(() => Object.keys(rates), [rates]);
  const getItemView = React.useCallback(
    (type) => (
      <RateView
        {...{
          key: type,
          type,
          stats: rates[type].stats,
          onSelected: onRateSelected,
        }}
      />
    ),
    [rates]
  );
  return <>{rateTypes.map((type) => getItemView(type))}</>;
};

export default compose(
  withContainer(),
  // withScreenshotShareSheet('Compartir cotizaciones')
  withScreenshotShareSheet
)(MainScreen);
