import { View } from 'react-native';

export default ({ height, children }: any) => (
  <View
    style={{
      pointerEvents: 'none',
      bottom: 0,
      height,
      left: 0,
      position: 'absolute',
      right: 0,
      width: '100%',
    }}
  >
    {children}
  </View>
);
