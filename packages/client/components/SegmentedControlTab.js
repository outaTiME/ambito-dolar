import NativeSegmentedControl from '@react-native-segmented-control/segmented-control';
import { processFontFamily } from 'expo-font';
import React from 'react';
import { View } from 'react-native';
import SegmentedControlTab from 'react-native-segmented-control-tab';

import Settings from '../config/settings';
import Helper from '../utilities/Helper';

const SegmentedControl = ({
  legacy,
  values,
  selectedIndex,
  onTabPress,
  enabled,
}) => {
  const { theme, fonts } = Helper.useTheme();
  if (legacy !== false) {
    return (
      <SegmentedControlTab
        tabStyle={{
          // backgroundColor: Settings.getBackgroundColor(theme),
          backgroundColor: 'transparent',
          borderWidth: Settings.BORDER_WIDTH,
          borderColor: Settings.getStrokeColor(theme),
        }}
        firstTabStyle={[values.length > 2 && { marginRight: 1 }]}
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
        {...{
          values,
          selectedIndex,
          onTabPress,
          enabled,
        }}
        borderRadius={Settings.BORDER_RADIUS}
        allowFontScaling={Settings.ALLOW_FONT_SCALING}
      />
    );
  }
  // custom fonts doesn't work on expo
  // https://github.com/react-native-segmented-control/segmented-control/issues/125
  return (
    <NativeSegmentedControl
      {...{
        values,
        selectedIndex,
        enabled,
        appearance: theme,
        fontStyle: {
          fontFamily: processFontFamily(Settings.getFontObject().fontFamily),
          fontSize: 15,
        },
        activeFontStyle: {
          fontFamily: processFontFamily(Settings.getFontObject().fontFamily),
          fontSize: 15,
        },
      }}
      onChange={(event) => {
        onTabPress(event.nativeEvent.selectedSegmentIndex);
      }}
    />
  );
};

export default (props) => (
  <View
    style={[
      {
        margin: Settings.CARD_PADDING,
      },
      // props.style,
    ]}
  >
    <SegmentedControl {...props} />
  </View>
);
