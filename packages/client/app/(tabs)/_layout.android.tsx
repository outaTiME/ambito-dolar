import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import NativeTabsLayout from '@/components/NativeTabsLayout';
import ToastBottomTabBar from '@/components/ToastBottomTabBar';
import Settings from '@/config/settings';
import Helper from '@/utilities/Helper';
import { goToConversionWithFocus } from '@/utilities/Navigation';

// classic Tabs path gives hairline divider NativeTabs cannot render on android
// Settings.USE_NATIVE_TABS_ANDROID also gates ToastOverlay and header hairline
export default function TabsLayout() {
  const { theme } = Helper.useTheme();
  if (Settings.USE_NATIVE_TABS_ANDROID) {
    return <NativeTabsLayout />;
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Settings.getForegroundColor(theme),
        tabBarInactiveTintColor: Settings.getStrokeColor(theme),
        tabBarStyle: {
          backgroundColor: Settings.getContentColor(theme),
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Settings.getSeparatorColor(theme),
          // drop Material elevation to match header hairline
          elevation: 0,
        },
        tabBarButton: (props: any) => (
          <Pressable
            {...props}
            android_ripple={null}
            style={[props.style, { justifyContent: 'center' }]}
          />
        ),
      }}
      tabBar={(props) => <ToastBottomTabBar {...props} />}
    >
      <Tabs.Screen
        name="rates"
        options={{
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
