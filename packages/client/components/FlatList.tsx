import { FlashList } from '@shopify/flash-list';
import React from 'react';

import Helper from '@/utilities/Helper';

export default React.forwardRef<any, any>((props: any, ref: any) => {
  const indicatorStyle = Helper.useIndicatorStyle();
  return <FlashList ref={ref} indicatorStyle={indicatorStyle} {...props} />;
});
