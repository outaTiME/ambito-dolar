import { View } from 'react-native';

import ReanimatedSegmentedControl from './AnimatedSegmentedControl';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({ values, selectedIndex, onTabPress, enabled }) => {
  const { theme, fonts } = Helper.useTheme();
  return (
    <View
      style={[
        {
          margin: Settings.CARD_PADDING,
        },
      ]}
    >
      <View
        {...(enabled === false && {
          pointerEvents: 'none',
        })}
      >
        <ReanimatedSegmentedControl
          segments={values}
          onChange={onTabPress}
          currentIndex={selectedIndex}
          // containerMargin={Settings.CARD_PADDING * 2 - Settings.BORDER_WIDTH}
          // containerMargin={Settings.CARD_PADDING * 2 + Settings.BORDER_WIDTH}
          containerMargin={Settings.CARD_PADDING * 2}
          segmentedControlWrapper={{
            borderRadius: Settings.BORDER_RADIUS,
            // padding: 2,
            backgroundColor:
              theme === 'dark'
                ? // systemGray6
                  Settings.getContentColor(theme)
                : // systemGray4
                  Settings.getStrokeColor(theme, true),
            // backgroundColor: 'transparent',
            // borderWidth: Settings.BORDER_WIDTH,
            // borderColor: Settings.getStrokeColor(theme),
            // borderColor: 'red',
            // margin: -Settings.BORDER_WIDTH,
            // backgroundColor: 'red',
          }}
          pressableWrapper={{
            elevation: 0,
            paddingVertical: Settings.SMALL_PADDING * 2,
          }}
          activeTextStyle={{
            ...fonts.subhead,
            color: Settings.getForegroundColor(theme),
            textTransform: 'uppercase',
          }}
          inactiveTextStyle={{
            ...fonts.subhead,
            // color: Settings.getGrayColor(theme),
            color: Settings.getForegroundColor(theme),
            textTransform: 'uppercase',
          }}
          tileStyle={{
            // backgroundColor: Settings.getBackgroundColor(theme, false, false),
            backgroundColor:
              theme === 'dark'
                ? // systemGray4
                  Settings.getStrokeColor(theme)
                : // systemGray6
                  Settings.getLightColor(true),
            // marginVertical: Settings.BORDER_WIDTH,
            // marginHorizontal: Settings.BORDER_WIDTH,
            marginVertical: 2,
            marginHorizontal: 2,
            // remove margin from default border
            borderRadius: Settings.BORDER_RADIUS - 2,
            // remove shadow
            shadowOpacity: 0,
            elevation: 0,
          }}
        />
      </View>
    </View>
  );
};
