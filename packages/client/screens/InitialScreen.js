import { compose } from '@reduxjs/toolkit';
import { ActivityIndicator } from 'react-native';

import ContentView from '../components/ContentView';
import MessageView from '../components/MessageView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const InitialScreen = ({ rates, stillLoading }) => {
  const { theme } = Helper.useTheme();
  // only on initial when nil rates
  if (!rates) {
    return (
      <ContentView>
        <ActivityIndicator
          animating
          color={Settings.getForegroundColor(theme)}
          size="small"
        />
        {stillLoading && (
          <MessageView
            style={{
              marginTop: Settings.PADDING,
            }}
            message={I18n.t('still_loading')}
          />
        )}
      </ContentView>
    );
  }
  // when emtpy or invalid object
  return (
    <ContentView>
      <MessageView message={I18n.t('no_available_rates')} />
    </ContentView>
  );
};

export default compose(withContainer)(InitialScreen);
