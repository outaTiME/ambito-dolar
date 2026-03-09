import { useLocalSearchParams, useNavigation, usePathname } from 'expo-router';
import React from 'react';
import { View, Platform } from 'react-native';

import DividerView from '@/components/DividerView';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

export default (Component: any) => (props: any) => {
  const navigation = useNavigation();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const { theme } = Helper.useTheme();
  const modalRaw = params?.modal;
  const isModal =
    modalRaw === 'true' || pathname.startsWith('/customize-rates');
  const hasBottomTab = navigation?.getParent()?.getState()?.type === 'tab';
  const contentMetrics =
    (isModal || hasBottomTab) && Helper.useContentMetrics(isModal);
  const isRoot = !contentMetrics && Platform.OS !== 'web';
  const backgroundColor = (Settings as any).getBackgroundColor(
    theme,
    isRoot,
    isModal,
  );
  const containerStyle = React.useMemo<any>(
    () => [
      {
        flex: 1,
        justifyContent: 'center',
        backgroundColor,
      },
      Platform.OS === 'android' &&
        !isRoot &&
        contentMetrics && {
          flex: 0,
          // fixed size prevents jumps on initial render when flexGrow is used
          height: contentMetrics.contentHeight,
        },
    ],
    [backgroundColor, isRoot, contentMetrics],
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
                bottom: Platform.OS === 'ios' ? contentMetrics.tabBarHeight : 0,
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
