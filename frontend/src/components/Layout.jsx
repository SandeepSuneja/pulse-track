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
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useAuth } from '../AuthContext'

const DRAWER_WIDTH = 260

const links = [
  { to: '/', label: 'Board', icon: ViewKanbanOutlinedIcon },
  { to: '/dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon },
  { to: '/activities', label: 'Activities', icon: TimelineOutlinedIcon },
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
        bgcolor: '#070E1A',
        color: '#E8F1FF',
        borderRight: '1px solid rgba(34,211,238,0.12)',
        backgroundImage: `
          radial-gradient(1px 1px at 20% 30%, rgba(232,241,255,0.45), transparent),
          radial-gradient(1px 1px at 70% 60%, rgba(34,211,238,0.4), transparent),
          radial-gradient(1px 1px at 40% 80%, rgba(125,211,252,0.35), transparent),
          radial-gradient(380px 220px at 0% 0%, rgba(34,211,238,0.12), transparent 60%),
          linear-gradient(180deg, #0A1220 0%, #060B14 100%)
        `,
      }}
    >
      <Box sx={{ px: 2.25, pt: 2.75, pb: 2 }}>
        <Stack direction="row" spacing={1.35} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: '0.06em',
              color: '#041018',
              background: 'linear-gradient(145deg, #67E8F9, #0891B2)',
              border: '1px solid rgba(103,232,249,0.45)',
              flexShrink: 0,
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: -3,
                borderRadius: '12px',
                border: '1px solid rgba(34,211,238,0.2)',
                pointerEvents: 'none',
              },
            }}
          >
            PT
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              sx={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '-0.02em',
                color: '#F0F7FF',
                lineHeight: 1.15,
              }}
            >
              Pulse Track
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(103,232,249,0.7)',
                lineHeight: 1.2,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontSize: '0.62rem',
                fontWeight: 700,
              }}
            >
              Orbital Ops
            </Typography>
          </Box>
        </Stack>
      </Box>

      <List sx={{ px: 1.35, py: 0.5, flex: 1 }}>
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
                mb: 0.4,
                minHeight: 44,
                borderRadius: '10px',
                px: 1.25,
                color: 'rgba(232,241,255,0.68)',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                '&.Mui-selected': {
                  bgcolor: 'rgba(34,211,238,0.12)',
                  color: '#67E8F9',
                  boxShadow: 'inset 2px 0 0 #22D3EE',
                  '&:hover': { bgcolor: 'rgba(34,211,238,0.16)' },
                  '& .MuiListItemIcon-root': { color: '#67E8F9' },
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', color: '#E8F1FF' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                <Icon sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary={link.label}
                primaryTypographyProps={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  fontFamily: 'Space Grotesk, sans-serif',
                }}
              />
            </ListItemButton>
          )
        })}
      </List>

      <Box sx={{ p: 1.75, borderTop: '1px solid rgba(34,211,238,0.1)' }}>
        <Stack direction="row" spacing={1.25} alignItems="center" mb={1.25}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: 'rgba(34,211,238,0.15)',
              color: '#67E8F9',
              fontWeight: 700,
              fontSize: '0.8rem',
              border: '1px solid rgba(34,211,238,0.3)',
              flexShrink: 0,
            }}
          >
            {(user?.displayName || user?.email || '?').slice(0, 1).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap fontWeight={600} fontSize={0.82} color="#E8F1FF">
              {user?.displayName || user?.email}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(139,163,199,0.75)' }}>
              Crew member
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
            color: '#C5D4E8',
            borderColor: 'rgba(34,211,238,0.22)',
            minHeight: 38,
            '&:hover': {
              borderColor: '#22D3EE',
              bgcolor: 'rgba(34,211,238,0.08)',
              color: '#67E8F9',
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
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 0, bgcolor: '#070E1A' },
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
              bgcolor: '#070E1A',
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
          position: 'relative',
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
            bgcolor: 'rgba(6,11,20,0.78)',
            backdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(34,211,238,0.12)',
          }}
        >
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)} edge="start" size="small" sx={{ color: '#67E8F9' }}>
              <MenuIcon />
            </IconButton>
          )}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              noWrap
              sx={{ color: 'rgba(139,163,199,0.85)', letterSpacing: '0.04em', fontSize: '0.75rem' }}
            >
              PULSE TRACK
            </Typography>
            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: '1px',
                bgcolor: '#22D3EE',
                flexShrink: 0,
                opacity: 0.7,
              }}
            />
            <Typography
              noWrap
              sx={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '0.92rem',
                letterSpacing: '-0.02em',
                color: '#E8F1FF',
              }}
            >
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
              py: 0.45,
              borderRadius: '8px',
              bgcolor: 'rgba(34,211,238,0.1)',
              border: '1px solid rgba(34,211,238,0.25)',
              color: '#67E8F9',
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'currentColor',
                animation: 'pulse-signal 2.2s ease-in-out infinite',
              }}
            />
            Signal live
          </Box>
        </Box>

        <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 2.5 }, flex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  )
}
