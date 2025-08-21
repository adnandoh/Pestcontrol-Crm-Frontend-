import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  useTheme,
  Alert,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Assignment as JobCardIcon,
  Refresh as RenewalIcon,
  ContactMail as InquiryIcon,
  CheckCircle as CompletedIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { jobCardService, renewalService, inquiryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobCards: 0,
    pendingRenewals: 0,
    newInquiries: 0,
    totalClients: 0,
    completedJobs: 0,
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState<any[]>([]);
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated) return;

      try {
        setIsLoading(true);
        setError(null);
        
        const [jobCardsResponse, renewalsResponse, inquiriesResponse] = await Promise.all([
          jobCardService.getJobCards(),
          renewalService.getRenewals({ upcoming: true }),
          inquiryService.getInquiries({ status: 'New' }),
        ]);

        setStats({
          totalJobCards: jobCardsResponse.count,
          pendingRenewals: renewalsResponse.count,
          newInquiries: inquiriesResponse.count,
          totalClients: 0,
          completedJobs: jobCardsResponse.results.filter(job => job.status === 'Done').length,
        });

        setRecentJobs(jobCardsResponse.results.slice(0, 5));
        setUpcomingRenewals(renewalsResponse.results.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && !authLoading) {
      fetchDashboardData();
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: theme.shape.borderRadius }}>
          {error}
        </Alert>
      </Box>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    subtitle,
    onClick
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ReactNode; 
    color: string;
    subtitle?: string;
    onClick?: () => void;
  }) => (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        height: '100%',
        width: '100%',
        borderRadius: 3,
        border: `1px solid ${theme.palette.grey[200]}`,
        transition: 'all 0.3s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        p: { xs: 1.5, sm: 2 },
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.1)',
          '& .stat-card-icon': {
            transform: 'scale(1.05) rotate(3deg)',
          }
        }
      }}
    >
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          width: '100%', 
          height: '100%', 
          background: `linear-gradient(135deg, transparent 20%, ${color}30 100%)`,
          zIndex: 0
        }} 
      />
      <CardContent sx={{ p: { xs: 2.5, sm: 3.5 }, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 1, 
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                color: theme.palette.text.secondary,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h3" 
              component="div" 
              sx={{ 
                fontWeight: 700, 
                color: theme.palette.text.primary, 
                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' }, 
                mb: 1,
                display: 'flex',
                alignItems: 'baseline'
              }}
            >
              {value}
              <Box 
                component="span" 
                sx={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  ml: 1,
                  color,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  fontWeight: 500
                }}
              >
                {value > 0 && (
                  <Box 
                    component="span" 
                    sx={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: theme.palette.success.main,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      ml: 1
                    }}
                  >
                    {/* Optional trend indicator could go here */}
                  </Box>
                )}
              </Box>
            </Typography>
            {subtitle && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  color: theme.palette.text.secondary,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box 
            className="stat-card-icon"
            sx={{ 
              width: { xs: 50, sm: 60 }, 
              height: { xs: 50, sm: 60 }, 
              borderRadius: '14px',
              background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: `0 8px 16px ${color}40`,
              transition: 'all 0.3s ease',
              '& .MuiSvgIcon-root': {
                fontSize: { xs: '1.5rem', sm: '1.75rem' }
              }
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ 
    title, 
    description, 
    icon, 
    color, 
    onClick 
  }: { 
    title: string; 
    description: string; 
    icon: React.ReactNode; 
    color: string;
    onClick: () => void;
  }) => (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        width: '100%',
        borderRadius: 4,
        border: `1px solid ${theme.palette.grey[200]}`,
        transition: 'all 0.3s ease-in-out',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
          '& .quick-action-icon': {
            transform: 'scale(1.1) rotate(5deg)',
          }
        }
      }}
    >
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          background: `linear-gradient(135deg, ${color}15 0%, transparent 70%)`,
          zIndex: 0
        }} 
      />
      <CardContent sx={{ p: { xs: 2.5, sm: 3.5 }, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
          <Box 
            className="quick-action-icon"
            sx={{ 
              width: { xs: 45, sm: 52 }, 
              height: { xs: 45, sm: 52 }, 
              borderRadius: '14px',
              background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: `0 8px 16px ${color}40`,
              transition: 'all 0.3s ease',
              '& .MuiSvgIcon-root': {
                fontSize: { xs: '1.3rem', sm: '1.5rem' }
              }
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.85, fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
              {description}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <CircularProgress size={40} sx={{ color: theme.palette.primary.main, mb: 2 }} />
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: theme.palette.background.default, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Dashboard Header with Summary */}
      <Card 
        elevation={0} 
        sx={{ 
          mb: 3, 
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
        }}
      >
        <Box sx={{ position: 'absolute', top: 0, right: 0, opacity: 0.1, transform: 'translate(10%, -10%)' }}>
          <JobCardIcon sx={{ fontSize: 150 }} />
        </Box>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography 
            variant="h5" 
            component="h1" 
            sx={{ 
              fontWeight: 700, 
              mb: 1,
              fontSize: { xs: '1.5rem', md: '1.75rem' },
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Welcome back!
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.95rem',
              opacity: 0.9,
              maxWidth: '800px',
              mb: 2
            }}
          >
            Here's what's happening with your pest control business today
          </Typography>
          
          {/* Summary Stats */}
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: { xs: 1.5, md: 2.5 },
            mt: 2,
            justifyContent: { xs: 'space-between', md: 'flex-start' }
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: 'rgba(255,255,255,0.2)',
              p: 1.5,
              px: 2,
              borderRadius: 2,
              boxShadow: '0 3px 8px rgba(0,0,0,0.06)',
              minWidth: { xs: '45%', sm: 'auto' }
            }}>
              <JobCardIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
              <Typography variant="body2" sx={{ mr: 1 }}>Total Jobs:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>{stats.totalJobCards}</Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: 'rgba(255,255,255,0.2)',
              p: 1.5,
              px: 2,
              borderRadius: 2,
              boxShadow: '0 3px 8px rgba(0,0,0,0.06)',
              minWidth: { xs: '45%', sm: 'auto' }
            }}>
              <CompletedIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
              <Typography variant="body2" sx={{ mr: 1 }}>Completed:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>{stats.completedJobs}</Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: 'rgba(255,255,255,0.2)',
              p: 1.5,
              px: 2,
              borderRadius: 2,
              boxShadow: '0 3px 8px rgba(0,0,0,0.06)',
              minWidth: { xs: '45%', sm: 'auto' }
            }}>
              <RenewalIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
              <Typography variant="body2" sx={{ mr: 1 }}>Renewals Due:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>{stats.pendingRenewals}</Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* Main Dashboard Content */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 1fr', lg: '3fr 1fr' }, gap: { xs: 2, md: 3 }, mt: 3 }}>
        {/* Left Column - Main Content */}
        <Box>
          {/* Statistics Cards */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' }, 
            gap: { xs: 3, md: 4 }, 
            mb: 5 
          }}>
            <StatCard
              title="Total Jobs"
              value={stats.totalJobCards}
              icon={<JobCardIcon />}
              color={theme.palette.primary.main}
              subtitle="Active jobs"
              onClick={() => navigate('/jobcards')}
            />
            <StatCard
              title="Completed"
              value={stats.completedJobs}
              icon={<CompletedIcon />}
              color={theme.palette.success.main}
              subtitle="Successfully delivered"
              onClick={() => navigate('/jobcards?status=Done')}
            />
            <StatCard
              title="Renewals Due"
              value={stats.pendingRenewals}
              icon={<RenewalIcon />}
              color={theme.palette.warning.main}
              subtitle="Upcoming renewals"
              onClick={() => navigate('/renewals')}
            />
            <StatCard
              title="New Inquiries"
              value={stats.newInquiries}
              icon={<InquiryIcon />}
              color={theme.palette.info.main}
              subtitle="Potential clients"
              onClick={() => navigate('/inquiries')}
            />
          </Box>

          {/* No Recent Activity Section - Removed as requested */}
        </Box>

        {/* Right Column - Quick Actions */}
        <Box sx={{ width: '100%' }}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 4, 
              border: `1px solid ${theme.palette.grey[200]}`,
              boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
              mb: 3,
              overflow: 'hidden',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ 
              p: { xs: 2, sm: 3 }, 
              pb: { xs: 1.5, sm: 2 }, 
              borderBottom: `1px solid ${theme.palette.grey[100]}`,
              display: 'flex',
              alignItems: 'center',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}10 0%, transparent 70%)`,
              pt: 2.5,
              px: 3.5
            }}>
              <AddIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Quick Actions
              </Typography>
            </Box>
            <Box sx={{ p: { xs: 1.5, sm: 2.5 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => navigate('/jobcards/create')}
                sx={{ 
                  mb: 2, 
                  py: { xs: 1.2, sm: 1.5 }, 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
                  }
                }}
              >
                Create New Job Card
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                color="success"
                startIcon={<JobCardIcon />}
                onClick={() => navigate('/jobcards')}
                sx={{ 
                  mb: 2, 
                  py: { xs: 1, sm: 1.2 }, 
                  borderRadius: 2,
                  textTransform: 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
                  }
                }}
              >
                View All Jobs
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                color="warning"
                startIcon={<ScheduleIcon />}
                onClick={() => navigate('/renewals')}
                sx={{ 
                  mb: 2, 
                  py: { xs: 1, sm: 1.2 }, 
                  borderRadius: 2,
                  textTransform: 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
                  }
                }}
              >
                Check Renewals
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                color="info"
                startIcon={<InquiryIcon />}
                onClick={() => navigate('/inquiries')}
                sx={{ 
                  py: { xs: 1, sm: 1.2 }, 
                  borderRadius: 2,
                  textTransform: 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
                  }
                }}
              >
                New Inquiries
              </Button>
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;