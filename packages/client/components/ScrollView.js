import { useScrollToTop } from '@react-navigation/native';
import React from 'react';
import { ScrollView } from 'react-native';

import Helper from '../utilities/Helper';

export default ({ children, ...props }) => {
  const indicatorStyle = Helper.useIndicatorStyle();
  const ref = React.useRef(null);
  useScrollToTop(ref);
  return (
    <ScrollView indicatorStyle={indicatorStyle} ref={ref} {...props}>
      {children}
    </ScrollView>
  );
};
