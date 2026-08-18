// @ts-nocheck
import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { View } from 'react-native';
import { WidgetPreview } from 'react-native-android-widget';

import FixedScrollView from '@/components/FixedScrollView';
import withContainer from '@/components/withContainer';
import withRates from '@/components/withRates';
import Settings from '@/config/settings';
import { WIDGET_NAMES, getPreviewProps } from '@/widgets';
import WidgetCard from '@/widgets/WidgetCard';

// about what a 2x2 cell reports, this emulator logs 172, so the preview renders at the
// size the launcher does and scripts/widget-preview.js needs no upscale
const SIZE = 170;

const RateWidgetPreviewScreen = ({ rates }) => (
  // centered while the cards fit, scrolls once they do not
  <FixedScrollView
    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
  >
    {/* the scroll view lays its content full width, centering has to happen in here.
        the gaps also keep the cards apart for scripts/widget-preview.js */}
    <View style={{ alignItems: 'center', gap: Settings.PADDING }}>
      {WIDGET_NAMES.map((widgetName) => (
        <WidgetPreview
          key={widgetName}
          renderWidget={() => (
            <WidgetCard size={SIZE} {...getPreviewProps(widgetName, rates)} />
          )}
          width={SIZE}
          height={SIZE}
        />
      ))}
    </View>
  </FixedScrollView>
);

export default compose(withContainer, withRates())(RateWidgetPreviewScreen);
