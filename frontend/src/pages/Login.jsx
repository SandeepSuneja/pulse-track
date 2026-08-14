import { useState } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import { useAuth } from '../AuthContext'
import AuthLayout, { googleBtnSx } from '../components/AuthLayout'

export default function Login() {
  const { login, loginWithProvider, user, loading, firebaseConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  async function handleProvider(providerId) {
    setError('')
    setBusy(true)
    try {
      await loginWithProvider(providerId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      kicker="Sign in"
      title="Welcome back"
      subtitle="Continue with Google or email to open your board."
      footer={
        <>
          New here?{' '}
          <Link component={RouterLink} to="/register" underline="hover" fontWeight={700}>
            Create an account
          </Link>
        </>
      }
    >
      {!firebaseConfigured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Add Firebase config in <code>frontend/.env</code> to enable sign-in.
        </Alert>
      )}

      {error && !showEmail && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        fullWidth
        size="large"
        variant="outlined"
        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}
        disabled={busy || !firebaseConfigured}
        onClick={() => handleProvider('google')}
        sx={{ ...googleBtnSx, mb: 2 }}
      >
        Continue with Google
      </Button>

      <Divider sx={{ my: 2, borderColor: 'rgba(34,211,238,0.12)' }}>
        <Typography variant="caption" sx={{ color: '#8BA3C7', fontWeight: 700 }}>
          OR
        </Typography>
      </Divider>

      {!showEmail ? (
        <Button fullWidth variant="contained" size="large" onClick={() => setShowEmail(true)}>
          Sign in with email
        </Button>
      ) : (
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={1.75}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              inputProps={{ minLength: 6 }}
              fullWidth
              autoComplete="current-password"
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={busy || !firebaseConfigured}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
            <Button type="button" disabled={busy} onClick={() => setShowEmail(false)} sx={{ color: '#8BA3C7' }}>
              Back
            </Button>
          </Stack>
        </Box>
      )}
    </AuthLayout>
  )
}
