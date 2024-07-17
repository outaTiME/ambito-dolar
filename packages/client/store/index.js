import { configureStore } from '@reduxjs/toolkit';
import { createMigrate, persistReducer, persistStore } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import ExpoFileSystemStorage from 'redux-persist-expo-filesystem';
import { createBlacklistFilter } from 'redux-persist-transform-filter';

import rootReducer from '../reducers';

// https://redux-toolkit.js.org/usage/usage-guide#use-with-redux-persist

const debug = __DEV__;

const STORE_CONFIG_VERSION = 6.1;

const migrations = {
  // when store config version bump leave application data only
  [STORE_CONFIG_VERSION]: ({ application }) => ({
    application,
  }),
};

const saveApplicationSubsetBlacklistFilter = createBlacklistFilter(
  'application',
  ['push_token', 'sending_push_token'],
);

const persistConfig = {
  key: 'root',
  storage: ExpoFileSystemStorage,
  debug,
  version: STORE_CONFIG_VERSION,
  migrate: createMigrate(migrations, { debug }),
  transforms: [saveApplicationSubsetBlacklistFilter],
  stateReconciler: autoMergeLevel2,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
