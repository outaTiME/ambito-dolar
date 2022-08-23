import { useScrollToTop } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React from 'react';

import Helper from '../utilities/Helper';

export default ({ containerRef, ...extra }) => {
  const indicatorStyle = Helper.useIndicatorStyle();
  const ref = React.useRef(containerRef?.current);
  useScrollToTop(ref);
  return <FlashList indicatorStyle={indicatorStyle} ref={ref} {...extra} />;
};
