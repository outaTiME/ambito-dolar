import React from 'react';
import { useSelector } from 'react-redux';

import I18n from '@/config/I18n';
import Settings from '@/config/settings';
import DateUtils from '@/utilities/Date';
import Helper from '@/utilities/Helper';

const EPHEMERAL_MS = 3000;

const useHeaderSubtitle = () => {
  const updated_at = useSelector((s: any) => s.rates.updated_at);
  const [showUpdated, setShowUpdated] = React.useState(false);
  const prevRef = React.useRef(updated_at);
  const frozenDateRef = React.useRef(null);
  const now = Helper.useNow();
  // detect push during render to commit ephemeral same frame as cards
  if (prevRef.current && prevRef.current !== updated_at) {
    prevRef.current = updated_at;
    // freeze date for ephemeral window so cross-midnight tick doesn't mutate text
    frozenDateRef.current = DateUtils.humanize(Date.now(), 9);
    setShowUpdated(true);
  }
  React.useEffect(() => {
    if (!showUpdated) {
      return;
    }
    const t = setTimeout(() => {
      setShowUpdated(false);
      frozenDateRef.current = null;
    }, EPHEMERAL_MS);
    return () => {
      clearTimeout(t);
    };
  }, [showUpdated, updated_at]);
  if (!Settings.NEW_HEADER_SCHEME) {
    return undefined;
  }
  if (showUpdated) {
    const label = I18n.t('updated_now');
    if (Settings.HEADER_EPHEMERAL_CONCAT) {
      return `${frozenDateRef.current} · ${label}`;
    }
    return label;
  }
  return DateUtils.humanize(now, 9);
};

export default useHeaderSubtitle;
