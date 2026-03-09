import AmbitoDolar from '@ambito-dolar/core';
import { Stack } from 'expo-router';

import HeaderButton from '@/components/HeaderButton';
import I18n from '@/config/I18n';
import Helper from '@/utilities/Helper';

export default function SettingsStackLayout() {
  const { theme, fonts } = Helper.useTheme();
  return (
    <Stack
      screenOptions={Helper.getStackScreenOptions({ theme, fonts }) as any}
    >
      <Stack.Screen
        name="index"
        options={{
          title: Helper.getScreenTitle(I18n.t('settings')),
        }}
      />
      <Stack.Screen
        name="notifications"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('notifications')),
          headerBackVisible: false,
          headerLeft: () => (
            <HeaderButton.Icon
              iconName="arrow-back"
              onPress={() => navigation.goBack()}
            />
          ),
        })}
      />
      <Stack.Screen
        name="notifications/[type]"
        options={({ navigation, route }) => ({
          title: Helper.getScreenTitle(I18n.t('advanced_notifications')),
          headerBackVisible: false,
          headerLeft: () => (
            <HeaderButton.Icon
              iconName="arrow-back"
              onPress={() => navigation.goBack()}
            />
          ),
          ...((route as any)?.params?.type && {
            title: Helper.getScreenTitle(
              AmbitoDolar.getNotificationTitle((route as any).params.type),
            ),
          }),
        })}
      />
      <Stack.Screen
        name="appearance"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('appearance')),
          headerBackVisible: false,
          headerLeft: () => (
            <HeaderButton.Icon
              iconName="arrow-back"
              onPress={() => navigation.goBack()}
            />
          ),
        })}
      />
      <Stack.Screen
        name="customize-rates/index"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('customize_rates')),
          headerBackVisible: false,
          headerLeft: () => (
            <HeaderButton.Icon
              iconName="arrow-back"
              onPress={() => navigation.goBack()}
            />
          ),
        })}
      />
      <Stack.Screen
        name="customize-rates/order"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('rate_order')),
          headerBackVisible: false,
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
          headerBackVisible: false,
          headerLeft: () => (
            <HeaderButton.Icon
              iconName="arrow-back"
              onPress={() => navigation.goBack()}
            />
          ),
        })}
      />
      <Stack.Screen
        name="statistics"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('statistics')),
          headerBackVisible: false,
          headerLeft: () => (
            <HeaderButton.Icon
              iconName="arrow-back"
              onPress={() => navigation.goBack()}
            />
          ),
        })}
      />
      <Stack.Screen
        name="about"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('about')),
          headerBackVisible: false,
          headerLeft: () => (
            <HeaderButton.Icon
              iconName="arrow-back"
              onPress={() => navigation.goBack()}
            />
          ),
        })}
      />
      <Stack.Screen
        name="developer"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('developer')),
          headerBackVisible: false,
          headerLeft: () => (
            <HeaderButton.Icon
              iconName="arrow-back"
              onPress={() => navigation.goBack()}
            />
          ),
        })}
      />
      <Stack.Screen
        name="rate-widget-preview"
        options={({ navigation }) => ({
          title: Helper.getScreenTitle(I18n.t('detail')),
          headerBackVisible: false,
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
