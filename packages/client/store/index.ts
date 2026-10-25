// @ts-nocheck
import { configureStore } from '@reduxjs/toolkit';
import { Directory, File, Paths } from 'expo-file-system';
import { createMigrate, persistReducer, persistStore } from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { createBlacklistFilter } from 'redux-persist-transform-filter';

import rootReducer from '@/reducers';

// the folder and file names of redux-persist-expo-filesystem, so the persisted state carries over
const appDataDir = new Directory(Paths.document, 'appData');
const getFile = (key) =>
  new File(appDataDir, key.replace(/[^a-z0-9.\-_]/gi, '-'));

// written sync like that library did before File.write turned async in SDK 58
const ExpoFileSystemStorage = {
  getItem: async (key) => {
    const file = getFile(key);
    return file.exists ? file.text() : null;
  },
  setItem: async (key, value) => {
    appDataDir.create({ idempotent: true });
    // the write creates the file on both platforms
    getFile(key).writeSync(value);
  },
  removeItem: async (key) => {
    const file = getFile(key);
    if (file.exists) {
      file.delete();
    }
  },
};

// https://redux-toolkit.js.org/usage/usage-guide#use-with-redux-persist

const debug = __DEV__;

// an integer, redux-persist parses migration keys with parseInt
const STORE_CONFIG_VERSION = 7;

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
