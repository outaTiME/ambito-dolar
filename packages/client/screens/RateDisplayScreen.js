import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import FixedScrollView from '../components/FixedScrollView';
import withContainer from '../components/withContainer';
import Helper from '../utilities/Helper';

const RateDisplayScreen = ({ isModal, headerHeight, tabBarheight }) => {
  const { rate_display: selectedDisplay } = useSelector(
    ({ application: { rate_display } }) => ({
      rate_display,
    }),
    shallowEqual,
  );
  const dispatch = useDispatch();
  return (
    <FixedScrollView
      {...{
        headerHeight,
        tabBarheight,
      }}
    >
      <CardView {...{ plain: true, isModal }}>
        {['default', 'buy', 'average', 'sell'].map((display) => (
          <CardItemView
            key={display}
            title={Helper.getRateDisplayString(display)}
            useSwitch={false}
            chevron={false}
            check={
              (!selectedDisplay && display === 'default') ||
              selectedDisplay === display
            }
            onAction={() => {
              const selection = display === 'default' ? null : display;
              dispatch(actions.changeRateDisplay(selection));
            }}
          />
        ))}
      </CardView>
    </FixedScrollView>
  );
};

export default compose(withContainer)(RateDisplayScreen);
