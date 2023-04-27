import { useScrollToTop } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React from 'react';
import DraggableFlatList from 'react-native-draggable-flatlist';
// import DragList from 'react-native-draglist';

import Helper from '../utilities/Helper';

export default (props) => {
  const indicatorStyle = Helper.useIndicatorStyle();
  const ref = React.useRef(null);
  useScrollToTop(ref);
  let Component = FlashList;
  if (props.draggable === true) {
    Component = DraggableFlatList;
    // Component = DragList;
  }
  return (
    <Component
      indicatorStyle={indicatorStyle}
      ref={ref}
      {...props}
      {...(Component === DraggableFlatList && {
        containerStyle: {
          flex: 1,
        },
      })}
    />
  );
};
