import { configureStore } from '@reduxjs/toolkit';
import {
  createMigrate,
  persistReducer,
  persistStore,
  // FLUSH,
  // REHYDRATE,
  // PAUSE,
  // PERSIST,
  // PURGE,
  // REGISTER,
} from 'redux-persist';
import ExpoFileSystemStorage from 'redux-persist-expo-filesystem';
import { createBlacklistFilter } from 'redux-persist-transform-filter';

import rootReducer from '../reducers';

// https://redux-toolkit.js.org/usage/usage-guide#use-with-redux-persist

const saveApplicationSubsetBlacklistFilter = createBlacklistFilter(
  'application',
  ['push_token', 'sending_push_token']
);

const STORE_CONFIG_VERSION = 6;

const migrations = {
  [STORE_CONFIG_VERSION]: ({ application }) => ({
    application,
  }),
};

const persistConfig = {
  key: 'root',
  storage: ExpoFileSystemStorage,
  debug: __DEV__,
  version: STORE_CONFIG_VERSION,
  migrate: createMigrate(migrations, { debug: __DEV__ }),
  transforms: [saveApplicationSubsetBlacklistFilter],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
      /* immutableCheck: {
        warnAfter: 100,
      },
      serializableCheck: {
        warnAfter: 100,
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      }, */
    }),
});

export const persistor = persistStore(store);
