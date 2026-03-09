import { useQuickAction } from 'expo-quick-actions/hooks';
import React from 'react';

import Amplitude from '@/utilities/Amplitude';
import Helper from '@/utilities/Helper';
import {
  goToConversionWithFocus,
  goToRatesWithPopToTop,
} from '@/utilities/Navigation';

export default function useQuickActionsRouter() {
  const quickAction = useQuickAction();
  React.useEffect(() => {
    if (quickAction) {
      Helper.debug('🎯 Quick action received', quickAction);
      const type = String(quickAction?.id || '').toLowerCase();
      if (type) {
        Amplitude.track('Quick action', { type });
        if (type === 'conversion') {
          goToConversionWithFocus();
        } else {
          goToRatesWithPopToTop();
        }
      }
    }
  }, [quickAction]);
}
