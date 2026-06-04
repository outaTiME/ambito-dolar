import { router, Stack } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import HeaderButton from '@/components/HeaderButton';
import I18n from '@/config/I18n';
import Helper from '@/utilities/Helper';

export default function ModalsLayout() {
  const { theme, fonts } = Helper.useTheme();
  return (
    <Stack
      screenOptions={
        Helper.getStackScreenOptions({
          theme,
          fonts,
          modal: true,
        }) as any
      }
    >
      <Stack.Screen
        name="customize-rates/index"
        initialParams={{ modal: 'true' }}
        options={{
          title: Helper.getScreenTitle(I18n.t('customize_rates')),
          ...Platform.select({
            ios: {
              headerRight: () => (
                <HeaderButton.Text
                  title={I18n.t('done')}
                  onPress={() => router.back()}
                />
              ),
            },
            android: {
              headerLeft: () => (
                <HeaderButton.Icon
                  iconName="arrow-back"
                  onPress={() => router.back()}
                />
              ),
            },
          }),
        }}
      />
      <Stack.Screen
        name="customize-rates/order"
        initialParams={{ modal: 'true' }}
        options={{
          title: Helper.getScreenTitle(I18n.t('rate_order')),
        }}
      />
    </Stack>
  );
}
