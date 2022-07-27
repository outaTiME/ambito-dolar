import { useScrollToTop } from '@react-navigation/native';
import React from 'react';
import { FlatList } from 'react-native';

import Helper from '../utilities/Helper';

export default ({ containerRef, ...extra }) => {
  const indicatorStyle = Helper.useIndicatorStyle();
  const ref = React.useRef(containerRef?.current);
  useScrollToTop(ref);
  return <FlatList indicatorStyle={indicatorStyle} ref={ref} {...extra} />;
};
