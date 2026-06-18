import { View } from 'react-native';

import ReanimatedSegmentedControl from '@/components/AnimatedSegmentedControl';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

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
          margin: Settings.CONTENT_MARGIN,
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
          containerMargin={Settings.CONTENT_MARGIN * 2}
          selectorRadius={Settings.BORDER_RADIUS - 2}
          segmentedControlWrapper={{
            borderRadius: Settings.BORDER_RADIUS,
            borderCurve: 'continuous',
            backgroundColor:
              theme === 'dark'
                ? Settings.getContentColor(theme)
                : Settings.getStrokeColor(theme, true),
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
                ? Settings.getStrokeColor(theme)
                : Settings.getLightColor(true),
            marginVertical: 2,
            marginHorizontal: 2,
            borderRadius: Settings.BORDER_RADIUS - 2,
            borderCurve: 'continuous',
            shadowOpacity: 0,
            elevation: 0,
          }}
          showDirectionalArrow={showDirectionalArrow}
          arrowWrapperStyle={{}}
          arrowTextStyle={{
            ...fonts.subhead,
            color: Settings.getForegroundColor(theme),
            textTransform: 'uppercase',
          }}
        />
      </View>
    </View>
  );
};
