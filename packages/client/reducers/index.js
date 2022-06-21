import { combineReducers } from '@reduxjs/toolkit';

import application from './application_reducer';
import rates from './rates_reducer';

export default combineReducers({
  application,
  rates,
});
