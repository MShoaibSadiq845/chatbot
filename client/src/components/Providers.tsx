'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/lib/store';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6C63FF',
      light: '#9D96FF',
      dark: '#4B44CC',
    },
    secondary: {
      main: '#00BFA5',
    },
    background: {
      default: '#0F0F1A',
      paper: '#1A1A2E',
    },
    error: {
      main: '#FF5252',
    },
    success: {
      main: '#00E676',
    },
    warning: {
      main: '#FFD740',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(108, 99, 255, 0.15)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1A1A2E',
              color: '#E0E0E0',
              border: '1px solid rgba(108,99,255,0.25)',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontFamily: '"Inter", "Roboto", sans-serif',
            },
            success: {
              iconTheme: { primary: '#00E676', secondary: '#1A1A2E' },
              style: {
                border: '1px solid rgba(0,230,118,0.3)',
              },
            },
            error: {
              iconTheme: { primary: '#FF5252', secondary: '#1A1A2E' },
              style: {
                border: '1px solid rgba(255,82,82,0.3)',
              },
            },
            loading: {
              iconTheme: { primary: '#6C63FF', secondary: '#1A1A2E' },
            },
          }}
        />
      </ThemeProvider>
    </Provider>
  );
}
