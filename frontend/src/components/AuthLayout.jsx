import { Box, Stack, Typography } from '@mui/material'
import { motion } from 'framer-motion'

const pageBg = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  p: { xs: 2, md: 3 },
  background: `
    radial-gradient(1.5px 1.5px at 18% 22%, rgba(232,241,255,0.55), transparent),
    radial-gradient(1px 1px at 72% 38%, rgba(34,211,238,0.5), transparent),
    radial-gradient(1px 1px at 42% 78%, rgba(125,211,252,0.4), transparent),
    radial-gradient(900px 480px at 10% 0%, rgba(34,211,238,0.18), transparent 55%),
    radial-gradient(700px 400px at 90% 100%, rgba(14,165,233,0.14), transparent 50%),
    #060B14
  `,
}

const markSx = {
  width: 44,
  height: 44,
  borderRadius: '10px',
  display: 'grid',
  placeItems: 'center',
  fontFamily: 'Syne, sans-serif',
  fontWeight: 800,
  fontSize: 12,
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
}

export const googleBtnSx = {
  color: '#E8F1FF',
  borderColor: 'rgba(34,211,238,0.35)',
  bgcolor: 'rgba(5,10,18,0.55)',
  '&:hover': {
    borderColor: '#22D3EE',
    bgcolor: 'rgba(34,211,238,0.08)',
    color: '#E8F1FF',
  },
}

export default function AuthLayout({ kicker, title, subtitle, children, footer }) {
  return (
    <Box sx={pageBg}>
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        sx={{ width: 'min(440px, 100%)' }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5, px: 0.5 }}>
          <Box sx={markSx}>PT</Box>
          <Box>
            <Typography
              sx={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '1.05rem',
                letterSpacing: '-0.02em',
                color: '#F0F7FF',
                lineHeight: 1.15,
              }}
            >
              Pulse Track
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(103,232,249,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
            >
              {kicker}
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            borderRadius: '16px',
            p: { xs: 3, sm: 3.5 },
            bgcolor: '#0D1624',
            border: '1px solid rgba(34,211,238,0.16)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            backgroundImage:
              'radial-gradient(420px 180px at 0% 0%, rgba(34,211,238,0.1), transparent 60%)',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '1.45rem',
              letterSpacing: '-0.03em',
              color: '#E8F1FF',
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography sx={{ color: '#8BA3C7', mb: 2.75 }} variant="body2">
            {subtitle}
          </Typography>
          {children}
        </Box>

        {footer ? (
          <Typography
            variant="body2"
            sx={{ mt: 2, textAlign: 'center', color: '#8BA3C7' }}
          >
            {footer}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}
