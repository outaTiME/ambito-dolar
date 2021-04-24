import * as React from 'react';
import { View } from 'react-native';
import SegmentedControlTab from 'react-native-segmented-control-tab';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default (props) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <View
      style={[
        {
          margin: Settings.CARD_PADDING,
        },
        props.style,
      ]}
    >
      <SegmentedControlTab
        tabsContainerStyle={[props.tabsContainerStyle]}
        tabStyle={{
          backgroundColor: Settings.getBackgroundColor(theme),
          borderWidth: Settings.BORDER_WIDTH,
          borderColor: Settings.getStrokeColor(theme),
        }}
        firstTabStyle={[props.values.length > 2 && { marginRight: 1 }]}
        activeTabStyle={[
          {
            backgroundColor: Settings.getContentColor(theme),
          },
        ]}
        tabTextStyle={[
          fonts.subhead,
          {
            color: Settings.getGrayColor(theme),
            textTransform: 'uppercase',
          },
        ]}
        activeTabTextStyle={{
          color: Settings.getForegroundColor(theme),
        }}
        {...props}
        borderRadius={Settings.BORDER_RADIUS}
        allowFontScaling={Settings.ALLOW_FONT_SCALING}
      />
    </View>
  );
};
