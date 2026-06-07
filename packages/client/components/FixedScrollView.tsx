import ContentView from '@/components/ContentView';
import ScrollView from '@/components/ScrollView';
import Settings from '@/config/settings';

const FixedScrollView = ({
  children,
  backgroundColor,
  contentContainerRef,
  ...extra
}) => (
  <ScrollView contentInsetAdjustmentBehavior="automatic" {...extra}>
    <ContentView
      style={{ backgroundColor }}
      contentContainerStyle={Settings.CONTENT_TOP_SHRINK_STYLE}
      ref={contentContainerRef}
    >
      {children}
    </ContentView>
  </ScrollView>
);

export default FixedScrollView;
