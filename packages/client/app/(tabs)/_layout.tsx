import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Pressable } from 'react-native';

import ToastBottomTabBar from '@/components/ToastBottomTabBar';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';
import { goToConversionWithFocus } from '@/utilities/Navigation';

export default function TabsLayout() {
  const { theme } = Helper.useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Settings.getForegroundColor(theme),
        tabBarInactiveTintColor: Settings.getStrokeColor(theme),
        tabBarStyle: {
          ...(Platform.OS === 'ios' && {
            position: 'absolute',
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        ...Platform.select({
          ios: {
            tabBarBackground: () => (
              <BlurView
                tint={theme}
                intensity={100}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
            ),
          },
        }),
        tabBarButton: (props: any) => (
          <Pressable
            {...props}
            android_ripple={false as any}
            style={[
              props.style,
              {
                justifyContent: 'center',
              },
            ]}
          />
        ),
      }}
      tabBar={(props) => <ToastBottomTabBar {...props} />}
    >
      <Tabs.Screen
        name="rates"
        options={{
          title: 'Cotizaciones',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cards-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="conversion"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="swap-horizontal-variant"
              color={color}
              size={size}
            />
          ),
        }}
        listeners={{
          tabLongPress: () => {
            goToConversionWithFocus();
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cog-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
