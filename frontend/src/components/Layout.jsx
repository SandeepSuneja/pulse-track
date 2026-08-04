import { useMemo, useState } from 'react'
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined'
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useAuth } from '../AuthContext'

const DRAWER_WIDTH = 252

const links = [
  { to: '/', label: 'Board', icon: ViewKanbanOutlinedIcon },
  { to: '/dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
  { to: '/activities', label: 'Activities', icon: TimelineOutlinedIcon },
  { to: '/effort', label: 'Effort', icon: FavoriteBorderOutlinedIcon },
  { to: '/goals', label: 'Goals', icon: FlagOutlinedIcon },
  { to: '/analytics', label: 'Analytics', icon: InsightsOutlinedIcon },
  { to: '/profile', label: 'Profile', icon: PersonOutlineOutlinedIcon },
]

function NavContent({ onNavigate }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0B1220',
        color: '#E2E8F0',
        backgroundImage:
          'radial-gradient(420px 240px at 0% 0%, rgba(59,130,246,0.18), transparent 60%)',
      }}
    >
      <Box sx={{ px: 2, pt: 2.5, pb: 1.75 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'Sora, sans-serif',
              fontWeight: 800,
              fontSize: 12,
              color: '#fff',
              background: 'linear-gradient(145deg, #60A5FA, #2563EB)',
              boxShadow: '0 8px 18px rgba(37,99,235,0.35)',
              flexShrink: 0,
            }}
          >
            PT
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              sx={{
                fontFamily: 'Sora, sans-serif',
                fontWeight: 700,
                fontSize: '0.95rem',
                letterSpacing: '-0.02em',
                color: '#fff',
                lineHeight: 1.2,
              }}
            >
              Pulse Track
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.55)', lineHeight: 1.2 }}>
              Workspace
            </Typography>
          </Box>
        </Stack>
      </Box>

      <List sx={{ px: 1.25, py: 0.5, flex: 1 }}>
        {links.map((link) => {
          const Icon = link.icon
          const selected =
            link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to)
          return (
            <ListItemButton
              key={link.to}
              component={RouterLink}
              to={link.to}
              selected={selected}
              onClick={onNavigate}
              sx={{
                mb: 0.35,
                minHeight: 44,
                borderRadius: '10px',
                px: 1.25,
                color: 'rgba(226,232,240,0.78)',
                '&.Mui-selected': {
                  bgcolor: 'rgba(59,130,246,0.18)',
                  color: '#BFDBFE',
                  boxShadow: 'inset 3px 0 0 #3B82F6',
                  '&:hover': { bgcolor: 'rgba(59,130,246,0.24)' },
                  '& .MuiListItemIcon-root': { color: '#BFDBFE' },
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                <Icon sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary={link.label}
                primaryTypographyProps={{ fontWeight: 600, fontSize: 0.9 }}
              />
            </ListItemButton>
          )
        })}
      </List>

      <Box sx={{ p: 1.75, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Stack direction="row" spacing={1.25} alignItems="center" mb={1.25}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: 'rgba(59,130,246,0.2)',
              color: '#BFDBFE',
              fontWeight: 700,
              fontSize: 0.8,
              flexShrink: 0,
            }}
          >
            {(user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap fontWeight={600} fontSize={0.82} color="#fff">
              {user?.displayName || user?.email}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.5)' }}>
              Signed in
            </Typography>
          </Box>
        </Stack>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          startIcon={<LogoutOutlinedIcon sx={{ fontSize: 18 }} />}
          onClick={() => {
            logout()
            navigate('/login')
          }}
          sx={{
            color: '#E2E8F0',
            borderColor: 'rgba(255,255,255,0.12)',
            minHeight: 38,
            '&:hover': {
              borderColor: '#93C5FD',
              bgcolor: 'rgba(37,99,235,0.1)',
            },
          }}
        >
          Sign out
        </Button>
      </Box>
    </Box>
  )
}

export default function Layout() {
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const active = useMemo(
    () =>
      links.find((l) =>
        l.to === '/' ? location.pathname === '/' : location.pathname.startsWith(l.to),
      ),
    [location.pathname],
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 0 },
          }}
        >
          <NavContent onNavigate={() => setMobileOpen(false)} />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              border: 0,
              borderRight: '1px solid rgba(15,23,42,0.06)',
            },
          }}
        >
          <NavContent />
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 8,
            height: 58,
            px: { xs: 2, md: 3 },
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: 'rgba(248,250,252,0.82)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)} edge="start" size="small">
              <MenuIcon />
            </IconButton>
          )}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              Pulse Track
            </Typography>
            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                bgcolor: 'text.disabled',
                flexShrink: 0,
              }}
            />
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {active?.label || 'Board'}
            </Typography>
          </Stack>
          <Box
            sx={{
              ml: 'auto',
              display: { xs: 'none', sm: 'inline-flex' },
              alignItems: 'center',
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              bgcolor: 'rgba(34,197,94,0.1)',
              color: '#16A34A',
              fontSize: 0.72,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' }} />
            Live
          </Box>
        </Box>

        <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 2.5 }, flex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  )
}
