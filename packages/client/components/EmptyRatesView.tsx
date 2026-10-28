// @ts-nocheck
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import ActionButton from '@/components/ActionButton';
import MessageView from '@/components/MessageView';
import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import { goToCustomizeRatesModal } from '@/utilities/Navigation';

export default ({
  edges,
  backgroundColor,
  alternativeBackground,
  // markets reuse the view with their own customize screen
  onSelect = goToCustomizeRatesModal,
}: any) => {
  const content = (
    <>
      <MessageView
        style={{ marginBottom: Settings.PADDING }}
        message={I18n.t('no_selected_items')}
      />
      <ActionButton
        handleOnPress={onSelect}
        title={I18n.t('select_rates')}
        alternativeBackground={alternativeBackground}
      />
    </>
  );
  return (
    <View style={{ flex: 1, backgroundColor }}>
      <SafeAreaView
        // ios applies the native safe area inset plus the rail, android native tabs already do it
        edges={
          Platform.OS === 'ios' ? { ...edges, left: true, right: true } : {}
        }
        style={{ flex: 1, justifyContent: 'center' }}
      >
        {content}
      </SafeAreaView>
    </View>
  );
};
