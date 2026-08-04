import { useState } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, md: 3 },
        background:
          'radial-gradient(900px 480px at 10% 0%, rgba(37,99,235,0.35), transparent 55%), radial-gradient(700px 400px at 90% 100%, rgba(14,165,233,0.2), transparent 50%), #0F172A',
      }}
    >
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        sx={{
          width: 'min(920px, 100%)',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          alignItems: 'stretch',
        }}
      >
        <Box
          sx={{
            borderRadius: '16px',
            p: { xs: 3, md: 4 },
            color: '#E2E8F0',
            border: '1px solid rgba(255,255,255,0.08)',
            bgcolor: 'rgba(15,23,42,0.55)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: { md: 480 },
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: 'Sora, sans-serif',
                fontWeight: 700,
                color: '#93C5FD',
                mb: 2,
              }}
            >
              Pulse Track
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Sora, sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1.9rem', md: '2.35rem' },
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                color: '#fff',
                mb: 1.5,
              }}
            >
              Plan work. Track progress.
            </Typography>
            <Typography sx={{ color: 'rgba(226,232,240,0.7)', maxWidth: 380 }}>
              Tickets, time, and effort in one calm workspace.
            </Typography>
          </Box>
          <Stack spacing={1.25} sx={{ mt: 4 }}>
            {[
              ['Board', 'Move tickets by status'],
              ['Effort', 'Score how you showed up'],
              ['Analytics', 'See trends over time'],
            ].map(([title, copy]) => (
              <Stack
                key={title}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ py: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Typography fontWeight={700} color="#fff">
                  {title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.55)' }}>
                  {copy}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Box
          sx={{
            borderRadius: '16px',
            p: { xs: 3, md: 3.5 },
            bgcolor: '#fff',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="overline" color="text.secondary" fontWeight={700}>
            Welcome
          </Typography>
          <Typography sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.4rem', mb: 0.5 }}>
            Sign in
          </Typography>
          <Typography color="text.secondary" mb={2.5} variant="body2">
            Continue with Google or email.
          </Typography>

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
            variant="contained"
            startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}
            disabled={busy || !firebaseConfigured}
            onClick={() => handleProvider('google')}
            sx={{ mb: 2, bgcolor: '#0F172A', '&:hover': { bgcolor: '#1E293B' } }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              OR
            </Typography>
          </Divider>

          {!showEmail ? (
            <Button fullWidth variant="outlined" size="large" onClick={() => setShowEmail(true)}>
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
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  inputProps={{ minLength: 6 }}
                  fullWidth
                />
                {error && <Alert severity="error">{error}</Alert>}
                <Button type="submit" variant="contained" size="large" disabled={busy || !firebaseConfigured}>
                  {busy ? 'Signing in…' : 'Sign in'}
                </Button>
              </Stack>
            </Box>
          )}

          <Typography color="text.secondary" variant="body2" sx={{ mt: 'auto', pt: 3 }}>
            New here?{' '}
            <Link component={RouterLink} to="/register" underline="hover" fontWeight={700}>
              Create an account
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
