import React from 'react';
import { TextInput } from 'react-native';

import Helper from '../utilities/Helper';

export default React.forwardRef((props, ref) => {
  const { theme } = Helper.useTheme();
  return <TextInput keyboardAppearance={theme} {...props} ref={ref} />;
});
