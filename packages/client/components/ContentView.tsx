import React from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import Settings from '@/config/settings';
import { MAX_CONTENT_WIDTH, WEB_WIDTH } from '@/hooks/useContentLayout';

// the outer one already sets the column, a nested one spans it over the outer margin
const NestedContext = React.createContext(false);

// apple readableContentGuide, centered in the safe area
export const COLUMN_STYLE = {
  alignSelf: 'center',
  width: MAX_CONTENT_WIDTH,
  maxWidth: '100%',
} as const;

export default React.forwardRef(
  ({ children, style, contentContainerStyle }: any, ref: any) => {
    const nested = React.useContext(NestedContext);
    const content = (
      <View
        style={[
          nested
            ? { marginHorizontal: -Settings.CONTENT_MARGIN }
            : // web keeps a fixed width for the social cards
              Platform.OS === 'web'
              ? { alignSelf: 'center', width: WEB_WIDTH }
              : COLUMN_STYLE,
          style,
        ]}
        ref={ref}
        collapsable={false}
      >
        <View
          style={[{ margin: Settings.CONTENT_MARGIN }, contentContainerStyle]}
        >
          <NestedContext.Provider value>{children}</NestedContext.Provider>
        </View>
      </View>
    );
    if (nested || Platform.OS === 'web') {
      return content;
    }
    // native insets, a rotation pads the rail without waiting for js
    return (
      // flex 0, the component defaults to flex 1 and would take the screen height
      <SafeAreaView edges={{ left: true, right: true }} style={{ flex: 0 }}>
        {content}
      </SafeAreaView>
    );
  },
);
