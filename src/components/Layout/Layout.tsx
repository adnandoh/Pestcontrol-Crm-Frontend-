import React, { useState, useEffect } from 'react';
import { Box, CssBaseline, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Outlet } from 'react-router-dom';
import AppBar from './AppBar';
import Sidebar from './Sidebar';

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  minHeight: '70px',
}));

const MainContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open?: boolean }>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.easeInOut,
    duration: theme.transitions.duration.enteringScreen,
  }),
  marginLeft: open ? 0 : `-${240 - 73}px`,
  marginTop: '70px',
  minHeight: 'calc(100vh - 70px)',
  overflowX: 'hidden',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);

  // Handle responsive behavior
  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  const handleDrawerClose = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      <AppBar />
      <Sidebar open={open} handleDrawerClose={handleDrawerClose} />
      <MainContent 
        open={open}
        sx={{
          background: theme.palette.background.default,
        }}
      >
        <DrawerHeader />
        <Box
          sx={{
            maxWidth: '1400px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          <Outlet />
        </Box>
      </MainContent>
    </Box>
  );
};

export default Layout;