import { useFocusEffect, useNavigation } from 'expo-router';
import React from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

// ios tab screens hold the tab bar in their bottom inset only while it runs along the bottom
// a leaf, a new inset must not re-render the screen
const ToastInsetPublisher = ({ hasBottomTab }) => {
  const { bottom, left, right } = useSafeAreaInsets();
  const setToastInset = Helper.useSharedSetter('toastInset');
  useFocusEffect(
    React.useCallback(() => {
      setToastInset({ bottom, left, right, hasBottomTab });
    }, [bottom, left, right, hasBottomTab, setToastInset]),
  );
  return null;
};

export default (Component: any) => (props: any) => {
  const navigation = useNavigation();
  const { theme } = Helper.useTheme();
  // the navigator id is the layout path, set from the first render
  const isModal = navigation?.getId() === '/(modals)';
  const hasBottomTab = navigation?.getParent()?.getId() === '/(tabs)';
  const isRoot = !(isModal || hasBottomTab) && Platform.OS !== 'web';
  const backgroundColor = Settings.getBackgroundColor(theme, isRoot, isModal);
  const containerStyle = React.useMemo(
    () => ({
      flex: 1,
      justifyContent: 'center' as const,
      backgroundColor,
    }),
    [backgroundColor],
  );
  return (
    <View collapsable={false} style={containerStyle}>
      <ToastInsetPublisher hasBottomTab={hasBottomTab} />
      <Component {...{ backgroundColor, isModal, ...props }} />
    </View>
  );
};
