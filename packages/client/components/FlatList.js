import { useScrollToTop } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React from 'react';

import Helper from '../utilities/Helper';

export default (props) => {
  const indicatorStyle = Helper.useIndicatorStyle();
  const ref = React.useRef(null);
  useScrollToTop(ref);
  return <FlashList indicatorStyle={indicatorStyle} ref={ref} {...props} />;
};
