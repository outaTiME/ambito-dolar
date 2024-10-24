import React from 'react';
import { Text } from 'react-native';

import CardItemView from './CardItemView';
import CardView from './CardView';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ style, text, onLongPress }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <CardView
      {...{
        plain: true,
        transparent: true,
        style,
      }}
    >
      <CardItemView
        title={
          <Text
            style={[
              fonts.subhead,
              {
                color: Settings.getGrayColor(theme),
                textAlign: 'center',
              },
            ]}
            suppressHighlighting
            onLongPress={onLongPress}
          >
            {text}
          </Text>
        }
        titleContainerStyle={{
          justifyContent: 'center',
        }}
        useSwitch={false}
        chevron={false}
      />
    </CardView>
  );
};
