import { View } from 'react-native';

import ReanimatedSegmentedControl from './AnimatedSegmentedControl';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default ({
  values,
  selectedIndex,
  onTabPress,
  enabled,
  showDirectionalArrow,
}) => {
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
          containerMargin={Settings.CARD_PADDING * 2}
          segmentedControlWrapper={{
            borderRadius: Settings.BORDER_RADIUS,
            backgroundColor:
              theme === 'dark'
                ? // systemGray6
                  Settings.getContentColor(theme)
                : // systemGray4
                  Settings.getStrokeColor(theme, true),
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
            color: Settings.getForegroundColor(theme),
            textTransform: 'uppercase',
          }}
          tileStyle={{
            backgroundColor:
              theme === 'dark'
                ? // systemGray4
                  Settings.getStrokeColor(theme)
                : // systemGray6
                  Settings.getLightColor(true),
            marginVertical: 2,
            marginHorizontal: 2,
            // remove margin from default border
            borderRadius: Settings.BORDER_RADIUS - 2,
            // remove shadow
            shadowOpacity: 0,
            elevation: 0,
          }}
          showDirectionalArrow={showDirectionalArrow}
          arrowTextStyle={{
            // ...fonts.body,
            ...fonts.subhead,
            color: Settings.getForegroundColor(theme),
            textTransform: 'uppercase',
          }}
        />
      </View>
    </View>
  );
};
