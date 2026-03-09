import { Stack } from 'expo-router';
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
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('customize_rates')),
          ...Platform.select({
            ios: {
              headerRight: () => (
                <HeaderButton.Text
                  title="Listo"
                  onPress={() => navigation.goBack()}
                />
              ),
            },
            android: {
              headerLeft: () => (
                <HeaderButton.Icon
                  iconName="arrow-back"
                  onPress={() => navigation.goBack()}
                />
              ),
            },
          }),
        })}
      />
      <Stack.Screen
        name="customize-rates/order"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('rate_order')),
          headerLeft: () => (
            <HeaderButton.Icon
              iconName="arrow-back"
              onPress={() => navigation.goBack()}
            />
          ),
        })}
      />
      <Stack.Screen
        name="customize-rates/display"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('rate_display')),
          headerLeft: () => (
            <HeaderButton.Icon
              iconName="arrow-back"
              onPress={() => navigation.goBack()}
            />
          ),
        })}
      />
    </Stack>
  );
}
