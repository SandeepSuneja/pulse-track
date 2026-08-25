import { createTheme, alpha } from '@mui/material/styles'

/** Deep-space command palette — cyan/ice tech, not purple neon */
const voidBg = '#060B14'
const surface = '#0D1624'
const surfaceRaised = '#121C2E'
const ink = '#E8F1FF'
const muted = '#8BA3C7'
const accent = '#22D3EE'
const accentDeep = '#0891B2'
const nebula = '#38BDF8'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: accent,
      light: '#67E8F9',
      dark: accentDeep,
      contrastText: '#041018',
    },
    secondary: {
      main: nebula,
      light: '#7DD3FC',
      dark: '#0284C7',
      contrastText: '#041018',
    },
    error: { main: '#FB7185' },
    warning: { main: '#FBBF24' },
    success: { main: '#34D399' },
    info: { main: nebula },
    background: {
      default: voidBg,
      paper: surface,
    },
    text: {
      primary: ink,
      secondary: muted,
    },
    divider: alpha('#E8F1FF', 0.08),
  },
  typography: {
    fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Syne", "Space Grotesk", sans-serif',
      fontWeight: 700,
      fontSize: '1.7rem',
      letterSpacing: '-0.03em',
      lineHeight: 1.15,
    },
    h2: {
      fontFamily: '"Syne", "Space Grotesk", sans-serif',
      fontWeight: 650,
      fontSize: '1.05rem',
      letterSpacing: '-0.02em',
      lineHeight: 1.3,
    },
    h5: {
      fontFamily: '"Syne", "Space Grotesk", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    overline: {
      fontWeight: 700,
      letterSpacing: '0.12em',
      fontSize: '0.68rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 650,
      letterSpacing: '0.01em',
      fontFamily: '"Space Grotesk", sans-serif',
    },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: voidBg,
          backgroundImage: `
            radial-gradient(1.5px 1.5px at 12% 18%, rgba(232,241,255,0.55), transparent),
            radial-gradient(1px 1px at 28% 62%, rgba(125,211,252,0.45), transparent),
            radial-gradient(1.5px 1.5px at 72% 24%, rgba(232,241,255,0.4), transparent),
            radial-gradient(1px 1px at 88% 78%, rgba(34,211,238,0.5), transparent),
            radial-gradient(1px 1px at 44% 36%, rgba(232,241,255,0.35), transparent),
            radial-gradient(1.5px 1.5px at 58% 88%, rgba(125,211,252,0.35), transparent),
            radial-gradient(900px 520px at 8% -10%, ${alpha(accent, 0.14)}, transparent 55%),
            radial-gradient(700px 420px at 100% 0%, ${alpha(nebula, 0.1)}, transparent 50%),
            radial-gradient(600px 400px at 50% 110%, ${alpha('#0EA5E9', 0.08)}, transparent 55%),
            linear-gradient(165deg, #060B14 0%, #0A1220 45%, #071018 100%)
          `,
          backgroundAttachment: 'fixed',
          color: ink,
          scrollbarWidth: 'thin',
          scrollbarColor: `${alpha(accent, 0.28)} rgba(5,10,18,0.85)`,
        },
        '*::-webkit-scrollbar': {
          width: 10,
          height: 10,
        },
        '*::-webkit-scrollbar-track': {
          background: 'rgba(5,10,18,0.85)',
          borderRadius: 999,
        },
        '*::-webkit-scrollbar-thumb': {
          background: `linear-gradient(180deg, ${alpha('#67E8F9', 0.35)}, ${alpha(accent, 0.28)})`,
          borderRadius: 999,
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
          boxShadow: `inset 0 0 0 1px ${alpha(accent, 0.15)}`,
        },
        '*::-webkit-scrollbar-thumb:hover': {
          background: `linear-gradient(180deg, ${alpha('#67E8F9', 0.55)}, ${alpha(accent, 0.48)})`,
          backgroundClip: 'padding-box',
        },
        '*::-webkit-scrollbar-corner': {
          background: 'transparent',
        },
        '*::-webkit-scrollbar-button': {
          display: 'none',
          width: 0,
          height: 0,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 18,
          minHeight: 42,
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${accent} 0%, ${accentDeep} 100%)`,
          color: '#041018',
          boxShadow: `0 0 0 1px ${alpha(accent, 0.35)}, 0 8px 24px ${alpha(accentDeep, 0.28)}`,
          '&:hover': {
            background: `linear-gradient(135deg, #67E8F9 0%, ${accent} 100%)`,
            boxShadow: `0 0 0 1px ${alpha(accent, 0.5)}, 0 10px 28px ${alpha(accentDeep, 0.35)}`,
          },
        },
        outlined: {
          borderWidth: 1,
          borderColor: alpha(accent, 0.35),
          color: accent,
          '&:hover': {
            borderWidth: 1,
            borderColor: accent,
            bgcolor: alpha(accent, 0.08),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${alpha('#E8F1FF', 0.08)}`,
          backgroundImage: 'none',
          bgcolor: surface,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: `0 0 0 1px ${alpha(accent, 0.4)}, 0 10px 28px ${alpha(accentDeep, 0.35)}`,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: alpha('#050A12', 0.55),
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(accent, 0.4),
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: accent,
          },
        },
        input: {
          '&[type="date"], &[type="datetime-local"], &[type="time"], &[type="month"], &[type="week"]':
            {
              colorScheme: 'dark',
            },
        },
        notchedOutline: {
          borderColor: alpha('#E8F1FF', 0.12),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${alpha(accent, 0.18)}`,
          backgroundImage: `
            radial-gradient(480px 200px at 0% 0%, ${alpha(accent, 0.1)}, transparent 60%),
            linear-gradient(180deg, ${surfaceRaised} 0%, ${surface} 100%)
          `,
          bgcolor: surface,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
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
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})

export default theme
