module.exports = {
  type: 'widget',
  name: 'RateWidgetsExtension',
  displayName: 'RateWidgets',
  bundleIdentifier: '.RateWidgets',
  deploymentTarget: '17.0',
  colors: {
    // the hand written project pointed AccentColor at the system linkColor. the plugin only emits
    // literal components and always in display-p3, so these are systemBlue converted into that
    // space: passing the sRGB #007AFF renders a visibly different tone
    $accent: { light: '#3478F6', dark: '#3B82F7' },
    $widgetBackground: '#1C1C1E',
  },
};
