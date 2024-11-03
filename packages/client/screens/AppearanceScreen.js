import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import FixedScrollView from '../components/FixedScrollView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Helper from '../utilities/Helper';

const AppearanceScreen = ({ headerHeight, tabBarheight }) => {
  const selectedAppearance = useSelector(
    (state) => state.application.appearance,
  );
  const availableAppearances = Helper.getAvailableAppearances();
  const dispatch = useDispatch();
  return (
    <FixedScrollView
      {...{
        headerHeight,
        tabBarheight,
      }}
    >
      <CardView title={I18n.t('opts_appearance')} plain>
        {availableAppearances.map((appearance, index) => (
          <CardItemView
            key={appearance}
            title={Helper.getAppearanceString(appearance)}
            useSwitch={false}
            chevron={false}
            check={
              (!selectedAppearance && index === 0) ||
              selectedAppearance === appearance
            }
            onAction={() => {
              dispatch(
                actions.changeAppearance(index === 0 ? null : appearance),
              );
            }}
          />
        ))}
      </CardView>
    </FixedScrollView>
  );
};

export default compose(withContainer)(AppearanceScreen);
