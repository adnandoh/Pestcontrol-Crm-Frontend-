import React from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Box,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

interface AppBarProps {
  onMenuClick?: () => void;
}

const AppBar: React.FC<AppBarProps> = ({ onMenuClick }) => {
  const theme = useTheme();

  return (
    <MuiAppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.grey[200]}`,
        color: theme.palette.text.primary,
        width: '100vw',
        left: 0,
        right: 0,
        top: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <Toolbar sx={{ minHeight: '70px !important', px: { xs: 2, sm: 3 } }}>
        {/* Logo and Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            component="img"
            src="/images/pestlogo.png"
            alt="PestControl99 Logo"
            sx={{
              height: 65,
              width: 'auto',
              objectFit: 'contain',
              marginRight: 2
            }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Right side - Notifications only */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            size="large"
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: theme.palette.primary.main,
              },
            }}
          >
            <NotificationsIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;