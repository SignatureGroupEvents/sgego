import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00B2C0',
      contrastText: '#FFFAF6',
    },
    secondary: {
      main: '#31365E',
      contrastText: '#FFFAF6',
    },
    background: {
      default: '#FFFAF6',
      paper: '#FFFFFF',
    },
    warning: {
      main: '#CB1033',
    },
    success: {
      main: '#00B2C0',
    },
    info: {
      main: '#FAA951',
    },
    accent: {
      main: '#FAA951',
    },
    text: {
      primary: '#31365E',
      secondary: '#31365E',
    },
  },
  typography: {
    fontFamily: "'Work Sans', Arial, sans-serif",
  },
});

export default theme; 