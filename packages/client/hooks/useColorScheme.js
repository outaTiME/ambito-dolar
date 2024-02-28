import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';

export default () => {
  const appearance = useSelector((state) => state.application.appearance);
  const colorScheme = useColorScheme();
  const appColorScheme = appearance ?? colorScheme;
  return appColorScheme;
};
