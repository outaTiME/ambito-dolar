import { useLocalSearchParams, useNavigation } from 'expo-router';
import React from 'react';
import { View, Platform } from 'react-native';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

export default (Component: any) => (props: any) => {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { theme } = Helper.useTheme();
  const isModal = params?.modal === 'true';
  const hasBottomTab = navigation?.getParent()?.getState()?.type === 'tab';
  const isRoot = !(isModal || hasBottomTab) && Platform.OS !== 'web';
  const backgroundColor = (Settings as any).getBackgroundColor(
    theme,
    isRoot,
    isModal,
  );
  const containerStyle = React.useMemo<any>(
    () => ({
      flex: 1,
      justifyContent: 'center',
      backgroundColor,
    }),
    [backgroundColor],
  );
  return (
    <View collapsable={false} style={containerStyle}>
      <Component {...{ backgroundColor, isModal, ...props }} />
    </View>
  );
};
