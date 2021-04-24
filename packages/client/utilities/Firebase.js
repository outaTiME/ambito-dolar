import * as firebase from 'firebase';

if (!firebase.apps.length) {
  firebase.initializeApp(JSON.parse(process.env.FIREBASE_CONFIG_JSON));
}

if (__DEV__) {
  // firebase.database.enableLogging(true);
}

export default firebase;
