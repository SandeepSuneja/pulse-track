import { Box, CircularProgress, Typography } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Layout from './components/Layout'
import Activities from './pages/Activities'
import Analytics from './pages/Analytics'
import Board from './pages/Board'
import Dashboard from './pages/Dashboard'
import Effort from './pages/Effort'
import Goals from './pages/Goals'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Register from './pages/Register'

function AuthSplash({ message }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(900px 480px at 20% 0%, rgba(37,99,235,0.28), transparent 55%), #0F172A',
        p: 3,
      }}
    >
      <Box sx={{ textAlign: 'center', color: '#E2E8F0' }}>
        <CircularProgress sx={{ mb: 2, color: '#93C5FD' }} />
        <Typography sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: '#fff' }}>
          Pulse Track
        </Typography>
        <Typography sx={{ color: 'rgba(226,232,240,0.65)' }}>{message}</Typography>
      </Box>
    </Box>
  )
}

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthSplash message="Checking your session…" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthSplash message="Loading…" />
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Login />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <Register />
          </GuestOnly>
        }
      />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Board />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="activities" element={<Activities />} />
        <Route path="effort" element={<Effort />} />
        <Route path="goals" element={<Goals />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
