import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';

export default () => {
  const appearance = useSelector((state) => state.application.appearance);
  const colorScheme = useColorScheme();
  const appColorScheme = appearance ?? colorScheme;
  console.log('>>> useColorScheme', appColorScheme);
  return appColorScheme;
};
