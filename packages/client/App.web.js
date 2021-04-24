import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFonts } from '@use-expo/font';
import AppLoading from 'expo-app-loading';
import React from 'react';

import AppContainer from './components/AppContainer';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...FontAwesome5.font,
    'FiraGO-Regular': require('./assets/fonts/FiraGO-Regular-Minimal.otf'),
  });
  if (!fontsLoaded) {
    return <AppLoading />;
  }
  return <AppContainer />;
}
