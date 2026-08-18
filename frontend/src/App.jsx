import { Box, CircularProgress, Typography } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Layout from './components/Layout'
import Activities from './pages/Activities'
import Analytics from './pages/Analytics'
import Board from './pages/Board'
import Dashboard from './pages/Dashboard'
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
          'radial-gradient(900px 480px at 10% 0%, rgba(34,211,238,0.18), transparent 55%), #060B14',
        p: 3,
      }}
    >
      <Box sx={{ textAlign: 'center', color: '#E8F1FF' }}>
        <CircularProgress sx={{ mb: 2, color: '#22D3EE' }} />
        <Typography sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#E8F1FF' }}>
          Pulse Track
        </Typography>
        <Typography sx={{ color: '#8BA3C7' }}>{message}</Typography>
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
        <Route path="goals" element={<Goals />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
