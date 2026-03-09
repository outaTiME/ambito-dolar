import { combineReducers } from '@reduxjs/toolkit';

import application from '@/reducers/application_reducer';
import rates from '@/reducers/rates_reducer';

export default combineReducers({
  application,
  rates,
});
