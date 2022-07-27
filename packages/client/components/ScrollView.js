import { useScrollToTop } from '@react-navigation/native';
import React from 'react';
import { ScrollView } from 'react-native';

import Helper from '../utilities/Helper';

export default ({ children, containerRef, ...extra }) => {
  const indicatorStyle = Helper.useIndicatorStyle();
  const ref = React.useRef(containerRef?.current);
  useScrollToTop(ref);
  return (
    <ScrollView indicatorStyle={indicatorStyle} ref={ref} {...extra}>
      {children}
    </ScrollView>
  );
};
