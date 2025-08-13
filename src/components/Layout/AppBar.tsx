import React from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Box,
  useTheme,
} from '@mui/material';
import pestlogo from '../../images/pestlogo.svg';

const AppBar: React.FC = () => {
  const theme = useTheme();

  return (
    <MuiAppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: '#ffffff',
        borderBottom: '1px solid #e0e0e0',
        color: theme.palette.text.primary,
        width: '100vw',
        left: 0,
        right: 0,
        top: 0,
      }}
    >
      <Toolbar sx={{ minHeight: '70px !important', px: { xs: 2, sm: 3 } }}>
        {/* Logo Only */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            py: 1,
            '&:hover': {
              opacity: 0.8,
            },
            transition: 'opacity 0.2s ease-in-out',
          }}
          onClick={() => window.location.href = '/'}
        >
          <img
            src={pestlogo}
            alt="Logo"
            style={{
              height: '52px',
              width: 'auto',
            }}
          />
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right side content can be added here in the future */}
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;