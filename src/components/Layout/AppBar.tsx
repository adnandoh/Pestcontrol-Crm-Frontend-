import React from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Box,
  useTheme,
} from '@mui/material';

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
        <Box sx={{ flexGrow: 1 }} />

        {/* Right side content can be added here in the future */}
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;