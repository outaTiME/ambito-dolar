import { compose } from '@reduxjs/toolkit';
import React from 'react';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import FixedScrollView from '../components/FixedScrollView';
import withContainer from '../components/withContainer';
import withDividersOverlay from '../components/withDividersOverlay';
import Helper from '../utilities/Helper';

const RateOrderScreen = ({ isModal, headerHeight, tabBarheight }) => {
  const {
    rate_order: selectedOrder,
    rate_order_direction: selectedOrderDirection,
  } = useSelector(
    ({ application: { rate_order, rate_order_direction } }) => ({
      rate_order,
      rate_order_direction,
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
        {['default', 'name', 'price', 'change', 'update', 'custom'].map(
          (order) => (
            <CardItemView
              key={order}
              title={Helper.getRateOrderString(order)}
              useSwitch={false}
              chevron={false}
              check={
                (!selectedOrder && order === 'default') ||
                selectedOrder === order
              }
              onAction={() => {
                const selection = order === 'default' ? null : order;
                dispatch(actions.changeRateOrder(selection));
              }}
            />
          ),
        )}
      </CardView>
      <CardView {...{ plain: true, isModal }}>
        {['asc', 'desc'].map((direction) => (
          <CardItemView
            key={direction}
            title={direction === 'asc' ? 'Ascendente' : 'Descendente'}
            useSwitch={false}
            chevron={false}
            check={
              (!selectedOrderDirection && direction === 'asc') ||
              selectedOrderDirection === direction
            }
            onAction={() => {
              const selection = direction === 'asc' ? null : direction;
              dispatch(actions.changeRateOrderDirection(selection));
            }}
          />
        ))}
      </CardView>
    </FixedScrollView>
  );
};

export default compose(withContainer(), withDividersOverlay)(RateOrderScreen);
