import { FlashList } from '@shopify/flash-list';
import React from 'react';

import Helper from '@/utilities/Helper';

export default React.forwardRef((props: any, ref) => {
  const indicatorStyle = Helper.useIndicatorStyle();
  return <FlashList ref={ref} indicatorStyle={indicatorStyle} {...props} />;
});
