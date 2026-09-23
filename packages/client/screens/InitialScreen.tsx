// @ts-nocheck
import { compose } from '@reduxjs/toolkit';
import { ActivityIndicator } from 'react-native';

import ActionButton from '@/components/ActionButton';
import ContentView from '@/components/ContentView';
import MessageView from '@/components/MessageView';
import withContainer from '@/components/withContainer';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

const InitialScreen = ({ rates, loadingError, fetchRates }) => {
  const { theme } = Helper.useTheme();
  // a failed fetch owns the screen, an empty rates object is truthy and fell through
  if (loadingError) {
    return (
      <ContentView>
        <MessageView
          style={{
            marginBottom: Settings.PADDING,
          }}
          message={I18n.t('rates_loading_error')}
        />
        <ActionButton
          title={I18n.t('retry')}
          handleOnPress={() => fetchRates({ force: true })}
          alternativeBackground
        />
      </ContentView>
    );
  }
  // nil rates is the initial load
  if (!rates) {
    return (
      <ContentView>
        <ActivityIndicator
          animating
          color={Settings.getForegroundColor(theme)}
          size="small"
        />
      </ContentView>
    );
  }
  // an empty or invalid object, the payload came and nothing is renderable
  return (
    <ContentView>
      <MessageView message={I18n.t('no_available_rates')} />
    </ContentView>
  );
};

export default compose(withContainer)(InitialScreen);
