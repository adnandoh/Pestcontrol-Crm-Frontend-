import React, { useState } from 'react';
import {
  AppBar as MuiAppBar,
  Toolbar,
  Box,
  IconButton,
  useTheme,
  alpha,
  Menu,
  MenuItem,
  Typography,
  Divider,
  Badge,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationBadge from '../NotificationBadge';

interface AppBarProps {
  onMenuClick?: () => void;
}

const AppBar: React.FC<AppBarProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const { inquiryCounts, lastUpdated, refreshCounts, loading } = useNotifications();
  
  console.log('🔍 AppBar: inquiryCounts:', inquiryCounts);
  console.log('🔍 AppBar: unread_new count:', inquiryCounts.unread_new);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

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

        {/* Right side - Notifications */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Manual refresh button */}
          <IconButton
            onClick={refreshCounts}
            disabled={loading}
            size="large"
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: theme.palette.primary.main,
              },
              '&:disabled': {
                color: theme.palette.text.disabled,
              },
            }}
          >
            <RefreshIcon />
          </IconButton>

          {/* Notification Bell */}
          <Box sx={{ position: 'relative' }}>
            <IconButton
              size="large"
              onClick={handleNotificationClick}
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                },
              }}
            >
              <NotificationsIcon />
              <NotificationBadge 
                count={inquiryCounts.unread_new} 
                size="medium" 
                color="red" 
              />
            </IconButton>
          </Box>

          {/* Notification Menu */}
          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={handleNotificationClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 280,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: 2,
              }
            }}
          >
            <MenuItem sx={{ 
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
              borderBottom: `1px solid ${theme.palette.grey[200]}`,
              py: 1.5,
            }}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                  Inquiry Notifications
                </Typography>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  Last updated: {formatLastUpdated(lastUpdated)}
                </Typography>
              </Box>
            </MenuItem>
            
            <MenuItem sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ color: '#e74c3c' }}>🆕</Typography>
                <Typography variant="body2">New Inquiries: {inquiryCounts.new}</Typography>
              </Box>
            </MenuItem>
            
            <MenuItem sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ color: '#f39c12' }}>📞</Typography>
                <Typography variant="body2">Contacted: {inquiryCounts.contacted}</Typography>
              </Box>
            </MenuItem>
            
            <MenuItem sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ color: '#e74c3c', fontWeight: 600 }}>⚠️</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Total Unhandled: {inquiryCounts.total_new}
                </Typography>
              </Box>
            </MenuItem>
            
            <Divider />
            
            <MenuItem sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ color: '#ff6b6b' }}>🔴</Typography>
                <Typography variant="body2">Unread New: {inquiryCounts.unread_new}</Typography>
              </Box>
            </MenuItem>
            
            <MenuItem sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ color: '#ffa726' }}>🟠</Typography>
                <Typography variant="body2">Unread Contacted: {inquiryCounts.unread_contacted}</Typography>
              </Box>
            </MenuItem>
            
            <MenuItem sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ color: '#e74c3c', fontWeight: 600 }}>🔴</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  New Unread: {inquiryCounts.unread_new}
                </Typography>
              </Box>
            </MenuItem>
            
            <Divider />
            
            <MenuItem sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ color: '#27ae60' }}>✅</Typography>
                <Typography variant="body2">Converted: {inquiryCounts.converted}</Typography>
              </Box>
            </MenuItem>
            
            <MenuItem sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ color: '#95a5a6' }}>❌</Typography>
                <Typography variant="body2">Closed: {inquiryCounts.closed}</Typography>
              </Box>
            </MenuItem>
            
            <Divider />
            
            <MenuItem sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2" sx={{ color: '#3498db' }}>📊</Typography>
                <Typography variant="body2">Total: {inquiryCounts.total}</Typography>
              </Box>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;