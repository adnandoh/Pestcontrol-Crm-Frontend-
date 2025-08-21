import React from 'react';
import { styled, Theme, CSSObject } from '@mui/material/styles';
import {
  Drawer as MuiDrawer,
  List,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Tooltip,
  Typography,
  useTheme,
  alpha,
  Backdrop,
  useMediaQuery,
  Avatar,
} from '@mui/material';
import {
  SpaceDashboard as DashboardIcon,
  AssignmentTurnedIn as JobCardIcon,
  Autorenew as RenewalIcon,
  QuestionAnswer as InquiryIcon,
  PostAdd as CreateJobIcon,
  KeyboardDoubleArrowLeft as CollapseIcon,
  KeyboardDoubleArrowRight as ExpandIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationBadge from '../NotificationBadge';

const drawerWidth = 240;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.easeInOut,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  overflowY: 'hidden',
  background: '#ffffff',
  borderRight: `1px solid #e0e0e0`,
  height: 'calc(100vh - 70px)',
  top: '70px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '1px 0 4px rgba(0,0,0,0.04)',
  position: 'fixed',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.easeInOut,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  overflowY: 'hidden',
  width: `calc(${theme.spacing(9)} + 1px)`,
  background: '#ffffff',
  borderRight: `1px solid #e0e0e0`,
  height: 'calc(100vh - 70px)',
  top: '70px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '1px 0 2px rgba(0,0,0,0.03)',
  position: 'fixed',
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(9)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 2),
  minHeight: '60px',
  borderBottom: `1px solid #e0e0e0`,
  background: '#ffffff',
}));

const StyledListItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
  margin: theme.spacing(0.5, 1),
  borderRadius: theme.shape.borderRadius,
  minHeight: 48,
  transition: theme.transitions.create(['background-color', 'color', 'transform'], {
    duration: theme.transitions.duration.shorter,
  }),
  position: 'relative',

  backgroundColor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',

  '&:hover': {
    backgroundColor: active ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.action.hover, 0.04),
    transform: 'translateX(4px)',
  },

  ...(active && {
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 4,
      height: '60%',
      background: theme.palette.primary.main,
      borderRadius: '0 2px 2px 0',
    },
  }),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    '& .MuiDrawer-paper': {
      position: 'relative',
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      ...(open && openedMixin(theme)),
      ...(!open && closedMixin(theme)),
    },
    [theme.breakpoints.down('md')]: {
      '& .MuiDrawer-paper': {
        position: 'fixed',
        zIndex: theme.zIndex.drawer + 2,
        height: 'calc(100vh - 70px)',
        top: '70px',
        ...(open && {
          ...openedMixin(theme),
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
        }),
        ...(!open && {
          transform: 'translateX(-100%)',
          width: drawerWidth,
        }),
      },
    },
  }),
);

interface SidebarProps {
  open: boolean;
  handleDrawerClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, handleDrawerClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { logout, user } = useAuth();
  const { inquiryCounts } = useNotifications();
  
  console.log('🔍 Sidebar: inquiryCounts:', inquiryCounts);
  console.log('🔍 Sidebar: unread_new count:', inquiryCounts.unread_new);

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
      description: 'Overview and analytics'
    },
    {
      text: 'Job Cards',
      icon: <JobCardIcon />,
      path: '/jobcards',
      description: 'Manage service jobs'
    },
    {
      text: 'Renewals',
      icon: <RenewalIcon />,
      path: '/renewals',
      description: 'Contract renewals'
    },
    {
      text: 'Inquiries',
      icon: (
        <Box sx={{ position: 'relative' }}>
          <InquiryIcon />
          <NotificationBadge 
            count={inquiryCounts.unread_new} 
            size="small" 
            color="red" 
          />
        </Box>
      ),
      path: '/inquiries',
      description: 'Customer inquiries'
    },
    {
      text: 'Create Job Card',
      icon: <CreateJobIcon />,
      path: '/jobcards/create',
      description: 'Add new service job'
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && (
        <Backdrop
          open={open}
          onClick={handleDrawerClose}
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            backgroundColor: alpha(theme.palette.common.black, 0.5),
          }}
        />
      )}

      <Drawer variant={isMobile ? "temporary" : "permanent"} open={open} onClose={handleDrawerClose}>
        {/* Header with Toggle */}
        <DrawerHeader
          sx={{
            cursor: 'pointer',
            transition: 'background-color 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
            },
          }}
          onClick={handleDrawerClose}
        >
          <Box sx={{
            display: 'flex',
            alignItems: 'left',
            justifyContent: 'right',
            width: '100%'
          }}>
            <Tooltip title={open ? "Collapse sidebar" : "Expand sidebar"} placement="right">
              <IconButton
                sx={{
                  color: theme.palette.text.secondary,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: open ? 'rotate(0deg)' : 'rotate(180deg)',
                  '&:hover': {
                    color: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    transform: open ? 'rotate(0deg) scale(1.1)' : 'rotate(180deg) scale(1.1)',
                  },
                }}
              >
                {open ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </DrawerHeader>

        {/* Navigation Menu */}
        <Box sx={{
          flex: 1,
          py: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: alpha(theme.palette.primary.main, 0.3),
            borderRadius: '2px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: alpha(theme.palette.primary.main, 0.5),
          },
        }}>
          <List sx={{ px: 0 }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                  <Tooltip
                    title={!open ? `${item.text} - ${item.description}` : ''}
                    placement="right"
                    arrow
                  >
                    <StyledListItemButton
                      active={isActive}
                      onClick={() => {
                        navigate(item.path);
                        if (isMobile) {
                          handleDrawerClose();
                        }
                      }}
                      sx={{
                        justifyContent: open ? 'initial' : 'center',
                        px: open ? 2.5 : 1.5,
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 0,
                          mr: open ? 2 : 'auto',
                          justifyContent: 'center',
                          color: isActive
                            ? theme.palette.primary.main
                            : '#666',
                          transition: 'all 0.2s ease-in-out',
                          '& svg': {
                            fontSize: '1.2rem',
                          },
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        secondary={open ? item.description : ''}
                        sx={{
                          opacity: open ? 1 : 0,
                          transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: open ? 'translateX(0)' : 'translateX(-10px)',
                          '& .MuiListItemText-primary': {
                            fontWeight: isActive ? 600 : 500,
                            color: isActive
                              ? theme.palette.primary.main
                              : '#333',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease-in-out',
                          },
                          '& .MuiListItemText-secondary': {
                            fontSize: '0.75rem',
                            color: '#666',
                            opacity: 0.8,
                            transition: 'all 0.2s ease-in-out',
                          },
                        }}
                      />
                    </StyledListItemButton>
                  </Tooltip>
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Profile Section */}
        {user && (
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid #e0e0e0',
              background: '#f8f9fa',
            }}
          >
            {open ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  {user.username?.charAt(0).toUpperCase() || <PersonIcon />}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 600,
                      color: '#333',
                      lineHeight: 1.2,
                      fontSize: '0.9rem',
                    }}
                  >
                    {user.username}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#666',
                      lineHeight: 1,
                      fontSize: '0.75rem',
                    }}
                  >
                    Administrator
                  </Typography>
                </Box>
                <Tooltip title="Sign out" placement="top">
                  <IconButton
                    onClick={logout}
                    size="small"
                    sx={{
                      color: '#666',
                      '&:hover': {
                        color: theme.palette.error.main,
                        backgroundColor: alpha(theme.palette.error.main, 0.08),
                      },
                    }}
                  >
                    <LogoutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  {user.username?.charAt(0).toUpperCase() || <PersonIcon />}
                </Avatar>
                <Tooltip title="Sign out" placement="right">
                  <IconButton
                    onClick={logout}
                    size="small"
                    sx={{
                      color: '#666',
                      '&:hover': {
                        color: theme.palette.error.main,
                        backgroundColor: alpha(theme.palette.error.main, 0.08),
                      },
                    }}
                  >
                    <LogoutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        )}

      </Drawer>
    </>
  );
};

export default Sidebar;