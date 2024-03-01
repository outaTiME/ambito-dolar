import { useScrollToTop } from '@react-navigation/native';
import React from 'react';
import { ScrollView } from 'react-native';

import Helper from '../utilities/Helper';

export default ({ children, handleContentChangeSize = false, ...props }) => {
  const indicatorStyle = Helper.useIndicatorStyle();
  const ref = React.useRef(null);
  useScrollToTop(ref);
  return (
    <ScrollView
      ref={ref}
      // scroll to the top when the rate list change size
      {...(handleContentChangeSize === true && {
        onContentSizeChange: () => {
          ref.current?.scrollTo({
            y: 0,
            animated: true,
          });
        },
      })}
      indicatorStyle={indicatorStyle}
      {...props}
    >
      {children}
    </ScrollView>
  );
};
