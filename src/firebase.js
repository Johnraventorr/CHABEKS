import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth'

// Public Firebase web config. If Firebase reports api-key-not-valid, replace the
// key with the exact key shown in Firebase Console > Project settings > Your apps.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBDW9nvMT1oHemZSjul15H_fKS6H2Mva40",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chabakes-7059c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chabakes-7059c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chabakes-7059c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "382417477498",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:382417477498:web:329e9dba72f56f1e2dc0c3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WHG52P189J"
}
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(app)
setPersistence(firebaseAuth, browserLocalPersistence).catch((error) => console.error('[Firebase persistence]', error.code || error.message))
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
googleProvider.addScope('email')
googleProvider.addScope('profile')
