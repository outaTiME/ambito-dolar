import 'expo-router/entry';
import { Platform } from 'react-native';

// headless widget tasks run without the router, so registration must happen at entry
if (Platform.OS === 'android') {
  const {
    registerWidgetConfigurationScreen,
    registerWidgetTaskHandler,
  } = require('react-native-android-widget');
  const { taskHandler } = require('./widgets');
  // guarded require, the configuration screen pulls in android only native views
  const { ConfigurationScreen } = require('./widgets/ConfigurationScreen');
  registerWidgetTaskHandler(taskHandler);
  registerWidgetConfigurationScreen(ConfigurationScreen);
}
