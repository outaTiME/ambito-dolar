import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import FixedScrollView from '../components/FixedScrollView';
import withContainer from '../components/withContainer';
import withDividersOverlay from '../components/withDividersOverlay';
import I18n from '../config/I18n';
import Helper from '../utilities/Helper';

const AppearanceScreen = ({ headerHeight, tabBarheight }) => {
  const selectedAppearance = useSelector(
    (state) => state.application.appearance,
  );
  const dispatch = useDispatch();
  return (
    <FixedScrollView
      {...{
        headerHeight,
        tabBarheight,
      }}
    >
      <CardView title={I18n.t('opts_appearance')} plain>
        {['system', 'light', 'dark'].map((appearance) => (
          <CardItemView
            key={appearance}
            title={Helper.getAppearanceString(appearance)}
            useSwitch={false}
            chevron={false}
            check={
              (!selectedAppearance && appearance === 'system') ||
              selectedAppearance === appearance
            }
            onAction={() => {
              dispatch(
                actions.changeAppearance(
                  appearance === 'system' ? null : appearance,
                ),
              );
            }}
          />
        ))}
      </CardView>
    </FixedScrollView>
  );
};

export default compose(withContainer(), withDividersOverlay)(AppearanceScreen);
