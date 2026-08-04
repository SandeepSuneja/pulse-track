import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  initializeAuth,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

/** OAuth providers enabled in Firebase Console → Authentication → Sign-in method */
export const AUTH_PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    provider: () => {
      const p = new GoogleAuthProvider()
      p.setCustomParameters({ prompt: 'select_account' })
      return p
    },
  },
]

let auth = null
if (firebaseConfigured) {
  const app = initializeApp(firebaseConfig)
  try {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  } catch {
    // Hot reload may already have initialized Auth.
    auth = getAuth(app)
  }
}

export { auth }
