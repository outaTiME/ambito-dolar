import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { compose } from 'redux';

import * as actions from '../actions';
import CardItemView from '../components/CardItemView';
import CardView from '../components/CardView';
import ScrollView from '../components/ScrollView';
import withContainer from '../components/withContainer';
import I18n from '../config/I18n';
import Helper from '../utilities/Helper';

const AppearanceScreen = () => {
  const selectedAppearance = useSelector(
    (state) => state.application.appearance
  );
  const dispatch = useDispatch();
  return (
    <ScrollView>
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
                  appearance === 'system' ? null : appearance
                )
              );
            }}
          />
        ))}
      </CardView>
    </ScrollView>
  );
};

export default compose(withContainer())(AppearanceScreen);