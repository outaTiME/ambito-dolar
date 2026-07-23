import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ContentView from '@/components/ContentView';
import ScrollView from '@/components/ScrollView';
import Settings from '@/config/settings';

const FixedScrollView = ({
  children,
  backgroundColor,
  contentContainerRef,
  contentContainerStyle,
  isModal,
  ...extra
}) => {
  const insets = useSafeAreaInsets();
  // android native stack modal scrolls under the transparent nav bar, pad it
  const isAndroidModal = Platform.OS === 'android' && isModal;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        contentContainerStyle,
        isAndroidModal && { paddingBottom: insets.bottom },
      ]}
      {...extra}
    >
      <ContentView
        style={{ backgroundColor }}
        contentContainerStyle={Settings.CONTENT_TOP_SHRINK_STYLE}
        ref={contentContainerRef}
      >
        {children}
      </ContentView>
    </ScrollView>
  );
};

export default FixedScrollView;
