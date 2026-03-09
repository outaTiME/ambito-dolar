import { View } from 'react-native';

export default ({ height, children }) => (
  <View
    style={{
      pointerEvents: 'none',
      // backgroundColor: 'red',
      bottom: 0,
      height,
      left: 0,
      position: 'absolute',
      right: 0,
      width: '100%',
      // zIndex: 9,
    }}
  >
    {children}
  </View>
);
