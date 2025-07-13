import { useTheme } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';

export default ({ height = StyleSheet.hairlineWidth, style = {} }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          height,
          backgroundColor: colors.border,
        },
        style,
      ]}
    />
  );
};
