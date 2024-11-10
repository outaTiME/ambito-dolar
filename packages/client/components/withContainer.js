import React from 'react';
import { View, Platform } from 'react-native';

import DividerView from './DividerView';
import Settings from '../config/settings';
import Helper from '../utilities/Helper';

export default (Component) => (props) => {
  const { theme } = Helper.useTheme();
  const isModal = props?.route?.params?.modal === true;
  const contentMetrics = Helper.useContentMetrics(isModal);
  const isRoot = !contentMetrics && Platform.OS !== 'web';
  const backgroundColor = Settings.getBackgroundColor(theme, isRoot, isModal);
  const containerStyle = React.useMemo(
    () => [
      {
        flex: 1,
        justifyContent: 'center',
        backgroundColor,
      },
      Platform.OS === 'android' &&
        !isRoot && {
          flex: 0,
          // fixed size prevents jumps on initial render when flexGrow is used
          height: contentMetrics.contentHeight,
        },
    ],
    [backgroundColor, isRoot],
  );
  return (
    <View style={containerStyle}>
      <Component
        {...{
          backgroundColor,
          isModal,
          ...(contentMetrics && contentMetrics),
          ...props,
        }}
      />
      {contentMetrics && (
        <>
          <DividerView
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? contentMetrics.headerHeight : 0,
              left: 0,
              right: 0,
            }}
            height={contentMetrics.dividerHeight}
          />
          {!isModal && (
            <DividerView
              style={{
                position: 'absolute',
                bottom: Platform.OS === 'ios' ? contentMetrics.tabBarheight : 0,
                left: 0,
                right: 0,
              }}
              height={contentMetrics.dividerHeight}
            />
          )}
        </>
      )}
    </View>
  );
};
