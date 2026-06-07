import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#050A12',
      paper: '#0B1728',
    },
    primary: { main: '#1877F2', light: '#38D6FF', dark: '#0B4EA2', contrastText: '#FFFFFF' },
    secondary: { main: '#2EE6A6', light: '#78E08F', dark: '#168A66', contrastText: '#03100B' },
    text: { primary: '#F8FBFF', secondary: '#B9C7D8', disabled: '#6C7A8F' },
    divider: '#20354F',
    success: { main: '#2EE6A6' },
    warning: { main: '#F5C451' },
    error: { main: '#FF5D5D' },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 600, letterSpacing: '-1.2px', lineHeight: 1.04 },
    h2: { fontWeight: 600, letterSpacing: '-0.5px' },
    h3: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollBehavior: 'smooth' },
        body: {
          background:
            'radial-gradient(circle at 10% 0%, rgba(24,119,242,.15), transparent 30rem), radial-gradient(circle at 86% 14%, rgba(46,230,166,.08), transparent 32rem), #050A12',
        },
        '::selection': { background: 'rgba(56,214,255,.3)' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 10,
          boxShadow: 'none',
          '&:focus-visible': { outline: '3px solid rgba(56,214,255,.28)', outlineOffset: 2 },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1877F2 0%, #38D6FF 100%)',
          color: '#FFFFFF',
          '&:hover': { boxShadow: '0 0 0 1px rgba(56,214,255,.34), 0 18px 44px rgba(24,119,242,.25)' },
        },
        outlined: {
          borderColor: 'rgba(56,214,255,.55)',
          color: '#F8FBFF',
          backgroundColor: 'rgba(11,23,40,.55)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(180deg, rgba(16,36,59,.86), rgba(11,23,40,.94))',
          border: '1px solid #20354F',
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(180deg, rgba(16,36,59,.86), rgba(11,23,40,.94))',
          border: '1px solid #20354F',
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#050A12',
          backgroundImage: 'none',
          borderRight: '1px solid #20354F',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(32,53,79,.8)',
          backgroundColor: 'rgba(5,10,18,.78)',
          backdropFilter: 'blur(18px)',
          boxShadow: 'none',
        },
      },
    },
  },
});
