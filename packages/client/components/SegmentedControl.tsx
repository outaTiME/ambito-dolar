import React from 'react';
import { View } from 'react-native';

import ReanimatedSegmentedControl from '@/components/AnimatedSegmentedControl';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

const SegmentedControl = ({
  values,
  selectedIndex,
  onTabPress,
  enabled,
  showDirectionalArrow,
}) => {
  const { theme, fonts } = Helper.useTheme();
  const textStyle = {
    ...fonts.subhead,
    color: Settings.getForegroundColor(theme),
    textTransform: 'uppercase',
  };
  return (
    <View
      style={[
        { margin: Settings.CONTENT_MARGIN },
        enabled === false && { pointerEvents: 'none' },
      ]}
    >
      <ReanimatedSegmentedControl
        segments={values}
        onChange={onTabPress}
        currentIndex={selectedIndex}
        segmentedControlWrapper={{
          borderRadius: Settings.BORDER_RADIUS,
          backgroundColor:
            theme === 'dark'
              ? Settings.getContentColor(theme)
              : Settings.getStrokeColor(theme, true),
        }}
        pressableWrapper={{ paddingVertical: Settings.SMALL_PADDING * 2 }}
        textStyle={textStyle}
        tileStyle={{
          backgroundColor:
            theme === 'dark'
              ? Settings.getStrokeColor(theme)
              : Settings.getLightColor(true),
          margin: 2,
          borderRadius: Settings.BORDER_RADIUS - 2,
        }}
        showDirectionalArrow={showDirectionalArrow}
      />
    </View>
  );
};

// the converter re-renders on every key, the props stay stable
export default React.memo(SegmentedControl);
