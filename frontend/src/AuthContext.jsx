import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { AUTH_PROVIDERS, auth, firebaseConfigured } from './firebase'

const AuthContext = createContext(null)

function formatAuthError(err) {
  const code = err?.code || ''
  if (code === 'auth/popup-blocked') {
    return 'Your browser blocked the Google sign-in popup. Allow popups for this site, then try again.'
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in was closed before finishing. Try again.'
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Another sign-in popup was already open. Close it and try again.'
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized in Firebase. Add localhost in Authentication → Settings → Authorized domains.'
  }
  return err?.message || 'Sign-in failed.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  function applyUser(firebaseUser, idToken) {
    // flushSync so route guards see the session before any navigation.
    flushSync(() => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setToken(idToken)
      } else {
        setUser(null)
        setToken(null)
      }
    })
    return firebaseUser
  }

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setLoading(false)
      return undefined
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const idToken = await firebaseUser.getIdToken()
          applyUser(firebaseUser, idToken)
        } else {
          applyUser(null, null)
        }
      } finally {
        setLoading(false)
      }
    })

    return unsub
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      firebaseConfigured,
      providers: AUTH_PROVIDERS,
      async loginWithProvider(providerId) {
        if (!auth) {
          throw new Error(
            'Firebase is not configured. Add VITE_FIREBASE_* values to frontend/.env and enable Google in Firebase Console.',
          )
        }
        const config = AUTH_PROVIDERS.find((p) => p.id === providerId)
        if (!config) throw new Error(`Unknown provider: ${providerId}`)

        // Popup only — redirect sign-in silently loses the session on modern browsers
        // when auth runs through *.firebaseapp.com (third-party storage blocked).
        try {
          const cred = await signInWithPopup(auth, config.provider())
          const idToken = await cred.user.getIdToken()
          return applyUser(cred.user, idToken)
        } catch (err) {
          throw new Error(formatAuthError(err))
        }
      },
      async register(email, password, displayName) {
        if (!auth) throw new Error('Firebase is not configured. Set VITE_FIREBASE_* in frontend/.env')
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        if (displayName) await updateProfile(cred.user, { displayName })
        const idToken = await cred.user.getIdToken()
        return applyUser(cred.user, idToken)
      },
      async login(email, password) {
        if (!auth) throw new Error('Firebase is not configured. Set VITE_FIREBASE_* in frontend/.env')
        const cred = await signInWithEmailAndPassword(auth, email, password)
        const idToken = await cred.user.getIdToken()
        return applyUser(cred.user, idToken)
      },
      async logout() {
        if (auth) await signOut(auth)
        applyUser(null, null)
      },
      async refreshToken() {
        if (!auth?.currentUser) return null
        const idToken = await auth.currentUser.getIdToken(true)
        setToken(idToken)
        return idToken
      },
    }),
    [user, token, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
