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
  Container,
  Grid,
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

// Define spacing scale for consistent spacing
const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32
};

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

        // Get recent jobs (not completed) and upcoming jobs
        const upcomingJobs = jobCardsResponse.results
          .filter(job => job.status !== 'Done' && job.status !== 'Cancel')
          .sort((a, b) => new Date(a.schedule_date).getTime() - new Date(b.schedule_date).getTime())
          .slice(0, 5);
        
        setRecentJobs(upcomingJobs);
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
    onClick,
    highlight
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ReactNode; 
    color: string;
    subtitle?: string;
    onClick?: () => void;
    highlight?: boolean;
  }) => (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        height: '100%',
        width: '100%',
        borderRadius: '16px',
        border: highlight ? `1px solid ${theme.palette.error.light}` : `1px solid ${theme.palette.grey[200]}`,
        transition: 'all 0.3s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: highlight ? '0 4px 12px rgba(244,67,54,0.1)' : '0 4px 12px rgba(0,0,0,0.06)',
        backgroundColor: 'white',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: highlight ? '0 8px 18px rgba(244,67,54,0.15)' : '0 8px 18px rgba(0,0,0,0.1)',
          '& .stat-card-icon': {
            transform: 'scale(1.05) rotate(3deg)',
          }
        }
      }}
    >
      <CardContent sx={{ p: spacing.md / 8, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                mb: spacing.xs / 8, 
                fontSize: '10px',
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
                fontWeight: 600, 
                color: highlight ? theme.palette.error.main : theme.palette.text.primary, 
                fontSize: '24px', 
                mb: spacing.xs / 8,
                lineHeight: 1.2
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '10px',
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
              width: 60, 
              height: 60, 
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: `0 8px 16px ${color}40`,
              transition: 'all 0.3s ease',
              '& .MuiSvgIcon-root': {
                fontSize: '1.4rem'
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
                fontSize: { xs: '1.1rem', sm: '1.2rem' }
              }
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.85, fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
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
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
      {/* Page Title */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h1" component="h1" sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 0,
          fontSize: { xs: '1.4rem', sm: '1.6rem' },
          fontWeight: 700,
          color: theme.palette.text.primary
        }}>
          Dashboard 🏠
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/jobcards/create')}
          sx={{ 
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.5,
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 16px rgba(59, 130, 246, 0.3)',
              transform: 'translateY(-1px)'
            }
          }}
        >
          + Create Job
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="Total Jobs"
                value={stats.totalJobCards}
                icon={<JobCardIcon />}
                color={theme.palette.primary.main}
                subtitle="Active jobs"
                onClick={() => navigate('/jobcards')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="Completed"
                value={stats.completedJobs}
                icon={<CompletedIcon />}
                color={theme.palette.success.main}
                subtitle="Successfully delivered"
                onClick={() => navigate('/jobcards?status=Done')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="Renewals Due"
                value={stats.pendingRenewals}
                icon={<RenewalIcon />}
                color={theme.palette.warning.main}
                subtitle="Upcoming renewals"
                onClick={() => navigate('/renewals')}
                highlight={stats.pendingRenewals > 0}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard
                title="New Inquiries"
                value={stats.newInquiries}
                icon={<InquiryIcon />}
                color={theme.palette.info.main}
                subtitle="Potential clients"
                onClick={() => navigate('/inquiries')}
              />
            </Grid>
          </Grid>

      {/* Main Dashboard Content */}
      <Grid container spacing={3}>
        {/* Left Column - Upcoming Jobs Table (on desktop) */}
        <Grid size={{ xs: 12, md: 8 }} sx={{ order: { xs: 2, md: 1 } }}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: '16px', 
              border: `1px solid ${theme.palette.grey[200]}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              height: '100%',
              backgroundColor: 'white'
            }}
          >
            <Box sx={{ 
              p: 3, 
              borderBottom: `1px solid ${theme.palette.grey[100]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '14px' }}>
                Upcoming Jobs
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={() => navigate('/jobcards')}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 500,
                  color: theme.palette.primary.main
                }}
              >
                View All
              </Button>
            </Box>
            <Box sx={{ p: 0 }}>
              {recentJobs.length > 0 ? (
                <Box sx={{ 
                  overflowX: 'auto',
                  '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& th': {
                      textAlign: 'left',
                      padding: '16px 12px',
                      borderBottom: `1px solid ${theme.palette.grey[200]}`,
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      fontSize: '12px',
                      backgroundColor: theme.palette.grey[50]
                    },
                    '& td': {
                      padding: '12px',
                      borderBottom: `1px solid ${theme.palette.grey[100]}`,
                      fontSize: '12px',
                      position: 'relative',
                      '&::before': {
                        // For mobile responsive table
                        display: 'none',
                        content: 'attr(data-label)',
                        fontWeight: 600,
                        color: theme.palette.text.secondary,
                        fontSize: '10px'
                      }
                    },
                    // Mobile responsive table
                    '@media (max-width: 768px)': {
                      '& thead': {
                        display: 'none'
                      },
                      '& tbody tr': {
                        display: 'block',
                        marginBottom: spacing.sm / 8,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        borderRadius: '8px',
                        border: `1px solid ${theme.palette.grey[200]}`
                      },
                      '& td': {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textAlign: 'right',
                        borderBottom: 'none',
                        padding: `${spacing.xs / 8}px ${spacing.sm / 8}px`,
                        '&::before': {
                          display: 'block'
                        }
                      }
                    }
                  }
                }}>
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th>Job ID</th>
                        <th>Client</th>
                        <th>Service</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentJobs.map((job) => (
                        <tr 
                          key={job.id} 
                          onClick={() => navigate(`/jobcards/${job.id}`)} 
                          style={{ 
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.palette.grey[50]}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td data-label="Job ID">{job.id}</td>
                          <td data-label="Client">{job.client_name}</td>
                          <td data-label="Service">{job.service_type}</td>
                          <td data-label="Date">{new Date(job.schedule_date).toLocaleDateString()}</td>
                          <td data-label="Status">
                            <Chip 
                              label={job.status} 
                              size="small"
                              sx={{
                                backgroundColor: 
                                  job.status === 'Done' ? theme.palette.success.light : 
                                  job.status === 'Scheduled' ? theme.palette.info.light : 
                                  job.status === 'In Progress' ? theme.palette.warning.light : 
                                  theme.palette.grey[200],
                                color: 
                                  job.status === 'Done' ? theme.palette.success.dark : 
                                  job.status === 'Scheduled' ? theme.palette.info.dark : 
                                  job.status === 'In Progress' ? theme.palette.warning.dark : 
                                  theme.palette.grey[700],
                                fontWeight: 600,
                                fontSize: '10px'
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              ) : (
                <Box sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <Box sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: theme.palette.grey[100],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1
                  }}>
                    <ScheduleIcon sx={{ fontSize: 32, color: theme.palette.grey[400] }} />
                  </Box>
                  <Typography variant="h6" sx={{ 
                    color: theme.palette.text.secondary,
                    fontWeight: 500,
                    mb: 1
                  }}>
                    No upcoming jobs
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: theme.palette.text.secondary,
                    mb: 2,
                    maxWidth: 300
                  }}>
                    All your jobs are completed or you don't have any scheduled jobs yet.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/jobcards/create')}
                    sx={{ 
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Create New Job
                  </Button>
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Right Column - Quick Actions (on top for mobile) */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ order: { xs: 1, md: 2 } }}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: '16px', 
              border: `1px solid ${theme.palette.grey[200]}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'white'
            }}
          >
            <Box sx={{ 
              p: 3, 
              borderBottom: `1px solid ${theme.palette.grey[100]}`,
              display: 'flex',
              alignItems: 'center',
            }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '14px' }}>
                Quick Actions
              </Typography>
            </Box>
            <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/jobcards/create')}
                sx={{ 
                  py: 1.5, 
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  display: { xs: 'flex', sm: 'flex' }
                }}
              >
                Create New Job
              </Button>
              
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<JobCardIcon />}
                onClick={() => navigate('/jobcards')}
                sx={{ 
                  py: 1.2, 
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                View All Jobs
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ScheduleIcon />}
                onClick={() => navigate('/renewals')}
                sx={{ 
                  py: 1.2, 
                  borderRadius: '8px',
                  textTransform: 'none',
                  borderColor: theme.palette.grey[300],
                  color: theme.palette.text.primary
                }}
              >
                Check Renewals
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<InquiryIcon />}
                onClick={() => navigate('/inquiries')}
                sx={{ 
                  py: 1.2, 
                  borderRadius: '8px',
                  textTransform: 'none',
                  borderColor: theme.palette.grey[300],
                  color: theme.palette.text.primary
                }}
              >
                New Inquiries
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;