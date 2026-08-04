import { createTheme, alpha } from '@mui/material/styles'

const ink = '#0B1220'
const accent = '#3B82F6'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: accent,
      light: '#60A5FA',
      dark: '#2563EB',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: ink,
      light: '#334155',
      dark: '#020617',
      contrastText: '#F8FAFC',
    },
    error: { main: '#EF4444' },
    warning: { main: '#F59E0B' },
    success: { main: '#22C55E' },
    info: { main: '#06B6D4' },
    background: {
      default: '#F1F5F9',
      paper: '#FFFFFF',
    },
    text: {
      primary: ink,
      secondary: '#64748B',
    },
    divider: alpha(ink, 0.08),
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Sora", "Manrope", sans-serif',
      fontWeight: 700,
      fontSize: '1.7rem',
      letterSpacing: '-0.035em',
      lineHeight: 1.15,
    },
    h2: {
      fontFamily: '"Sora", "Manrope", sans-serif',
      fontWeight: 600,
      fontSize: '1.05rem',
      letterSpacing: '-0.02em',
      lineHeight: 1.3,
    },
    h5: {
      fontFamily: '"Sora", "Manrope", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    overline: {
      fontWeight: 700,
      letterSpacing: '0.08em',
      fontSize: '0.68rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 650,
      letterSpacing: '-0.01em',
    },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F1F5F9',
          backgroundImage: `
            radial-gradient(900px 480px at -5% -10%, ${alpha(accent, 0.11)}, transparent 55%),
            radial-gradient(700px 400px at 110% 0%, ${alpha('#06B6D4', 0.08)}, transparent 50%),
            linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 40%, #EEF2F7 100%)
          `,
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingInline: 18,
          minHeight: 42,
        },
        containedPrimary: {
          background: `linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)`,
          boxShadow: `0 8px 20px ${alpha(accent, 0.28)}`,
          '&:hover': {
            background: `linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)`,
            boxShadow: `0 10px 24px ${alpha(accent, 0.34)}`,
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': { borderWidth: 1.5 },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha(ink, 0.06)}`,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: `0 12px 28px ${alpha(accent, 0.35)}`,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#fff',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          border: `1px solid ${alpha(ink, 0.06)}`,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 14 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
        },
      },
    },
  },
})

export default theme
