import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyCH_lb0nGSyL0SMx2OmjipRw2VT0AdoPq0',
  authDomain: 'yumurcak-app.firebaseapp.com',
  databaseURL: 'https://yumurcak-app-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'yumurcak-app',
  storageBucket: 'yumurcak-app.firebasestorage.app',
  messagingSenderId: '857802425510',
  appId: '1:857802425510:web:f023a72805bb40d750e067',
};

// Firebase App tek sefer initialize edilir
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let auth;

// React Native / Expo için doğru Auth kurulumu
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

// Realtime Database
const database = getDatabase(app);

// Firebase Storage
const storage = getStorage(app);

// Cloud Functions — functions/index.js'deki callable fonksiyonlar
// (örn. deleteKullanici) 'europe-west1' bölgesinde deploy edildiği için
// bölge burada da eşleşmeli, yoksa "function not found" hatası alınır.
const functions = getFunctions(app, 'europe-west1');

export { app, auth, database, storage, functions };
export default app;
