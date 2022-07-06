import React from 'react';
import { Text } from 'react-native';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';
import CardItemView from './CardItemView';
import CardView from './CardView';

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
                flex: 1,
                color: Settings.getGrayColor(theme),
                // textTransform: 'uppercase',
                textAlign: 'center',
              },
            ]}
            suppressHighlighting
            onLongPress={onLongPress}
          >
            {text}
          </Text>
        }
        {...{
          containerStyle: {
            // paddingHorizontal: 0,
          },
          titleContainerStyle: {
            // paddingVertical: 0,
          },
          // onAction,
        }}
        useSwitch={false}
        chevron={false}
      />
    </CardView>
  );
};
