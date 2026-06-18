import { useLocalSearchParams, useNavigation } from 'expo-router';
import React from 'react';
import { View, Platform } from 'react-native';

import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';

export default (Component) => (props) => {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { theme } = Helper.useTheme();
  const isModal = params?.modal === 'true';
  const hasBottomTab = navigation?.getParent()?.getState()?.type === 'tab';
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
      <Component {...{ backgroundColor, isModal, ...props }} />
    </View>
  );
};
